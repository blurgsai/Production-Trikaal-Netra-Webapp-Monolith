import os
import re
import yaml
import pytest
from typing import List, Dict
from pathlib import Path
from dotenv import load_dotenv
import json

from llm_client_with_mcp import LLMClientWithMCP, MockMessage
from tool_client.client import MCPClient

load_dotenv()



def verify_expected_words(llm_response: str, expected_words: List[str]) -> Dict[str, bool]:
    """
    Checks an LLM response string to see which expected words are present.
    Uses regex word boundaries to prevent partial matching.
    
    Returns:
        A dictionary mapping each word to a boolean (True if found, False if not).
    """
    results = {}
    
    for word in expected_words:
        # Escape the word to handle any accidental special regex characters (like ?, +, etc.)
        escaped_word = re.escape(word)
        
        # \b ensures we match whole words only
        # re.IGNORECASE handles variations in LLM capitalization
        pattern = rf"\b{escaped_word}\b"
        
        if re.search(pattern, llm_response, re.IGNORECASE):
            results[word] = True
        else:
            results[word] = False
            
    return results


def _load_mongo_tools_from_config() -> List[str]:
    """Extract mongo tools from the current config."""
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    with open(config_yaml_path, "r") as f:
        config_data = yaml.safe_load(f)
        
    mongo_config = config_data.get("mongo", {})
    tools = mongo_config.get("selected_tools", [])
    return [t["name"] for t in tools]


def _load_mongo_resource_from_config() -> str:
    """Extract the mongo schema resource name from the current config."""
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    with open(config_yaml_path, "r") as f:
        config_data = yaml.safe_load(f)
        
    mongo_config = config_data.get("mongo", {})
    resource = mongo_config.get("schema_resource", {})
    return resource.get("name", "mongo_schema")


def _load_llm_from_config() -> tuple:
    """Load LLM provider and model from config."""
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    with open(config_yaml_path, "r") as f:
        config = yaml.safe_load(f)

    selected_llm = config.get("selected_llm", {})
    provider = selected_llm.get("provider", "gemini")
    model = selected_llm.get("model", "gemini-2.5-flash-lite")
    return provider, model


@pytest.mark.asyncio
async def test_mongo_tool_awareness_live(mcp_server):
    """
    Live Integration Test: Connect to the real LLM and verify it can
    use the MongoDB tools to list collections.
    """
    from blurgs_observability import init_observability
    try:
        init_observability(
            None,
            'test-mongo-llm',
            json_file_log_level="INFO",
            console_log_level="ERROR",
            otel_log_level=None,
        )
    except RuntimeError:
        pass
        
    client = LLMClientWithMCP(os.getenv("TEST_MCP_SERVER_URL", "http://localhost:5001/mcp"))
    await client.connect()
    
    # We ask it to list collections to trigger the mongo_list_collections tool
    messages = [MockMessage(content="Use your tools to list the collections in the test_db database.", role="user")]
    provider, model = _load_llm_from_config()
    
    response_parts = []
    
    try:
        stream_gen = client.run_conversation_streaming(
            messages=messages,
            session_id="test-mongo-tool-awareness-live",
            provider=provider,
            model=model,
            user_id="test_user",
        )
        
        async for chunk in stream_gen:
            if chunk.strip() == "[DONE]":
                break
            try:
                data = json.loads(chunk)
                if 'v' in data:
                    response_parts.append(data['v'])
            except json.JSONDecodeError:
                pass
                
    except Exception as e:
        if "429" in str(e) or "Rate limit" in str(e) or "quota" in str(e).lower():
            pytest.skip(f"Hit LLM API rate limit or quota during live test: {e}")
        else:
            raise e
            
    response = "".join(response_parts)

    await client.cleanup()
    
    # If the LLM successfully used the tool, it will mention world_monitor_events or world_monitor_articles
    assert "world_monitor_events" in response.lower() or "world_monitor_articles" in response.lower(), (
        f"Live LLM failed to answer using the mongo tools.\n"
        f"Full LLM response: {response}"
    )


@pytest.mark.asyncio
async def test_mongo_resource_awareness_live(mcp_server):
    """
    Live Integration Test: Connect to the real LLM and verify it can
    read the MongoDB schema resource to answer a question.
    """
    client = LLMClientWithMCP(os.getenv("TEST_MCP_SERVER_URL", "http://localhost:5001/mcp"))
    await client.connect()
    
    # We ask about the schema and explicitly tell it not to run tools,
    # because Gemini is smart enough to run `mongo_list_collections` on the dev database
    # if it thinks the static schema isn't enough, which breaks the test since test data is in test_db.
    messages = [MockMessage(content="Read the mongo schema resource text you have access to and tell me what collections are documented there. Do NOT execute any tools, just read the static schema documentation.", role="user")]
    provider, model = _load_llm_from_config()
    
    response_parts = []
    
    try:
        stream_gen = client.run_conversation_streaming(
            messages=messages,
            session_id="test-mongo-resource-awareness-live",
            provider=provider,
            model=model,
            user_id="test_user",
        )
        
        async for chunk in stream_gen:
            if chunk.strip() == "[DONE]":
                break
            try:
                data = json.loads(chunk)
                if 'v' in data:
                    response_parts.append(data['v'])
            except json.JSONDecodeError:
                pass
                
    except Exception as e:
        if "429" in str(e) or "Rate limit" in str(e) or "quota" in str(e).lower():
            pytest.skip(f"Hit LLM API rate limit or quota during live test: {e}")
        else:
            raise e
            
    response = "".join(response_parts)

    await client.cleanup()
    
    # If it read the schema properly, it should mention the collections detailed in the config resource
    has_articles = "world_monitor_articles" in response.lower()
    has_events = "world_monitor_events" in response.lower()
    
    assert has_articles or has_events, (
        f"Live LLM response did not mention the collections from the schema.\n"
        f"Full LLM response: {response}"
    )