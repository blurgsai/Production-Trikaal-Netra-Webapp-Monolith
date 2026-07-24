import os
import yaml
import pytest
from pathlib import Path
from dotenv import load_dotenv

from tool_client.client import MCPClient

load_dotenv()

@pytest.mark.asyncio
async def test_text_files_schema_resource(mcp_server):
    """
    Test that the MCP server correctly serves the text_files_schema resource
    as defined in the current configuration file.
    """
    # 1. Determine the active config file
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    config_path = Path(config_yaml_path)
    
    assert config_path.exists(), f"Config file not found at {config_path}"
    
    # 2. Extract the expected text_files_schema content from YAML
    with open(config_path, "r") as f:
        config_data = yaml.safe_load(f)
        
    assert "text_files" in config_data, "text_files configuration missing in YAML"
    assert "schema_resource" in config_data["text_files"], "schema_resource missing in text_files config"
    
    expected_content = config_data["text_files"]["schema_resource"]["content"]
    
    # 3. Initialize observability (required by MCPClient)
    from blurgs_observability import init_observability, shutdown_observability
    try:
        init_observability(
            None,
            'test-mcp-client',
            json_file_log_level="INFO",
            console_log_level="ERROR",
            otel_log_level=None,
        )
    except RuntimeError:
        # Already initialized
        pass
        
    client = MCPClient()
    # Use the dedicated test MCP server URL (port 5001), not the app-level MCP_SERVER_URL from .env
    server_url = os.getenv("TEST_MCP_SERVER_URL", "http://localhost:5001/mcp")
    
    try:
        await client.connect_to_streamable_http_server(server_url)
        
        # 4. Fetch resources and format them for context
        resources = await client.list_resources()
        context = client.format_resources_for_context(resources)
        
        # 5. Verify the resource exists
        assert "text_files_schema" in context, "text_files_schema resource not found in MCP server"
        
        # 6. Verify the content contains the expected schema
        actual_content = context["text_files_schema"]["content"]
        
        # Check if the expected content is present within the actual content
        assert expected_content.strip() in actual_content.strip(), \
            f"Expected schema content not found in MCP resource.\nExpected snippet:\n{expected_content.strip()[:100]}...\nActual:\n{actual_content.strip()[:100]}..."
        
    finally:
        await client.cleanup()
        try:
            shutdown_observability()
        except Exception:
            pass
