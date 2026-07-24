"""
tests/stress_tests/test_stress_concurrency.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Pytest-asyncio concurrency and failure injection test suite.
Covers:
- ST-02: Client disconnection/cancellation mid-stream (`stream_conversation`)
- ST-03: Thundering herd on `refresh_resources_context()` when `_resources_stale = True`
- ST-05: Memory summarization race conditions under rapid turn accumulation
- ST-06: LLM Provider rate limits (`HTTP 429`) inside SSE streaming
"""

import asyncio
import json
from typing import List, Dict, Any
from unittest.mock import AsyncMock, MagicMock

import pytest
import httpx
from bson import ObjectId


pytestmark = pytest.mark.asyncio


class MockRole:
    def __init__(self, val="user"):
        self.value = val


class MockMessage:
    def __init__(self, content="Hello", role="user"):
        self.content = content
        self.role = MockRole(role)


def _parse_sse_events(raw: str) -> List[Dict[str, Any]]:
    events = []
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("data: "):
            continue
        payload = line[6:]
        if payload == "[DONE]":
            events.append({"type": "done"})
        else:
            try:
                events.append(json.loads(payload))
            except json.JSONDecodeError:
                events.append({"type": "raw", "raw": payload})
    return events


def _setup_mock_api_state(monkeypatch, api, fake_llm=None):
    """Helper to mock api.chat_db_client, api.llm_client, and verify_user_owns_session."""
    from llm_client_with_mcp import LLMClientWithMCP

    mock_db = MagicMock()
    mock_db.get_user_id_by_username.return_value = ObjectId()
    mock_db.list_enabled_documents.return_value = []
    mock_db.get_message.return_value = [MockMessage(content="Hello world", role="user")]
    mock_db.get_messages.return_value = [MockMessage(content="Hello world", role="user")]
    mock_db.insert_user_message.return_value = str(ObjectId())
    mock_db.insert_assistant_message.return_value = str(ObjectId())

    monkeypatch.setattr(api, "chat_db_client", mock_db)
    monkeypatch.setattr("llm_client_with_mcp.ChatMongoClient", lambda: mock_db)
    monkeypatch.setattr(api, "verify_user_owns_session", AsyncMock(return_value=True))

    if fake_llm is None:
        fake_llm = LLMClientWithMCP("http://localhost:5001/mcp")
        fake_llm.is_connected = True
        fake_llm.tools_schema = [{"type": "function", "function": {"name": "dummy_tool"}}]

    monkeypatch.setattr(api, "llm_client", fake_llm)
    return mock_db, fake_llm


# ---------------------------------------------------------------------------
# ST-06: LLM Rate Limit (429) inside SSE Streaming
# ---------------------------------------------------------------------------
async def test_stress_stream_llm_rate_limit_emits_error_chunk(
    monkeypatch, stress_jwt_header, make_stress_client, mock_rate_limit_llm
):
    """
    ST-06: When the LLM provider raises RateLimitError (HTTP 429), `POST /stream`
    must NOT throw an unhandled 500 server crash. It must return 200 with an SSE
    stream containing an error/warning message or handle the exception cleanly.
    """
    import api
    from llm_client_with_mcp import LLMClientWithMCP

    fake_llm = LLMClientWithMCP("http://localhost:5001/mcp")
    fake_llm.is_connected = True
    fake_llm.tools_schema = [{"type": "function", "function": {"name": "dummy_tool"}}]

    _setup_mock_api_state(monkeypatch, api, fake_llm=fake_llm)

    mock_rate_limit_llm(fail_after_calls=0)

    payload = {"session_id": str(ObjectId()), "message": "Trigger rate limit"}

    async with make_stress_client(api.app) as client:
        async with client.stream("POST", "/stream", json=payload, headers=stress_jwt_header) as response:
            assert response.status_code == 200, f"Expected 200 SSE stream response, got {response.status_code}"
            chunks = []
            async for chunk in response.aiter_bytes():
                chunks.append(chunk)
            raw = b"".join(chunks).decode("utf-8", errors="replace")

    events = _parse_sse_events(raw)
    assert len(events) > 0, "Expected SSE events emitted even under rate limit."
    assert any(e.get("type") == "done" for e in events), f"Stream did not terminate cleanly with [DONE]: {events}"


