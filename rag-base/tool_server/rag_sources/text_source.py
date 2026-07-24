from tool_server.rag_sources.base_class import RAGSource, SourceType, ResourceDefinition, ToolDefinition
from mcp.server.fastmcp import FastMCP
from typing import List
from core.utils.logger import Logger
from config_generation_app.text_processor import TextProcessor
import os

logger = Logger("text-rag-source").get_logger()


class TextSource(RAGSource):
    """RAG source for searching documents stored in Chroma vector database"""

    def __init__(self):
        logger.debug("Initializing TextSource")
        self._source_type = SourceType.text_files
        self.config = self.get_config()
        self.parameters = self.config.get("parameters", {})
        self.selected_tools = self.config.get("selected_tools", [])
        self.schema_resource = self.config.get("schema_resource", {})
        self.resources = self.config.get("resources", [])

        # Initialize TextProcessor with configured parameters
        self.collection_name = self.parameters.get("collection_name", "documents")
        chunk_size = self.parameters.get("chunk_size", 1000)
        chunk_overlap = self.parameters.get("chunk_overlap", 200)
        
        try:
            self.processor = TextProcessor(
                collection_name=self.collection_name,
                chunk_size=int(chunk_size),
                chunk_overlap=int(chunk_overlap),
                chroma_host=os.getenv("CHROMA_HOST", "localhost"),
                chroma_port=int(os.getenv("CHROMA_PORT", 8000))
            )
            logger.info(f"TextProcessor initialized with collection '{self.collection_name}'")
        except Exception as e:
            logger.error(f"Failed to initialize TextProcessor: {e}")
            self.processor = None

        logger.info(f"TextSource initialized with {len(self.selected_tools)} tools")

    def _reinitialize_from_config(self) -> bool:
        # Reinitialize the TextProcessor with the updated configuration
        self.collection_name = self.parameters.get("collection_name", "documents")
        chunk_size = self.parameters.get("chunk_size", 1000)
        chunk_overlap = self.parameters.get("chunk_overlap", 200)

        try:
            self.processor = TextProcessor(
                collection_name=self.collection_name,
                chunk_size=int(chunk_size),
                chunk_overlap=int(chunk_overlap),
                chroma_host=os.getenv("CHROMA_HOST", "localhost"),
                chroma_port=int(os.getenv("CHROMA_PORT", 8000))
            )
            logger.info(f"TextProcessor reinitialized with collection '{self.collection_name}'")
            return True
        except Exception as e:
            logger.error(f"Failed to reinitialize TextProcessor: {e}")
            self.processor = None
            return False

    @property
    def tool_set_description(self) -> str:
        return """Text Files RAG Source Tools:

1. search_documents - Search for similar documents using semantic similarity
2. get_collection_stats - Get statistics about the stored documents collection

These tools enable semantic search and retrieval of documents stored in a Chroma vector database.
"""


    async def text_files_resource_schema(self):
        logger.debug("text_files_schema resource called")
        self.read_updated_config()
        if self.resources:
            lines = []
            for resource in self.resources:
                name = resource.get("name") or resource.get("file_name") or "text_files_schema"
                content = resource.get("content") or resource.get("description", "No schema available")
                lines.append(f"{name}:\n{content}")
            return f"{self.tool_set_description}\n\n" + "\n\n".join(lines)

        schema_name = self.schema_resource.get("name", "text_files_schema")
        schema_content = self.schema_resource.get("content", "No schema available")
        return f"{self.tool_set_description}\n\n{schema_name}:\n{schema_content}" 

    async def search_documents(self, query: str, top_k: int = 5) -> dict:
        """Tool: Search for similar documents using semantic similarity"""
        try:
            logger.debug(f"search_documents tool executed with query: '{query}' (top_k={top_k})")
            
            if not self.processor:
                return {"error": "TextProcessor not initialized"}

            results = self.processor.search(query, top_k=top_k)

            if not results:
                logger.info(f"No results found for query: {query}")
                return {
                    "query": query,
                    "results_count": 0,
                    "results": []
                }

            # Format results for better readability
            formatted_results = []
            for i, result in enumerate(results, 1):
                formatted_results.append({
                    "rank": i,
                    "score": round(result.get("score", 0), 4),
                    "source": result.get("metadata", {}).get("source", "unknown"),
                    "filename": result.get("metadata", {}).get("filename", "unknown"),
                    "chunk_index": result.get("metadata", {}).get("chunk_index", "unknown"),
                    "content": result.get("content", "")[:500]  # Truncate for readability
                })

            logger.info(f"Found {len(formatted_results)} results for query: {query}")
            return {
                "query": query,
                "results_count": len(formatted_results),
                "results": formatted_results
            }
        except Exception as e:
            logger.error(f"Error searching documents: {e}", exc_info=True)
            return {"error": str(e)}

    async def get_collection_stats(self) -> dict:
        """Tool: Get statistics about the Chroma collection"""
        try:
            logger.debug("get_collection_stats tool executed")
            
            if not self.processor:
                return {"error": "TextProcessor not initialized"}

            stats = self.processor.get_collection_stats()
            logger.info(f"Collection stats retrieved: {stats}")
            return stats
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}", exc_info=True)
            return {"error": str(e)}

    def get_resources(self, mcp: FastMCP) -> List:
        """Get and register resources for text source"""
        resources = [
            ResourceDefinition(
                name="text_files_schema",
                uri="text://schema",
                handler=self.text_files_resource_schema
            )
        ]
        return super().get_resources(mcp, resources)

    def get_tools(self, mcp: FastMCP) -> List:
        """Get and register tools for text source"""
        tools = [
            ToolDefinition(
                name="search_documents",
                handler=self.search_documents,
                description="Search for similar documents using semantic similarity"
            ),
            ToolDefinition(
                name="get_collection_stats",
                handler=self.get_collection_stats,
                description="Get statistics about the stored documents collection"
            )
        ]
        return super().get_tools(mcp, tools)
