import os
import json
import yaml
import pytest
from pathlib import Path
from dotenv import load_dotenv

from tool_client.client import MCPClient

load_dotenv()

async def get_connected_client(server_url=None):
    """Helper to initialize observability and connect the MCP client."""
    if server_url is None:
        server_url = os.getenv("TEST_MCP_SERVER_URL", "http://localhost:5001/mcp")
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
    await client.connect_to_streamable_http_server(server_url)
    # Prime the tools cache so call_tool can find the tools
    await client.list_tools()
    return client


@pytest.mark.asyncio
async def test_page_navigator_tools(mcp_server):
    """
    Test that the MCP server correctly serves the page_navigator tools
    as defined in the current configuration file.
    """
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    config_path = Path(config_yaml_path)
    assert config_path.exists(), f"Config file not found at {config_path}"
    
    with open(config_path, "r") as f:
        config_data = yaml.safe_load(f)
        
    expected_tools = config_data.get("page_navigator", {}).get("selected_tools", [])
    
    client = await get_connected_client()
    try:
        actual_tools = await client.list_tools()
        for expected_tool in expected_tools:
            tool_name = expected_tool["name"]
            
            assert tool_name in actual_tools, f"Expected tool '{tool_name}' not found in MCP server tools"
            
            actual_description = actual_tools[tool_name].description
            expected_description = expected_tool.get("description", "")
            assert expected_description.strip() in actual_description.strip()
    finally:
        await client.cleanup()


@pytest.mark.asyncio
async def test_generate_full_url_tool_call(mcp_server):
    """
    Test the generate_full_url tool executes successfully. 
    It will make an LLM call internally to parse the query into a URL string.
    We handle rate limit errors gracefully by skipping.
    """
    client = await get_connected_client()
    try:
        result = await client.call_tool("generate_full_url", {"user_query": "Singapore map"})
        assert not result.get("isError", False)
        
        response_text = result["content"][0]["text"]
        data = json.loads(response_text)
        
        # Since this tool uses LLM under the hood, we must catch rate limits/503 errors returned as json
        if data.get("error"):
            error_msg = str(data["error"]).lower()
            if "429" in error_msg or "503" in error_msg or "rate limit" in error_msg or "quota" in error_msg or "unavailable" in error_msg:
                pytest.skip(f"Hit LLM API rate limit or unavailability during generate_full_url test: {data['error']}")
            else:
                pytest.fail(f"Tool failed with unexpected error: {data['error']}")
                
        # Verify response structure and correctness if it successfully ran
        assert "url" in data
        assert "endpoint_used" in data
        assert "/map" in data["endpoint_used"]
        assert "Singapore" in data["url"] or "city" in data["url"]
        
    except Exception as e:
        # Since this tool uses LLM under the hood, we must catch rate limits
        error_msg = str(e).lower()
        if "429" in error_msg or "503" in error_msg or "rate limit" in error_msg or "quota" in error_msg or "unavailable" in error_msg:
            pytest.skip(f"Hit LLM API rate limit during generate_full_url test: {e}")
        else:
            raise e
    finally:
        await client.cleanup()
