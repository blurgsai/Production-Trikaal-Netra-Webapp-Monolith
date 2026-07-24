"""
tests/test_api/test_memory.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Unit tests for the memory management (windowing and compacting) logic.
These tests run instantly and do not require external services (no Docker/MCP).
"""

from __future__ import annotations
import pytest

from llm_client_with_mcp import LLMClientWithMCP, MockMessage


def test_process_memory_within_window_size():
    """Verify that messages are not dropped if they are within MEMORY_WINDOW_SIZE."""
    client = LLMClientWithMCP("http://mock-mcp-url")
    client.memory_window_size = 5

    # 4 messages (within window of 5)
    messages = [
        MockMessage(role="user", content="hello 1"),
        MockMessage(role="assistant", content="hi 1"),
        MockMessage(role="user", content="hello 2"),
        MockMessage(role="assistant", content="hi 2"),
    ]

    windowed_msgs, dropped_count, dropped_msgs = client._process_memory(messages)

    assert dropped_count == 0
    assert len(dropped_msgs) == 0
    assert len(windowed_msgs) == 4
    assert windowed_msgs[0]["content"] == "hello 1"
    assert windowed_msgs[-1]["content"] == "hi 2"


def test_process_memory_exceeding_window_size():
    """Verify that older messages are correctly dropped/pruned when exceeding MEMORY_WINDOW_SIZE."""
    client = LLMClientWithMCP("http://mock-mcp-url")
    client.memory_window_size = 3

    # 5 messages (exceeds window of 3)
    messages = [
        MockMessage(role="user", content="hello 1"),
        MockMessage(role="assistant", content="hi 1"),
        MockMessage(role="user", content="hello 2"),
        MockMessage(role="assistant", content="hi 2"),
        MockMessage(role="user", content="hello 3"),
    ]

    windowed_msgs, dropped_count, dropped_msgs = client._process_memory(messages)

    # We expect 5 - 3 = 2 dropped messages
    assert dropped_count == 2
    assert len(dropped_msgs) == 2
    assert len(windowed_msgs) == 3

    # The oldest messages should be dropped
    assert dropped_msgs[0]["content"] == "hello 1"
    assert dropped_msgs[1]["content"] == "hi 1"

    # The windowed messages should contain the newest ones
    assert windowed_msgs[0]["content"] == "hello 2"
    assert windowed_msgs[-1]["content"] == "hello 3"


def test_should_summarize():
    """Verify the conditions under which summarization/compacting is triggered."""
    client = LLMClientWithMCP("http://mock-mcp-url")
    client.memory_threshold = 10

    # Case 1: Under threshold, no existing summary -> False
    assert client._should_summarize(total_messages=8, current_summary=None) is False

    # Case 2: At or above threshold, no existing summary -> True
    assert client._should_summarize(total_messages=10, current_summary=None) is True
    assert client._should_summarize(total_messages=12, current_summary=None) is True

    # Case 3: At or above threshold, but summary already exists -> False
    # (since we only trigger the first-time summarization when summary is None)
    assert client._should_summarize(total_messages=12, current_summary="Some previous summary") is False
