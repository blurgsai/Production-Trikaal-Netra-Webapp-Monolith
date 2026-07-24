from tool_server.rag_sources.base_class import RAGSource, SourceType, ResourceDefinition, ToolDefinition
from mcp.server.fastmcp import FastMCP
from collections.abc import Callable
from typing import List, Optional
from core.utils.logger import Logger
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import json_util
from urllib.parse import quote_plus, urlsplit, urlunsplit
import json
import os

logger = Logger("mongo-rag-source").get_logger()


def convert_filter_from_json(filter_str: str):
    """
    Convert filter from MongoDB Extended JSON format to Python objects.
    Handles $oid, $date, and other BSON types.
    Example: {"_id": {"$oid": "690dcb338ba45824dd835344"}} -> {"_id": ObjectId(...)}
    """
    try:
        return json_util.loads(filter_str)
    except Exception as e:
        logger.error(f"Error parsing filter with json_util: {e}")
        # Fallback to standard json.loads if it's not Extended JSON format
        return json.loads(filter_str)


def build_mongo_connection_string(parameters: dict | None = None) -> str:
    """Resolve MongoDB connection string from env first, then YAML config."""
    parameters = parameters or {}

    mongo_uri = os.getenv("MONGO_URI")
    if mongo_uri:
        return mongo_uri

    mongo_username = os.getenv("MONGO_USERNAME")
    mongo_password = os.getenv("MONGO_PASSWORD")
    mongo_host = os.getenv("MONGO_HOST")
    mongo_port = os.getenv("MONGO_PORT", "27017")
    mongo_auth_source = os.getenv("MONGO_AUTH_SOURCE", "admin")

    if mongo_username and mongo_password and mongo_host:
        username = quote_plus(mongo_username)
        password = quote_plus(mongo_password)
        return f"mongodb://{username}:{password}@{mongo_host}:{mongo_port}/?authSource={mongo_auth_source}"

    return parameters.get("connection_string", "mongodb://localhost:27017")


def redact_mongo_connection_string(connection_string: str) -> str:
    """Redact credentials from MongoDB URI before logging."""
    try:
        parts = urlsplit(connection_string)
    except ValueError:
        return "mongodb://<invalid-uri>"

    if "@" not in parts.netloc:
        return connection_string

    _, host_part = parts.netloc.rsplit("@", 1)
    redacted_netloc = f"***:***@{host_part}"
    return urlunsplit((parts.scheme, redacted_netloc, parts.path, parts.query, parts.fragment))


