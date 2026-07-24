import time
import os
import httpx
from pymongo import MongoClient
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from fastapi.responses import JSONResponse
import json


from tool_server.rag_sources.mongo import MongoRAGSource
from tool_server.rag_sources.clickhouse import ClickhouseRAGSource
from tool_server.rag_sources.text_source import TextSource
from tool_server.rag_sources.page_navigator import PageNavigationRAGSource
from tool_server.rag_sources.base_class import SourceType

from blurgs_observability import get_logger
from blurgs_observability.decorators.tracing_function import traced


# Initialize logger
logger = get_logger()

# Load environment variables from .env file
load_dotenv()
logger.info("Environment variables loaded from .env file")


def load_rag_sources_from_mongo() -> list:
    """Load enabled RAG source classes from the MongoDB copilot_sources collection."""
    mongo_host = os.getenv("MONGO_HOST", "localhost")
    mongo_port = int(os.getenv("MONGO_PORT", 27017))
    mongo_db   = os.getenv("MONGO_DB_NAME", "dev")
    username   = os.getenv("MONGO_USERNAME")
    password   = os.getenv("MONGO_PASSWORD")
    auth_src   = os.getenv("MONGO_AUTH_SOURCE", "admin")
    if username and password:
        uri = f"mongodb://{username}:{password}@{mongo_host}:{mongo_port}/?authSource={auth_src}"
    else:
        uri = f"mongodb://{mongo_host}:{mongo_port}"

    client = MongoClient(uri)
    enabled_docs = list(client[mongo_db]["copilot_sources"].find({"enabled": True}))
    enabled_source_types = [doc["source_type"] for doc in enabled_docs]
    logger.info(f"Found {len(enabled_source_types)} enabled RAG sources in MongoDB: {enabled_source_types}")

    source_mapping = {
        "mongo":          MongoRAGSource,
        "clickhouse":     ClickhouseRAGSource,
        "text_files":     TextSource,
        "page_navigator": PageNavigationRAGSource,
    }

    rag_sources = []
    for source_type in enabled_source_types:
        if source_type in source_mapping:
            try:
                source = source_mapping[source_type]()
                rag_sources.append(source)
                logger.debug(f"Successfully loaded {source_type} RAG source")
            except Exception as e:
                logger.error(f"Failed to load {source_type} RAG source: {e}", exc_info=True)
        else:
            logger.warning(f"Unknown RAG source type in MongoDB: {source_type}")

    logger.info(f"Loaded {len(rag_sources)} RAG sources successfully")
    return rag_sources



def main():
    
    # Initialize MCP server
    logger.info("Starting Omnisense-rag MCP server")
    mcp = FastMCP("omnisense-rag", host="0.0.0.0", port=int(os.getenv("MCP_SERVER_PORT", 5000)))

    # Health check endpoint
    @mcp.custom_route("/health", methods=["GET"])
    async def health_check(request):
        """Health check endpoint for Docker healthchecks"""
        return JSONResponse(content={"status": "healthy", "service": "omnisense-rag"})

    # Notify endpoint: triggered by the Upload API after a successful global document upload.
    # Forwards a stale-cache signal to the API service so the LLM client re-fetches resources
    # on the next user prompt. No MCP SDK private internals are used.
    # Future: when FastMCP exposes a broadcast API, also call session.send_resource_list_changed() here.
    api_server_base = os.getenv("API_SERVER_BASE_URL", "http://localhost:8000")


    @mcp.custom_route("/webhooks/documents-updated", methods=["POST"])
    async def update_text_source_document_resources(request):
        """Update the text_files source resources in MongoDB for a newly uploaded document."""
        try:
            payload = await request.json()
        except Exception as exc:
            payload = {}
            logger.warning(f"Webhook payload could not be parsed as JSON: {exc}")

        file_name = (payload.get("name") or payload.get("file_name") or payload.get("fileName") or "").strip()
        description = (payload.get("description") or "").strip()
        logger.info(f"Received document upload webhook payload: name={file_name!r}, description={description!r}")

        if not file_name or not description:
            return JSONResponse(status_code=400, content={"status": "error", "detail": "name/file_name and description are required"})

        mongo_host = os.getenv("MONGO_HOST", "localhost")
        mongo_port = int(os.getenv("MONGO_PORT", 27017))
        mongo_db = os.getenv("MONGO_DB_NAME", "dev")
        username = os.getenv("MONGO_USERNAME")
        password = os.getenv("MONGO_PASSWORD")
        auth_src = os.getenv("MONGO_AUTH_SOURCE", "admin")

        if username and password:
            uri = f"mongodb://{username}:{password}@{mongo_host}:{mongo_port}/?authSource={auth_src}"
        else:
            uri = f"mongodb://{mongo_host}:{mongo_port}"

        client = MongoClient(uri)
        collection = client[mongo_db]["copilot_sources"]
        logger.info(f"Looking up text_files source in MongoDB at {mongo_host}:{mongo_port}/{mongo_db}")
        source_doc = collection.find_one({"source_type": "text_files"})

        if not source_doc:
            logger.warning("text_files source document was not found in MongoDB")
            return JSONResponse(status_code=404, content={"status": "error", "detail": "text_files source not found"})

        existing_resource_names = [resource.get("name") for resource in source_doc.get("resources", []) if isinstance(resource, dict)]
        logger.info(f"Found text_files source doc in MongoDB with {len(existing_resource_names)} existing resources: {existing_resource_names}")

        existing_resources = list(source_doc.get("resources", []))
        existing_resources.append({
            "type": "document",
            "name": file_name,
            "description": description,
        })

        collection.update_one(
            {"source_type": "text_files"},
            {"$set": {"resources": existing_resources}},
            upsert=True,
        )
        logger.info(f"Persisted new resource to MongoDB for text_files. Total resources now: {len(existing_resources)}")

        # Refresh all in-memory text_files sources after the database update so handlers see new resources.
        reloaded = 0
        logger.info(f"Refreshing {len(rag_sources)} in-memory sources after MongoDB resource update")
        for source in rag_sources:
            if source.source_type == SourceType.text_files:
                try:
                    logger.info(f"Reloading text_files source instance: {source.__class__.__name__}")
                    source.read_updated_config()
                    reloaded += 1
                    logger.info(f"Reloaded text_files source instance successfully. Current resources count: {len(source.resources)}")
                except Exception as e:
                    logger.warning(f"Failed to reload text_files source config after upload: {e}")

        if reloaded:
            logger.info(f"Reloaded {reloaded} text_files source config(s) after document upload")
        else:
            logger.warning("No in-memory text_files sources found to reload after document upload")

        return JSONResponse(content={"status": "updated", "name": file_name, "description": description})

    # Load and register RAG sources from MongoDB
    logger.info("Loading RAG sources from MongoDB...")

    rag_sources = load_rag_sources_from_mongo()
    
    logger.info(f"Registering resources and tools from {len(rag_sources)} RAG sources")
    for source in rag_sources:
        try:
            logger.info(f"Loading {source.source_type.value} RAG source...")
            resources = source.get_resources(mcp)
            tools = source.get_tools(mcp)
            logger.debug(f"Registered {len(resources)} resources and {len(tools)} tools from {source.source_type.value}")
        except Exception as e:
            logger.error(f"Failed to register {source.source_type.value} RAG source: {e}", exc_info=True)
    
    # Run the MCP server
    logger.info("Starting MCP server on streamable-http transport")
    try:
        mcp.run(transport="streamable-http")
    except Exception as e:
        logger.critical(f"MCP server failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    # Runs a single MCP server with all the tools loaded across different resources. 
    main()
