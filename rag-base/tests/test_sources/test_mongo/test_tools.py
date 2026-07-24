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
async def test_mongo_tools(mcp_server):
    """
    Test that the MCP server correctly serves the mongo tools
    as defined in the current configuration file.
    """
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    config_path = Path(config_yaml_path)
    assert config_path.exists(), f"Config file not found at {config_path}"
    
    with open(config_path, "r") as f:
        config_data = yaml.safe_load(f)
        
    expected_tools = config_data["mongo"]["selected_tools"]
    
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
async def test_mongo_list_databases(mcp_server):
    client = await get_connected_client()
    try:
        result = await client.call_tool("mongo_list_databases", {})
        assert not result.get("isError", False)
        
        response_text = result["content"][0]["text"]
        data = json.loads(response_text)
        
        assert "test_db" in data.get("databases", [])
    finally:
        await client.cleanup()


@pytest.mark.asyncio
async def test_mongo_list_collections(mcp_server):
    client = await get_connected_client()
    try:
        result = await client.call_tool("mongo_list_collections", {"database": "test_db"})
        assert not result.get("isError", False)
        
        data = json.loads(result["content"][0]["text"])
        collections = data.get("collections", [])
        
        assert "world_monitor_events" in collections
        assert "world_monitor_articles" in collections
    finally:
        await client.cleanup()


@pytest.mark.asyncio
async def test_mongo_collection_schema(mcp_server):
    client = await get_connected_client()
    try:
        result = await client.call_tool("mongo_collection_schema", {
            "database": "test_db", 
            "collection": "world_monitor_events",
            "sample_size": 5
        })
        assert not result.get("isError", False)
        
        data = json.loads(result["content"][0]["text"])
        schema = data.get("schema", {})
        
        assert "_id" in schema
        assert "event_type" in schema
        assert "threat_level" in schema
    finally:
        await client.cleanup()


@pytest.mark.asyncio
async def test_mongo_find_with_bson(mcp_server):
    client = await get_connected_client()
    try:
        # First, find any document to extract its ObjectId
        first_res = await client.call_tool("mongo_find", {
            "database": "test_db",
            "collection": "world_monitor_events",
            "limit": 1
        })
        first_data = json.loads(first_res["content"][0]["text"])
        docs = first_data.get("documents", [])
        assert len(docs) > 0, "No documents found to test with"
        
        # In mongo.py we convert ObjectId to string in the output
        extracted_id = docs[0]["_id"]
        
        # Second, call find using the extended JSON BSON format for ObjectId
        bson_filter = json.dumps({"_id": {"$oid": extracted_id}})
        second_res = await client.call_tool("mongo_find", {
            "database": "test_db",
            "collection": "world_monitor_events",
            "filter": bson_filter,
            "limit": 1
        })
        
        second_data = json.loads(second_res["content"][0]["text"])
        assert not second_data.get("error")
        second_docs = second_data.get("documents", [])
        
        assert len(second_docs) == 1
        assert second_docs[0]["_id"] == extracted_id
    finally:
        await client.cleanup()


@pytest.mark.asyncio
async def test_mongo_count(mcp_server):
    client = await get_connected_client()
    try:
        filter_str = json.dumps({"event_type": "MissileDroneThreat"})
        result = await client.call_tool("mongo_count", {
            "database": "test_db",
            "collection": "world_monitor_events",
            "filter": filter_str
        })
        assert not result.get("isError", False)
        
        data = json.loads(result["content"][0]["text"])
        assert "count" in data
        assert data["count"] > 0
    finally:
        await client.cleanup()


@pytest.mark.asyncio
async def test_mongo_aggregate(mcp_server):
    client = await get_connected_client()
    try:
        pipeline = json.dumps([
            {"$match": {"event_type": "MissileDroneThreat"}},
            {"$count": "total"}
        ])
        result = await client.call_tool("mongo_aggregate", {
            "database": "test_db",
            "collection": "world_monitor_events",
            "pipeline": pipeline
        })
        assert not result.get("isError", False)
        
        data = json.loads(result["content"][0]["text"])
        assert not data.get("error")
        results = data.get("results", [])
        
        assert len(results) == 1
        assert "total" in results[0]
        assert results[0]["total"] > 0
    finally:
        await client.cleanup()


@pytest.mark.asyncio
async def test_mongo_explain(mcp_server):
    client = await get_connected_client()
    try:
        filter_str = json.dumps({"event_type": "MissileDroneThreat"})
        result = await client.call_tool("mongo_explain", {
            "database": "test_db",
            "collection": "world_monitor_events",
            "filter": filter_str
        })
        assert not result.get("isError", False)
        
        data = json.loads(result["content"][0]["text"])
        assert "explanation" in data
        assert "queryPlanner" in data["explanation"]
    finally:
        await client.cleanup()
