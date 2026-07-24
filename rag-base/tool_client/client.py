"""MCP Streamable HTTP Client for testing MCP server integration"""

import json
import yaml
from pathlib import Path
from typing import Optional, Any, Dict
from blurgs_observability import get_logger
from blurgs_observability.decorators.tracing_function import traced

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


class MCPClient:
    """MCP Client for calling MCP tools directly"""

    def __init__(self):
        """Initialize the MCP client
        
        Args:
        """
        self.logger = get_logger()
        self.logger.debug("Initializing MCPClient")
        self.session: Optional[ClientSession] = None
        self.tools_cache: Dict[str, Any] = {}

    @traced
    async def connect_to_streamable_http_server(self, server_url: str):
        """Connect to an MCP server running with HTTP Streamable transport"""
        self.logger.debug(f"Connecting to MCP server at {server_url}")
        try:
            self._streams_context = streamable_http_client(
                url=server_url,
            )
            read_stream, write_stream, _ = await self._streams_context.__aenter__()
            self.logger.debug("Streamable HTTP connection established")

            self._session_context = ClientSession(read_stream, write_stream)
            self.session: ClientSession = await self._session_context.__aenter__()

            await self.session.initialize()
            self.logger.info(f"MCP session initialized at {server_url}")
        except Exception as e:
            self.logger.error(f"Failed to connect to MCP server: {e}", exc_info=True)
            raise

    @traced
    async def list_tools(self):
        """List all available tools from the MCP server"""
        self.logger.debug("Listing tools from MCP server")
        try:
            response = await self.session.list_tools()
            self.tools_cache = {tool.name: tool for tool in response.tools}
            self.logger.debug(f"Listed {len(self.tools_cache)} tools")
            return self.tools_cache
        except Exception as e:
            self.logger.error(f"Error listing tools: {e}", exc_info=True)

    @traced
    async def list_resources(self):
        """List all available resources from the MCP server"""
        self.logger.debug("Listing resources from MCP server")
        try:
            response = await self.session.list_resources()
            resources = response.resources if response and hasattr(response, 'resources') else []
            self.logger.debug(f"Listed {len(resources)} resources from MCP server")

            result_resources = []
            for res in resources:
                res_dict = res.model_dump(mode="json")
                uri = res_dict.get('uri')

                if uri:
                    self.logger.debug(f"Reading resource: {uri}")
                    try:
                        read_resource = await self.session.read_resource(uri)
                        read_dict = read_resource.model_dump(mode='json')

                        combined_dict = {**res_dict, **read_dict}

                        result_resources.append(combined_dict)

                    except Exception as e:
                        self.logger.warning(f"Failed to read resource {uri}: {e}")
                        result_resources.append(res_dict)
                else:
                    result_resources.append(res_dict)

            return result_resources
        except Exception as e:
            self.logger.error(f"Could not list resources: {e}")
            return []

    def format_resources_for_context(self, resources: list = None) -> dict:

        if not resources:
            return {}

        context = {}

        for i, resource in enumerate(resources, 1):

            resource_name = resource.get("name", "")           # already extracted ✅
            resource_description = resource.get("description", "")  # already extracted ✅

            resource_contents = resource["contents"]
            resource_contents_nested = resource_contents[0]

            if isinstance(resource_contents_nested, dict):
                text = resource_contents_nested.get('text', '')  # already extracted ✅

                # Build the dict entry keyed by the resource name
                context[resource_name] = {
                    "name":        resource_name,
                    "description": resource_description,
                    "content":     text
                }

        return context


    def _get_resource_property(self, resource: Any, property_name: str, default: Any = None) -> Any:
        """Safely extract a property from a resource (handles objects and dicts)"""
        # Try object attribute first
        if hasattr(resource, property_name):
            return getattr(resource, property_name)
        # Fall back to dict access
        if isinstance(resource, dict):
            return resource.get(property_name, default)
        return default

    def get_tools_schema(self) -> list:
        """Convert MCP tools to OpenAI-compatible tool schema format"""
        if not self.tools_cache:
            self.logger.warning("No tools cached. Returning empty schema.")
            return []

        schema = []
        for tool_name, tool in self.tools_cache.items():
            tool_schema = {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description or f"Call {tool.name}",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }

            # Parse input schema if available
            if tool.inputSchema:
                input_schema = tool.inputSchema
                if isinstance(input_schema, dict):
                    if "properties" in input_schema:
                        tool_schema["function"]["parameters"]["properties"] = input_schema.get("properties", {})
                    if "required" in input_schema:
                        tool_schema["function"]["parameters"]["required"] = input_schema.get("required", [])

            schema.append(tool_schema)

        return schema

    @traced
    async def call_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Dict[str, Any]:
        """Call a specific tool with the given arguments"""
        if not self.session:
            self.logger.error("Not connected to MCP server")
            raise RuntimeError("Not connected to MCP server. Call connect first.")

        self.logger.debug(f"Calling tool: {tool_name} with args: {tool_args}")
        try:
            if tool_name not in self.tools_cache:
                self.logger.error(f"Tool '{tool_name}' not found. Available: {list(self.tools_cache.keys())}")
                raise ValueError(f"Tool '{tool_name}' not found. Available tools: {list(self.tools_cache.keys())}")

            result = await self.session.call_tool(tool_name, tool_args)
            self.logger.debug(f"Tool {tool_name} executed successfully")

            # Return the model_dump directly
            if hasattr(result, "model_dump"):
                return result.model_dump()
            else:
                return result

        except Exception as e:
            # Client-side error: match the schema with isError=True and client origin metadata
            self.logger.error(f"Error calling tool '{tool_name}': {str(e)}", exc_info=True)
            error_msg = f"Error calling tool '{tool_name}': {str(e)}"
            return {
                "meta": {"origin": "mcp_client", "error_type": type(e).__name__},
                "content": [
                    {
                        "type": "text",
                        "text": error_msg,
                        "annotations": None,
                        "meta": None
                    }
                ],
                "structuredContent": None,
                "isError": True
            }

    async def cleanup(self):
        """Properly clean up the session and streams"""
        self.logger.debug("Cleaning up MCP client resources")
        try:
            if hasattr(self, "_session_context") and self._session_context:
                await self._session_context.__aexit__(None, None, None)
                self.logger.debug("Session context cleaned up")
        except Exception as e:
            self.logger.warning(f"Failed to clean up session context: {e}")

        try:
            if hasattr(self, "_streams_context") and self._streams_context:
                await self._streams_context.__aexit__(None, None, None)
                self.logger.debug("Streams context cleaned up")
        except Exception as e:
            self.logger.warning(f"Failed to clean up streams context: {e}")
        
        self.logger.info("MCP client cleanup complete")   