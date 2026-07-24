from abc import ABC, abstractmethod
import os
from mcp.server.fastmcp import FastMCP
from collections.abc import Callable
from typing import List, Optional
from enum import Enum
from dataclasses import dataclass
from core.utils.logger import Logger


class SourceType(Enum):
    mongo="mongo"
    clickhouse="clickhouse"
    text_files="text_files"
    page_navigator="page_navigator"
@dataclass
class ToolDefinition:
    """Data class for tool definitions"""
    name: str
    handler: Callable
    description: Optional[str] = None
    title: Optional[str] = None
    structured_output: Optional[bool] = None

@dataclass
class ResourceDefinition:
    """Data class for resource definitions"""
    name: str
    uri: str
    handler: Callable
    description: Optional[str] = None

class RAGSource(ABC):

    @abstractmethod
    def __init__(self):
        pass
    
    def get_resources(self, mcp: FastMCP, resources: List[ResourceDefinition]) -> List[Callable]:
        """Register and return resources with MCP"""
        logger = Logger(self.source_type.value).get_logger()
        
        logger.info(f"Registering {len(resources)} {self.source_type.value} resources")
        
        registered = []
        for resource in resources:
            logger.debug(f"Registering resource: {resource.name}")
            #TODO: line 49
            registered_resource = mcp.resource(resource.uri,
            name=resource.name,
            description = resource.description
            )(resource.handler)
            registered.append(registered_resource)
            logger.debug(f"Successfully registered {resource.name}")
        
        logger.info(f"Registered {len(registered)} {self.source_type.value} resources: {[r.name for r in resources]}")
        return registered

    def get_tools(self, mcp: FastMCP, tools: List[ToolDefinition]) -> List[Callable]:
        """Register and return tools with MCP"""
        from core.utils.logger import Logger
        logger = Logger(self.source_type.value).get_logger()
        
        logger.info(f"Registering {len(tools)} {self.source_type.value} tools")
        
        registered = []
        for tool in tools:
            logger.debug(f"Registering tool: {tool.name}")
            
            # Get description from config if not provided in ToolDefinition
            description = tool.description
            if not description:
                config = self.get_config()
                tools_config = config.get("tools", {})
                description = tools_config.get(tool.name, {}).get("description")
            
            registered_tool = mcp.tool(
                name=tool.name,
                title=tool.title,
                description=description
            )(tool.handler)
            registered.append(registered_tool)
            logger.debug(f"Successfully registered {tool.name}")
        
        logger.info(f"Registered {len(registered)} {self.source_type.value} tools: {[t.name for t in tools]}")
        return registered

    @property
    def source_type(self) -> SourceType:
        return self._source_type

    @property
    @abstractmethod
    def tool_set_description(self) -> str:
        """
        Abstract property that subclasses must implement.
        Returns a description of the complete tool set for this source.
        """
        pass        

    def get_config(self) -> dict:
        """Load per-source config from MongoDB copilot_sources collection."""
        mongo_host = os.getenv("MONGO_HOST", "localhost")
        mongo_port = int(os.getenv("MONGO_PORT", 27017))
        mongo_db   = os.getenv("MONGO_DB_NAME", "dev")
        username   = os.getenv("MONGO_USERNAME")
        password   = os.getenv("MONGO_PASSWORD")
        auth_src   = os.getenv("MONGO_AUTH_SOURCE", "admin")

        from pymongo import MongoClient
        if username and password:
            uri = f"mongodb://{username}:{password}@{mongo_host}:{mongo_port}/?authSource={auth_src}"
        else:
            uri = f"mongodb://{mongo_host}:{mongo_port}"

        client = MongoClient(uri)
        logger = Logger(self.source_type.value).get_logger()
        logger.info(f"Fetching {self.source_type.value} config from MongoDB at {mongo_host}:{mongo_port}/{mongo_db}")
        doc = client[mongo_db]["copilot_sources"].find_one(
            {"source_type": self.source_type.value}
        )

        if not doc:
            logger.warning(f"No MongoDB document found for source_type={self.source_type.value}")
            return {}

        # Remap MongoDB field names to the shape each RAGSource.__init__ expects:
        # MongoDB stores tools as "tools"; RAGSource reads "selected_tools".
        # MongoDB stores the schema under resources[0]; RAGSource reads "schema_resource".
        # For page_navigator, site_context lives at the top level in Mongo but
        # PageNavigationRAGSource reads it from parameters.site_context.
        parameters = dict(doc.get("parameters", {}))
        if "site_context" in doc:
            parameters["site_context"] = doc["site_context"]

        resources = doc.get("resources", [])
        schema_resource = resources[0] if resources else {}
        resource_names = [resource.get("name") for resource in resources if isinstance(resource, dict)]
        logger.info(
            f"Loaded {self.source_type.value} config from MongoDB: resources={len(resources)}, names={resource_names}, schema_resource={schema_resource.get('name') if isinstance(schema_resource, dict) else None}"
        )

        return {
            "parameters": parameters,
            "selected_tools": doc.get("tools", []),
            "schema_resource": schema_resource,
            "resources": resources,
        }
    
    def read_updated_config(self) -> bool:
        new_config = self.get_config()
        self.config = new_config
        self.parameters = new_config.get("parameters", {})
        self.selected_tools = new_config.get("selected_tools", [])
        self.schema_resource = new_config.get("schema_resource", {})
        self.resources = new_config.get("resources", [])
        status = self._reinitialize_from_config()
        return status
    
    @abstractmethod
    def _reinitialize_from_config(self) -> bool:
        """
        Subclasses must implement this method to reinitialize their internal state
        based on the updated configuration. Return True if reinitialization was successful,
        False otherwise.
        """
        pass
