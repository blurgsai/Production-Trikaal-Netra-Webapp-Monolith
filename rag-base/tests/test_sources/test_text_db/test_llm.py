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
    """
    results = {}
    
    # Pre-process the response: remove markdown formatting like ` and _ which can break word boundaries
    clean_response = llm_response.replace('`', ' ').replace('_', ' ')
    
    for word in expected_words:
        # Pre-process the word similarly so it matches
        clean_word = word.replace('_', ' ')
        
        # Escape the word to handle any accidental special regex characters
        escaped_word = re.escape(clean_word)
        
        # \b ensures we match whole words only
        # re.IGNORECASE handles variations in LLM capitalization
        pattern = rf"\b{escaped_word}\b"
        
        if re.search(pattern, clean_response, re.IGNORECASE):
            results[word] = True
        else:
            results[word] = False
            
    return results


def _load_text_db_tools_from_config() -> List[str]:
    """Extract text_files tools from the current config."""
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    with open(config_yaml_path, "r") as f:
        config_data = yaml.safe_load(f)
        
    text_config = config_data.get("text_files", {})
    tools = text_config.get("selected_tools", [])
    
    # We skip upload_documents because the MCP server doesn't actually register it
    return [t["name"] for t in tools if t["name"] != "upload_documents"]


def _load_text_db_resource_from_config() -> str:
    """Extract the text_files schema resource name from the current config."""
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    with open(config_yaml_path, "r") as f:
        config_data = yaml.safe_load(f)
        
    text_config = config_data.get("text_files", {})
    resource = text_config.get("schema_resource", {})
    return resource.get("name", "text_files_schema")


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
async def test_text_db_tool_awareness_live(mcp_server):
    """
    Live Integration Test: Connect to the real LLM and verify it can
    use the text database tools to search for a seeded document.
    """
    from blurgs_observability import init_observability
    try:
        init_observability(
            None,
            'test-textdb-llm',
            json_file_log_level="INFO",
            console_log_level="ERROR",
            otel_log_level=None,
        )
    except RuntimeError:
        pass
        
    client = LLMClientWithMCP(os.getenv("TEST_MCP_SERVER_URL", "http://localhost:5001/mcp"))
    await client.connect()
    
    # We ask it to search for the seeded Chroma context
    messages = [MockMessage(content="Use your tools to search the text documents for 'Aurelia Star-Weaver' and tell me her role.", role="user")]
    provider, model = _load_llm_from_config()
    
    response_parts = []
    
    try:
        stream_gen = client.run_conversation_streaming(
            messages=messages,
            session_id="test-textdb-tool-awareness-live",
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
    
    # If the LLM successfully used the tool, it will stream back an answer containing "Aurelia"
    assert "aurelia" in response.lower(), (
        f"Live LLM failed to answer using the search tool.\n"
        f"Full LLM response: {response}"
    )


@pytest.mark.asyncio
async def test_text_db_resource_awareness_live(mcp_server):
    """
    Live Integration Test: Connect to the real LLM and verify it can
    read the text database schema resource to answer a question.
    """
    client = LLMClientWithMCP(os.getenv("TEST_MCP_SERVER_URL", "http://localhost:5001/mcp"))
    await client.connect()
    
    # We ask about the file types, which is explicitly detailed in the config's schema_resource content
    messages = [MockMessage(content="According to the text schema resource you have access to, what file types are supported?", role="user")]
    provider, model = _load_llm_from_config()
    
    response_parts = []
    
    try:
        stream_gen = client.run_conversation_streaming(
            messages=messages,
            session_id="test-textdb-resource-awareness-live",
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
    
    # If it read the schema properly, it should mention pdf or txt or json
    has_pdf = "pdf" in response.lower()
    has_txt = "txt" in response.lower()
    has_json = "json" in response.lower()
    
    assert has_pdf or has_txt or has_json, (
        f"Live LLM response did not mention the supported file types from the schema.\n"
        f"Full LLM response: {response}"
    )
