from tool_server.rag_sources.base_class import RAGSource, SourceType, ResourceDefinition, ToolDefinition
from mcp.server.fastmcp import FastMCP
from collections.abc import Callable
from typing import List
from core.utils.logger import Logger
import clickhouse_connect
from clickhouse_connect.driver.exceptions import Error as ClickHouseError

logger = Logger("clickhouse-rag-source").get_logger()


class ClickhouseRAGSource(RAGSource):

    def __init__(self):
        logger.debug("Initializing ClickhouseRAGSource")
        self._source_type = SourceType.clickhouse
        self.config = self.get_config()
        self.parameters = self.config.get("parameters", {})
        self.selected_tools = self.config.get("selected_tools", [])
        self.schema_resource = self.config.get("schema_resource", {})

        # Extract connection parameters
        host = self.parameters.get("host", "localhost")
        port = self.parameters.get("port", 8123)
        database = self.parameters.get("database", "default")
        user = self.parameters.get("user", "default")
        password = self.parameters.get("password", "")

        # Initialize ClickHouse client
        try:
            self.client = clickhouse_connect.get_client(
                host=host,
                port=port,
                database=database,
                username=user,
                password=password
            )
            # Verify connection
            self.client.command("SELECT 1")
            logger.info("ClickHouse client initialized and connected successfully")
        except ClickHouseError as e:
            logger.error(f"Failed to connect to ClickHouse: {e}----\n")
            self.client = None

        logger.info(f"ClickhouseRAGSource initialized with {len(self.selected_tools)} tools")
        logger.debug(f"ClickHouse client parameters: host={host}, port={port}, database={database}")

    def _clickhouse_connection_params(self) -> dict:
        """Return the five ClickHouse connection fields as a canonical dict.

        Used by both _reinitialize_from_config (for change-detection and client
        construction) and _reconnect_client (runtime reconnect on None client).
        """
        return {
            "host":     self.parameters.get("host", "localhost"),
            "port":     self.parameters.get("port", 8123),
            "database": self.parameters.get("database", "default"),
            "username": self.parameters.get("user", "default"),
            "password": self.parameters.get("password", ""),
        }

    def _reconnect_client(self) -> bool:
        """Attempt to reconnect to ClickHouse if client is not connected"""
        try:
            logger.debug("Attempting to reconnect to ClickHouse")
            self.client = clickhouse_connect.get_client(**self._clickhouse_connection_params())
            # Verify connection
            self.client.command("SELECT 1")
            logger.info("ClickHouse client reconnected successfully")
            return True
        except ClickHouseError as e:
            logger.error(f"Failed to reconnect to ClickHouse: {e}")
            self.client = None
            return False

    def _reinitialize_from_config(self) -> bool:
        """Refresh the ClickHouse client after a config reload.

        Called by base_class.read_updated_config() after self.parameters has
        already been updated from the latest MongoDB rag_sources document.

        Returns True if the client is usable after the call (either reused or
        refreshed), False if the reconnect attempt failed.
        """
        new_params = self._clickhouse_connection_params()

        # No-op if nothing changed and we already have a live client.
        if new_params == getattr(self, "_connection_params", None) and self.client:
            logger.info("ClickHouse parameters unchanged; keeping existing client.")
            return True

        try:
            new_client = clickhouse_connect.get_client(**new_params)
            new_client.command("SELECT 1")

            old_client = getattr(self, "client", None)

            # Atomic swap.
            self.client = new_client
            self._connection_params = new_params

            if old_client and hasattr(old_client, "close"):
                old_client.close()

            logger.info("ClickHouse client refreshed successfully.")
            return True

        except ClickHouseError as e:
            logger.error(f"Failed to refresh ClickHouse client: {e}")
            self.client = None
            return False


    @property
    def tool_set_description(self) -> str:
        return """ClickHouse RAG Source Tools:

1. clickhouse_select_query - Execute a SELECT query on ClickHouse
2. clickhouse_list_databases - List all databases on the ClickHouse server
3. clickhouse_list_tables - List all tables in a specific database
4. clickhouse_describe_table_schema - Describe the schema (columns and types) of a table

These tools enable querying, exploring database structures, and analyzing data stored in ClickHouse."""

    async def clickhouse_schema(self):
        """Resource: ClickHouse tables and schema"""
        logger.debug("clickhouse_schema resource called")
        schema_name = self.schema_resource.get("name", "clickhouse_schema")
        schema_content = self.schema_resource.get("content", "No schema available")
        return f"{self.tool_set_description}\n\n{schema_name}:\n{schema_content}"

    async def run_select_query_tool(self,query: str = None):
        """Tool: Execute a SELECT query on ClickHouse"""
        try:
            logger.debug(f"run_select_query tool executed with query: {query}")
            if not self.client:
                logger.debug("ClickHouse client not connected, attempting to reconnect")
                if not self._reconnect_client():
                    output = {"error": "ClickHouse client not connected and reconnection failed"}
                    logger.debug("Failed to reconnect ClickHouse client", extra={"output": output})
                    return output

            if not query:
                logger.debug("No query provided to run_select_query tool")
                return {"error": "Query parameter is required"}

            # Use the client to execute query with result set
            result = self.client.query(query)
            results = result.result_rows if hasattr(result, 'result_rows') else result.data
            column_names = result.column_names if hasattr(result, 'column_names') else []

            logger.info(f"Query executed successfully, returned {len(results)} rows")
            return {"results": results, "columns": column_names, "row_count": len(results)}
        except Exception as e:
            logger.error(f"Error in run_select_query_tool: {e}")
            return {"error": str(e)}

    async def list_databases_tool(self):
        """Tool: List all databases on the ClickHouse server"""
        try:
            logger.debug("list_databases tool executed")
            if not self.client:
                logger.debug("ClickHouse client not connected, attempting to reconnect")
                if not self._reconnect_client():
                    return {"error": "ClickHouse client not connected and reconnection failed"}

            # Execute query to get databases
            result = self.client.query("SHOW DATABASES")
            databases = [row[0] for row in result.result_rows]

            logger.info(f"Found {len(databases)} databases")
            return {"databases": databases, "count": len(databases)}
        except Exception as e:
            logger.error(f"Error in list_databases_tool: {e}")
            return {"error": str(e)}

    async def list_tables_tool(self, database: str):
        """Tool: List all tables in a specific database"""
        try:
            logger.debug(f"list_tables tool executed for database: {database}")
            if not self.client:
                logger.debug("ClickHouse client not connected, attempting to reconnect")
                if not self._reconnect_client():
                    return {"error": "ClickHouse client not connected and reconnection failed"}

            # Execute query to get tables from specified database
            query = f"SHOW TABLES FROM {database}"
            result = self.client.query(query)
            tables = [row[0] for row in result.result_rows]

            logger.info(f"Found {len(tables)} tables in database {database}")
            return {"tables": tables, "count": len(tables), "database": database}
        except Exception as e:
            logger.error(f"Error in list_tables_tool: {e}")
            return {"error": str(e)}

    async def describe_table_schema_tool(self, database: str, table: str):
        """Tool: Describe the schema (columns and types) of a table"""
        try:
            logger.debug(f"describe_table_schema tool executed for {database}.{table}")
            if not self.client:
                logger.debug("ClickHouse client not connected, attempting to reconnect")
                if not self._reconnect_client():
                    return {"error": "ClickHouse client not connected and reconnection failed"}

            # Execute DESCRIBE TABLE query to get schema
            query = f"DESCRIBE TABLE {database}.{table}"
            result = self.client.query(query)

            # Parse the results into a structured format
            schema = {}
            for row in result.result_rows:
                column_name = row[0]
                column_type = row[1]
                schema[column_name] = column_type

            logger.info(f"Schema retrieved for {database}.{table} with {len(schema)} columns")
            return {"schema": schema, "column_count": len(schema), "table": table, "database": database}
        except Exception as e:
            logger.error(f"Error in describe_table_schema_tool: {e}")
            return {"error": str(e)}

    def get_resources(self, mcp: FastMCP) -> List[Callable]:
        """Register and return ClickHouse resources"""
        resource_definitions = [
            ResourceDefinition(
                name="clickhouse_schema",
                uri="clickhouse://resource/schema",
                handler=self.clickhouse_schema
            )
        ]
        return super().get_resources(mcp, resource_definitions)

    def get_tools(self, mcp: FastMCP) -> List[Callable]:
        """Register and return ClickHouse tools"""
        tool_definitions = [
            ToolDefinition(
                name="clickhouse_select_query",
                handler=self.run_select_query_tool,
                title="Run SELECT Query",
                description="Execute a SELECT query on ClickHouse"
            ),
            ToolDefinition(
                name="clickhouse_list_databases",
                handler=self.list_databases_tool,
                title="List Databases",
                description="List all databases on the ClickHouse server"
            ),
            ToolDefinition(
                name="clickhouse_list_tables",
                handler=self.list_tables_tool,
                title="List Tables",
                description="List all tables in a specific database"
            ),
            ToolDefinition(
                name="clickhouse_describe_table_schema",
                handler=self.describe_table_schema_tool,
                title="Describe Table Schema",
                description="Describe the schema (columns and types) of a table"
            )
        ]
        return super().get_tools(mcp, tool_definitions)
