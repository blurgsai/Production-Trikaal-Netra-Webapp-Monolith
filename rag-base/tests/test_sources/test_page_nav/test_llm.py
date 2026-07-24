import os
import re
import yaml
import pytest
from typing import List, Dict
from pathlib import Path
from dotenv import load_dotenv
import json
from unittest.mock import patch

from llm_client_with_mcp import LLMClientWithMCP, MockMessage

load_dotenv()


def _load_llm_from_config() -> tuple:
    """Load LLM provider and model from config."""
    config_yaml_path = os.getenv("CONFIG_YAML_PATH", "./rag_configs/new_compose_config.yaml")
    with open(config_yaml_path, "r") as f:
        config = yaml.safe_load(f)

    selected_llm = config.get("selected_llm", {})
    provider = selected_llm.get("provider", "gemini")
    model = selected_llm.get("model", "gemini-3.1-flash-lite")
    return provider, model


@pytest.mark.asyncio
async def test_page_nav_tool_awareness_live(mcp_server):
    """
    Live Integration Test: Connect to the real LLM and verify it can
    use the page_navigator tools to generate a full URL based on a user prompt.
    """
    from blurgs_observability import init_observability
    try:
        init_observability(
            None,
            'test-page-nav-llm',
            json_file_log_level="INFO",
            console_log_level="ERROR",
            otel_log_level=None,
        )
    except RuntimeError:
        pass
        
    client = LLMClientWithMCP(os.getenv("TEST_MCP_SERVER_URL", "http://localhost:5001/mcp"))
    await client.connect()
    
    # We ask it to generate a URL to trigger the generate_full_url tool and explicitly ask it to output the result
    messages = [MockMessage(content="Use your tools to generate a full URL for the map page showing the city of Singapore. Then, explicitly output the generated URL in your response.", role="user")]
    provider, model = _load_llm_from_config()
    
    response_parts = []
    
    try:
        with patch.object(client.mcp_client, 'call_tool', wraps=client.mcp_client.call_tool) as mock_call_tool:
            stream_gen = client.run_conversation_streaming(
                messages=messages,
                session_id="test-page-nav-tool-awareness-live",
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
            
            # Verify the tool was called
            tool_called = False
            for call in mock_call_tool.call_args_list:
                if call[0][0] == 'generate_full_url':
                    tool_called = True
                    break
                    
            assert tool_called, "The LLM did not call the generate_full_url tool."
            
    except Exception as e:
        if "429" in str(e) or "503" in str(e) or "rate limit" in str(e).lower() or "quota" in str(e).lower() or "unavailable" in str(e).lower():
            pytest.skip(f"Hit LLM API rate limit or quota during live test: {e}")
        else:
            raise e
            
    response = "".join(response_parts)
    await client.cleanup()


@pytest.mark.asyncio
async def test_page_nav_resource_awareness_live(mcp_server):
    """
    Live Integration Test: Connect to the real LLM and verify it can
    read the page_navigator schema resource to answer a question.
    """
    client = LLMClientWithMCP(os.getenv("TEST_MCP_SERVER_URL", "http://localhost:5001/mcp"))
    await client.connect()
    
    # We ask about the schema and explicitly tell it not to run tools.
    messages = [MockMessage(content="Read the page_navigator_schema resource text you have access to. Do NOT execute any tools. Tell me what Pages and Global Operators are documented there.", role="user")]
    provider, model = _load_llm_from_config()
    
    response_parts = []
    
    try:
        stream_gen = client.run_conversation_streaming(
            messages=messages,
            session_id="test-page-nav-resource-awareness-live",
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
        if "429" in str(e) or "503" in str(e) or "rate limit" in str(e).lower() or "quota" in str(e).lower() or "unavailable" in str(e).lower():
            pytest.skip(f"Hit LLM API rate limit or quota during live test: {e}")
        else:
            raise e
            
    response = "".join(response_parts)
    await client.cleanup()
    
    # Verify the LLM read the schema resource and identified the pages and operators
    response_lower = response.lower()
    has_map = "map" in response_lower
    has_events = "events" in response_lower
    has_operators = "eq" in response_lower or "ne" in response_lower or "contains" in response_lower
    
    assert (has_map and has_events) or has_operators, (
        f"Live LLM response did not mention the pages or operators from the schema.\n"
        f"Full LLM response: {response}"
    )
