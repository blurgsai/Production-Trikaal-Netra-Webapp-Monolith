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
        pass
        
    client = MCPClient()
    await client.connect_to_streamable_http_server(server_url)
    # Prime the tools cache so call_tool can find the tools
    await client.list_tools()
    return client


@pytest.mark.asyncio
async def test_text_db_tools(mcp_server):
    """
    Test that the MCP server correctly serves the text_files tools
    as defined in the current configuration file.
    Note: 'upload_documents' is skipped as it is not implemented in text_source.py
    """
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    config_path = Path(config_yaml_path)
    assert config_path.exists(), f"Config file not found at {config_path}"
    
    with open(config_path, "r") as f:
        config_data = yaml.safe_load(f)
        
    expected_tools = config_data.get("text_files", {}).get("selected_tools", [])
    
    client = await get_connected_client()
    try:
        actual_tools = await client.list_tools()
        for expected_tool in expected_tools:
            tool_name = expected_tool["name"]
            
            # Skip upload_documents as it's not currently implemented in text_source.py
            if tool_name == "upload_documents":
                continue
                
            assert tool_name in actual_tools, f"Expected tool '{tool_name}' not found in MCP server tools"
            
            actual_description = actual_tools[tool_name].description
            expected_description = expected_tool.get("description", "")
            assert expected_description.strip() in actual_description.strip()
    finally:
        await client.cleanup()


@pytest.mark.asyncio
async def test_search_documents(mcp_server):
    """
    Test the search_documents tool executes successfully against the seeded test Chroma instance.
    Since the test Chroma is seeded with test_chroma_context.md, it should return results.
    """
    client = await get_connected_client()
    try:
        result = await client.call_tool("search_documents", {"query": "Aurelia Star-Weaver", "top_k": 3})
        assert not result.get("isError", False)
        
        response_text = result["content"][0]["text"]
        data = json.loads(response_text)
        
        # Verify response structure
        assert "query" in data
        assert data["query"] == "Aurelia Star-Weaver"
        assert "results_count" in data
        assert "results" in data
        
        # We seeded Chroma with a document about Aurelia Star-Weaver
        assert data["results_count"] > 0
        assert len(data["results"]) > 0
        
        # Verify the actual content from test_chroma_context.md is returned
        first_result_content = data["results"][0].get("content", "")
        assert "Aurelia" in first_result_content
    finally:
        await client.cleanup()