class MongoRAGSource(RAGSource):

    def __init__(self):
        logger.debug("Initializing MongoRAGSource")
        self._source_type = SourceType.mongo
        self.config = self.get_config()
        self.parameters = self.config.get("parameters", {})
        self.connection_string = build_mongo_connection_string(self.parameters)
        self.selected_tools = self.config.get("selected_tools", [])
        self.schema_resource = self.config.get("schema_resource", {})

        # Initialize MongoDB client
        try:
            self.client = MongoClient(self.connection_string)
            # Verify connection
            self.client.admin.command('ping')
            logger.info("MongoDB client initialized and connected successfully")
        except PyMongoError as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self.client = None

        logger.info(f"MongoRAGSource initialized with {len(self.selected_tools)} tools")
        logger.debug(f"MongoDB connection string: {redact_mongo_connection_string(self.connection_string)}")

    def _reinitialize_from_config(self) -> bool:
        """Refresh the MongoDB client after a config reload.

        Called by base_class.read_updated_config() after self.parameters has
        already been updated from the latest MongoDB rag_sources document.

        Returns True if the client is usable after the call (either reused or
        refreshed), False if the reconnect attempt failed.
        """
        new_connection_string = build_mongo_connection_string(self.parameters)

        # No-op if nothing changed and we already have a live client.
        if new_connection_string == getattr(self, "connection_string", None) and self.client:
            logger.info("MongoDB connection string unchanged; keeping existing client.")
            return True

        old_client = getattr(self, "client", None)
        try:
            new_client = MongoClient(new_connection_string)
            new_client.admin.command("ping")

            # Atomic swap — update attributes before closing the old client so
            # that any concurrent tool call still sees a valid self.client.
            self.connection_string = new_connection_string
            self.client = new_client

            if old_client:
                old_client.close()

            logger.info("MongoDB client refreshed successfully.")
            logger.debug(
                f"MongoDB connection string: {redact_mongo_connection_string(self.connection_string)}"
            )
            return True

        except PyMongoError as e:
            logger.error(f"Failed to refresh MongoDB client: {e}")
            # Leave self.client / self.connection_string untouched so the
            # existing client keeps serving requests if it is still alive.
            return False

    @property
    def tool_set_description(self) -> str:
        return """MongoDB RAG Source Tools:

1. mongo_find - Find documents matching a filter in a collection
2. mongo_aggregate - Perform data aggregation with pipeline
3. mongo_count - Count documents matching a filter
4. mongo_explain - Get query execution plan and statistics
5. mongo_list_databases - List all databases on the MongoDB server
6. mongo_list_collections - List all collections in a database
7. mongo_collection_schema - Infer collection schema from sample documents

These tools enable querying, aggregating, and analyzing data stored in MongoDB collections."""

    async def mongodb_resource_schema(self):
        """Resource: MongoDB source with data on articles,events around the world """
        logger.debug("mongodb_schema resource called")
        # pull schema resource from mongo db 
        schema_name = self.schema_resource.get("name", "mongodb_schema")
        schema_content = self.schema_resource.get("content", "No schema available")
        return f"{self.tool_set_description}\n\n{schema_name}:\n{schema_content}"

    async def find_tool(self, database: str, collection: str, filter: str = "{}", projection: str | None = None, limit:int=10):
        """Tool: Find documents matching a filter in a collection"""
        try:
            logger.debug(f"find tool executed on {database}.{collection} with filter: {filter}")
            if not self.client:
                return {"error": "MongoDB client not connected"}

            db = self.client[database]
            coll = db[collection]

            filter_dict = convert_filter_from_json(filter) if isinstance(filter, str) else filter
            projection_dict = json_util.loads(projection) if projection else None

            logger.info(filter_dict)
            logger.info(projection_dict)
            logger.info("Executing find operation")
            documents = list(coll.find(filter_dict, projection_dict).limit(limit))

            # Convert ObjectId to string for JSON serialization
            for doc in documents:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])

            logger.info(f"Found {len(documents)} documents")
            return {"documents": documents, "count": len(documents)}
        except Exception as e:
            logger.error(f"Error in find_tool: {e}")
            return {"error": str(e)}

    async def aggregate_tool(self, database: str, collection: str, pipeline: str):
        """Tool: Perform data aggregation with pipeline"""
        try:
            logger.debug(f"aggregate tool executed on {database}.{collection}")
            if not self.client:
                return {"error": "MongoDB client not connected"}

            db = self.client[database]
            coll = db[collection]

            pipeline_list = convert_filter_from_json(pipeline) if isinstance(pipeline, str) else pipeline
            results = list(coll.aggregate(pipeline_list))

            # Convert ObjectId to string for JSON serialization
            for doc in results:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])

            logger.info(f"Aggregation returned {len(results)} documents")
            return {"results": results, "count": len(results)}
        except Exception as e:
            logger.error(f"Error in aggregate_tool: {e}")
            return {"error": str(e)}

    async def count_tool(self, database: str, collection: str, filter: str = "{}"):
        """Tool: Count documents matching a filter"""
        try:
            logger.debug(f"count tool executed on {database}.{collection}")
            if not self.client:
                return {"error": "MongoDB client not connected"}

            db = self.client[database]
            coll = db[collection]

            filter_dict = convert_filter_from_json(filter) if isinstance(filter, str) else filter
            count = coll.count_documents(filter_dict)

            logger.info(f"Document count: {count}")
            return {"count": count}
        except Exception as e:
            logger.error(f"Error in count_tool: {e}")
            return {"error": str(e)}

    async def explain_tool(self, database: str, collection: str, filter: str = "{}"):
        """Tool: Get query execution plan and statistics"""
        try:
            logger.debug(f"explain tool executed on {database}.{collection}")
            if not self.client:
                return {"error": "MongoDB client not connected"}

            db = self.client[database]
            coll = db[collection]

            filter_dict = convert_filter_from_json(filter) if isinstance(filter, str) else filter
            explanation = coll.find(filter_dict).explain()

            logger.info("Query explanation retrieved")
            return {"explanation": str(explanation)}
        except Exception as e:
            logger.error(f"Error in explain_tool: {e}")
            return {"error": str(e)}

    async def list_databases_tool(self):
        """Tool: List all databases on the server"""
        try:
            logger.debug("list_databases tool executed")
            if not self.client:
                return {"error": "MongoDB client not connected"}

            databases = self.client.list_database_names()

            logger.info(f"Found {len(databases)} databases")
            return {"databases": databases, "count": len(databases)}
        except Exception as e:
            logger.error(f"Error in list_databases_tool: {e}")
            return {"error": str(e)}

    async def list_collections_tool(self, database: str):
        """Tool: List all collections in a database"""
        try:
            logger.debug(f"list_collections tool executed for database: {database}")
            if not self.client:
                return {"error": "MongoDB client not connected"}

            db = self.client[database]
            collections = db.list_collection_names()

            logger.info(f"Found {len(collections)} collections in {database}")
            return {"collections": collections, "count": len(collections)}
        except Exception as e:
            logger.error(f"Error in list_collections_tool: {e}")
            return {"error": str(e)}

    async def collection_schema_tool(self, database: str, collection: str, sample_size: int = 10):
        """Tool: Infer collection schema from sample documents"""
        try:
            logger.debug(f"collection_schema tool executed for {database}.{collection}")
            if not self.client:
                return {"error": "MongoDB client not connected"}

            db = self.client[database]
            coll = db[collection]

            # Get sample documents
            samples = list(coll.find({}).limit(sample_size))

            # Infer schema from samples
            schema = {}
            if samples:
                # Analyze all fields and their types from samples
                for doc in samples:
                    for key, value in doc.items():
                        if key not in schema:
                            schema[key] = type(value).__name__

            # Convert ObjectId to string for JSON serialization
            if "_id" in schema:
                schema["_id"] = "ObjectId"

            logger.info(f"Schema inferred from {len(samples)} documents")
            return {"schema": schema, "sample_count": len(samples)}
        except Exception as e:
            logger.error(f"Error in collection_schema_tool: {e}")
            return {"error": str(e)}

    def get_resources(self, mcp: FastMCP) -> List[Callable]:
        """Register and return MongoDB resources"""
        #call update config here
        resource_definitions = [
            ResourceDefinition(
                name="mongo_schema",
                uri="mongo://resource/schema",
                handler=self.mongodb_resource_schema
            )
        ]
        return super().get_resources(mcp, resource_definitions)

    def get_tools(self, mcp: FastMCP) -> List[Callable]:
        """Register and return MongoDB tools"""
        tool_definitions = [
            ToolDefinition(
                name="mongo_find",
                handler=self.find_tool,
                title="Find Documents",
                description="Find documents matching a filter in a collection"
            ),
            ToolDefinition(
                name="mongo_aggregate",
                handler=self.aggregate_tool,
                title="Aggregate Data",
                description="Perform data aggregation with pipeline"
            ),
            ToolDefinition(
                name="mongo_count",
                handler=self.count_tool,
                title="Count Documents",
                description="Count documents matching a filter"
            ),
            ToolDefinition(
                name="mongo_explain",
                handler=self.explain_tool,
                title="Explain Query",
                description="Get query execution plan and statistics"
            ),
            ToolDefinition(
                name="mongo_list_databases",
                handler=self.list_databases_tool,
                title="List Databases",
                description="List all databases on the MongoDB server"
            ),
            ToolDefinition(
                name="mongo_list_collections",
                handler=self.list_collections_tool,
                title="List Collections",
                description="List all collections in a database"
            ),
            ToolDefinition(
                name="mongo_collection_schema",
                handler=self.collection_schema_tool,
                title="Collection Schema",
                description="Infer collection schema from sample documents"
            )
        ]
        return super().get_tools(mcp, tool_definitions)