# ---------------------------------------------------------------------------
# ST-02: Client Abort / Cancellation Mid-Stream
# ---------------------------------------------------------------------------
async def test_stress_stream_client_cancellation_does_not_leak(
    monkeypatch, stress_jwt_header, make_stress_client, mock_delayed_llm
):
    """
    ST-02: Simulates a client closing the connection / cancelling the task while
    the server is in the middle of a slow LLM/tool execution during SSE streaming.
    Verifies that the server coroutine cleans up cleanly without crashing subsequent requests.
    """
    import api
    from llm_client_with_mcp import LLMClientWithMCP

    fake_llm = LLMClientWithMCP("http://localhost:5001/mcp")
    fake_llm.is_connected = True
    fake_llm.tools_schema = [{"type": "function", "function": {"name": "dummy_tool"}}]

    _setup_mock_api_state(monkeypatch, api, fake_llm=fake_llm)

    mock_delayed_llm(delay_seconds=1.5, response_text="Delayed output after cancel check.")

    payload = {"session_id": str(ObjectId()), "message": "Slow question"}

    async def _start_and_cancel_client():
        async with make_stress_client(api.app) as client:
            async with client.stream("POST", "/stream", json=payload, headers=stress_jwt_header) as response:
                assert response.status_code == 200
                await asyncio.sleep(0.2)
                raise asyncio.CancelledError("Client disconnected prematurely")

    try:
        await _start_and_cancel_client()
    except asyncio.CancelledError:
        pass

    mock_delayed_llm(delay_seconds=0.01, response_text="Quick response.")
    async with make_stress_client(api.app) as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"


# ---------------------------------------------------------------------------
# ST-03: Thundering Herd on Resource Refresh (_resources_stale = True)
# ---------------------------------------------------------------------------
async def test_stress_thundering_herd_on_stale_resources(monkeypatch):
    """
    ST-03: When `_resources_stale` is True, multiple concurrent calls to
    `run_conversation_streaming()` or `refresh_resources_context()` must not cause
    race conditions or double-initialization errors.
    """
    from llm_client_with_mcp import LLMClientWithMCP

    client_instance = LLMClientWithMCP("http://localhost:5001/mcp")
    client_instance.is_connected = True
    client_instance._resources_stale = True
    client_instance.tools_schema = [{"type": "function", "function": {"name": "test_tool"}}]
    client_instance.resources_context = {"dummy_res": {"name": "dummy", "description": "desc", "content": "data"}}

    refresh_calls = {"count": 0}
    async def _mock_refresh():
        refresh_calls["count"] += 1
        await asyncio.sleep(0.05)
        client_instance.tools_schema = [{"type": "function", "function": {"name": "test_tool"}}]
        client_instance.resources_context = {"dummy_res": {"name": "dummy", "description": "desc", "content": "data"}}

    client_instance.refresh_resources_context = AsyncMock(side_effect=_mock_refresh)

    fake_llm = MagicMock()
    choice_mock = MagicMock()
    choice_mock.message.content = "Synthesized herd answer"
    fake_llm.chat.completions.create = AsyncMock(return_value=MagicMock(choices=[choice_mock]))
    monkeypatch.setattr("llm_client_with_mcp.get_llm_client", lambda p: fake_llm)

    mock_db = MagicMock()
    mock_db.list_enabled_documents.return_value = []
    mock_db.get_messages.return_value = [MockMessage(content="test query", role="user")]
    monkeypatch.setattr("llm_client_with_mcp.ChatMongoClient", lambda: mock_db)

    async def _run_one():
        messages = [MockMessage(content="query", role="user")]
        chunks = []
        async for chunk in client_instance.run_conversation_streaming(messages, "sess-1", "gemini", "model", "user-1"):
            chunks.append(chunk)
        return chunks

    tasks = [asyncio.create_task(_run_one()) for _ in range(20)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    errors = [r for r in results if isinstance(r, Exception)]
    assert len(errors) == 0, f"Thundering herd caused concurrent exceptions: {errors}"
    assert client_instance._resources_stale is False, "_resources_stale flag must be cleared after refresh."


# ---------------------------------------------------------------------------
# ST-05: Memory Summarization Race Conditions Under Concurrency
# ---------------------------------------------------------------------------
async def test_stress_memory_summarization_race(monkeypatch):
    """
    ST-05: When rapid concurrent message turns cross `memory_threshold`,
    `_process_memory()` and `_create_incremental_summary()` must safely truncate history
    and avoid raising race-condition exceptions.
    """
    from llm_client_with_mcp import LLMClientWithMCP

    client_instance = LLMClientWithMCP("http://localhost:5001/mcp")
    client_instance.memory_threshold = 5

    mock_db = MagicMock()
    mock_db.get_messages.return_value = [
        MockMessage(content=f"msg {i}", role="user") for i in range(6)
    ]
    mock_db.get_summary.return_value = None
    monkeypatch.setattr("llm_client_with_mcp.ChatMongoClient", lambda: mock_db)

    summary_calls = {"count": 0}
    async def _mock_summary(dropped, existing, provider):
        summary_calls["count"] += 1
        await asyncio.sleep(0.02)
        return "New incremental summary generated."

    client_instance._create_incremental_summary = AsyncMock(side_effect=_mock_summary)

    async def _process_one():
        messages = [MockMessage(content=f"msg {i}", role="user") for i in range(6)]
        return client_instance._process_memory(messages)

    tasks = [asyncio.create_task(_process_one()) for _ in range(10)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    errors = [r for r in results if isinstance(r, Exception)]
    assert len(errors) == 0, f"Concurrent memory processing caused exceptions: {errors}"
