import os
import yaml
import pytest
from pathlib import Path
from dotenv import load_dotenv

from tool_client.client import MCPClient

load_dotenv()

@pytest.mark.asyncio
async def test_page_navigator_schema_resource(mcp_server):
    """
    Test that the MCP server correctly serves the page_navigator_schema resource
    as defined in the current configuration file.
    """
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    config_path = Path(config_yaml_path)
    
    assert config_path.exists(), f"Config file not found at {config_path}"
    
    with open(config_path, "r") as f:
        config_data = yaml.safe_load(f)
        
    assert "page_navigator" in config_data, "page_navigator configuration missing in YAML"
    assert "schema_resource" in config_data["page_navigator"], "schema_resource missing in page_navigator config"
    
    expected_content = config_data["page_navigator"]["schema_resource"]["content"]
    
    from blurgs_observability import init_observability
    try:
        init_observability(
            None,
            'test-mcp-client',
            json_file_log_level="INFO",
            console_log_level="ERROR",
            otel_log_level=None,
        )
    except RuntimeError:
        pass
        
    client = MCPClient()
    server_url = os.getenv("TEST_MCP_SERVER_URL", "http://localhost:5001/mcp")
    
    try:
        await client.connect_to_streamable_http_server(server_url)
        
        resources = await client.list_resources()
        context = client.format_resources_for_context(resources)
        
        assert "page_navigator_schema" in context, "page_navigator_schema resource not found in MCP server"
        
        actual_content = context["page_navigator_schema"]["content"]
        
        assert expected_content.strip() in actual_content.strip(), \
            f"Expected schema content not found in MCP resource."
            
    finally:
        await client.cleanup()
