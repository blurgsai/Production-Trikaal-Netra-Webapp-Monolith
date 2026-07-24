"""
tests/test_api/test_streaming.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Pytest tests for POST /stream.

Priority: HIGH.  Covers unit-level error paths (no Docker needed) AND
full integration paths (require the mcp_server fixture chain).

Runs:
  # All streaming tests
  pytest tests/test_api/test_streaming.py -v

  # Fast unit tests only (no Docker)
  pytest tests/test_api/test_streaming.py -v -m "not integration"

  # Integration tests only
  pytest tests/test_api/test_streaming.py -v -m "integration"

SSE event format emitted by stream_conversation():
  data: {"p": "/message/content/0", "o": "append", "v": "<text>"}
  data: [DONE]
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import AsyncGenerator, List, Dict, Any

import pytest
import httpx
from httpx import ASGITransport
from bson import ObjectId
from pymongo import MongoClient

# ---------------------------------------------------------------------------
# Constants — re-use the same ports defined in conftest
# ---------------------------------------------------------------------------
_TEST_MONGO_PORT = int(os.environ.get("TEST_MONGO_PORT", "27018"))
_TEST_MONGO_URI = f"mongodb://localhost:{_TEST_MONGO_PORT}"
_TEST_DB_NAME = "dev"

pytestmark = pytest.mark.streaming


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_client(app) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        timeout=60.0,
    )


def _parse_sse_lines(raw: str) -> List[Dict[str, Any]]:
    """Parse a raw SSE body string into a list of event dicts.

    Each line that starts with ``data: `` is parsed:
    - ``data: [DONE]``          → ``{"type": "done"}``
    - ``data: <json>``          → the decoded JSON object
    - ``data: <non-json>``      → ``{"type": "raw", "raw": <text>}``
    """
    events: List[Dict[str, Any]] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("data: "):
            continue
        payload = line[6:]  # strip "data: "
        if payload == "[DONE]":
            events.append({"type": "done"})
        else:
            try:
                events.append(json.loads(payload))
            except json.JSONDecodeError:
                events.append({"type": "raw", "raw": payload})
    return events


async def _collect_stream(response: httpx.Response) -> str:
    """Read the full body of a streaming response and return it as a string."""
    chunks: List[bytes] = []
    async for chunk in response.aiter_bytes():
        chunks.append(chunk)
    return b"".join(chunks).decode("utf-8", errors="replace")


def _get_test_mongo_client() -> MongoClient:
    return MongoClient(_TEST_MONGO_URI, serverSelectionTimeoutMS=3000)


# ---------------------------------------------------------------------------
# Shared test session setup  (used by integration tests S-1 → S-4)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def stream_session_id(mongo_container, jwt_token):
    """Create a test user + session + user message in the test MongoDB.

    Returns the session_id string so S-1 → S-4 can send a real /stream request.
    """
    mongo = _get_test_mongo_client()
    db = mongo[_TEST_DB_NAME]

    # Create test user (idempotent)
    users = db["users"]
    user = users.find_one({"username": "test_user"})
    if not user:
        result = users.insert_one({
            "username": "test_user",
            "email": "test_user@example.com",
            "password_hash": "",
        })
        user_id = result.inserted_id
    else:
        user_id = user["_id"]

    # Create a session owned by test_user
    from datetime import datetime, timezone
    sessions = db["chat_sessions"]
    session_doc = {
        "user_id": user_id,
        "title": "Streaming Test Session",
        "summary": None,
        "updated_at": datetime.now(timezone.utc),
    }
    session_id = sessions.insert_one(session_doc).inserted_id

    # Insert one user message so the stream has something to work with
    messages = db["chat_messages"]
    messages.insert_one({
        "session_id": session_id,
        "role": "user",
        "content": "Hello, can you introduce yourself briefly?",
        "created_at": datetime.now(timezone.utc),
    })

    mongo.close()
    yield str(session_id)


# ---------------------------------------------------------------------------
# S-6  No auth → 401  (unit, no Docker)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stream_no_auth_returns_401():
    """S-6: POST /stream with no Authorization header must return 401."""
    import api  # noqa: PLC0415

    payload = {"session_id": str(ObjectId()), "message": "hello"}

    async with _make_client(api.app) as client:
        response = await client.post("/stream", json=payload)
        # Read body to prevent resource leak on streaming responses
        await response.aread()

    assert response.status_code == 401, (
        f"Expected 401, got {response.status_code}: {response.text}"
    )


# ---------------------------------------------------------------------------
# S-7  Wrong-user session → 403  (unit, monkeypatched)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stream_wrong_user_session_returns_403(monkeypatch, jwt_token):
    """S-7: POST /stream where session belongs to a different user must return 403."""
    from fastapi import HTTPException, status
    from bson import ObjectId as BsonObjectId
    import api  # noqa: PLC0415

    # Bypass the new mandatory user DB lookup added in api.py
    # (chat_db_client.get_user_id_by_username runs before verify_user_owns_session)
    monkeypatch.setattr(
        api.chat_db_client,
        "get_user_id_by_username",
        lambda username: BsonObjectId(),
    )

    async def _reject(*args, **kwargs):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this session",
        )

    monkeypatch.setattr(api, "verify_user_owns_session", _reject)

    payload = {"session_id": str(ObjectId()), "message": "hello"}

    async with _make_client(api.app) as client:
        response = await client.post("/stream", json=payload, headers=jwt_token)
        await response.aread()

    assert response.status_code == 403, (
        f"Expected 403, got {response.status_code}: {response.text}"
    )


# ---------------------------------------------------------------------------
# S-5  LLM not connected → error SSE event + [DONE]  (unit, monkeypatched)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stream_llm_not_connected_emits_error_event(monkeypatch, jwt_token):
    """S-5: When the LLM client is disconnected the stream must yield an error
    event followed by [DONE] — it must NOT raise an unhandled exception.
    """
    from fastapi import HTTPException, status
    from bson import ObjectId as BsonObjectId
    import api  # noqa: PLC0415

    # Bypass the new mandatory user DB lookup added in api.py
    # (chat_db_client.get_user_id_by_username runs before verify_user_owns_session)
    monkeypatch.setattr(
        api.chat_db_client,
        "get_user_id_by_username",
        lambda username: BsonObjectId(),
    )

    # Allow the ownership check through so we reach stream_conversation()
    async def _allow(*args, **kwargs):
        return True

    monkeypatch.setattr(api, "verify_user_owns_session", _allow)

    # Simulate disconnected LLM client
    class _FakeLLMClient:
        is_connected = False

    monkeypatch.setattr(api, "llm_client", _FakeLLMClient())

    # chat_db_client must also be present so the generator reaches the LLM check
    # (the generator itself checks llm_client.is_connected first)
    payload = {"session_id": str(ObjectId()), "message": "hello"}

    async with _make_client(api.app) as client:
        async with client.stream("POST", "/stream", json=payload, headers=jwt_token) as response:
            assert response.status_code == 200, (
                f"Expected 200 streaming response, got {response.status_code}"
            )
            raw = await _collect_stream(response)

    events = _parse_sse_lines(raw)

    error_events = [e for e in events if e.get("type") == "error"]
    done_events = [e for e in events if e.get("type") == "done"]

    assert error_events, (
        f"Expected at least one error event, got events: {events}"
    )
    assert done_events, (
        f"Stream must end with [DONE] even on error, got events: {events}"
    )
    # [DONE] must come last
    last_event = events[-1]
    assert last_event.get("type") == "done", (
        f"[DONE] must be the last event, last was: {last_event}"
    )


# ---------------------------------------------------------------------------
# S-1  Content-Type: text/event-stream  (integration)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
async def test_stream_response_content_type(mcp_server, jwt_token, stream_session_id):
    """S-1 [integration]: /stream must respond with Content-Type text/event-stream."""
    import api  # noqa: PLC0415

    payload = {"session_id": stream_session_id, "message": "Hi"}

    async with api.lifespan(api.app):
        async with _make_client(api.app) as client:
            async with client.stream("POST", "/stream", json=payload, headers=jwt_token) as response:
                content_type = response.headers.get("content-type", "")
                # Drain to avoid resource leak
                await _collect_stream(response)

    assert "text/event-stream" in content_type, (
        f"Expected 'text/event-stream' in Content-Type, got: '{content_type}'"
    )


# ---------------------------------------------------------------------------
# S-2  Content chunks are emitted  (integration)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
async def test_stream_emits_content_chunks(mcp_server, jwt_token, stream_session_id):
    """S-2 [integration]: Stream must emit ≥1 JSON Patch-style append event
    with 'o':'append' and '/content' in 'p'.
    """
    import api  # noqa: PLC0415

    payload = {"session_id": stream_session_id, "message": "Hi"}

    async with api.lifespan(api.app):
        async with _make_client(api.app) as client:
            async with client.stream("POST", "/stream", json=payload, headers=jwt_token) as response:
                assert response.status_code == 200
                raw = await _collect_stream(response)

    events = _parse_sse_lines(raw)

    content_events = [
        e for e in events
        if e.get("o") == "append" and "/content" in e.get("p", "")
    ]

    assert content_events, (
        "Expected at least one content-append event. "
        f"All events received: {events[:10]}"  # show first 10 for brevity
    )


# ---------------------------------------------------------------------------
# S-3  Stream ends with [DONE]  (integration)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
async def test_stream_ends_with_done(mcp_server, jwt_token, stream_session_id):
    """S-3 [integration]: The last SSE event must be [DONE]."""
    import api  # noqa: PLC0415

    payload = {"session_id": stream_session_id, "message": "Hi"}

    async with api.lifespan(api.app):
        async with _make_client(api.app) as client:
            async with client.stream("POST", "/stream", json=payload, headers=jwt_token) as response:
                assert response.status_code == 200
                raw = await _collect_stream(response)

    events = _parse_sse_lines(raw)

    assert events, "No SSE events were received"
    last_event = events[-1]
    assert last_event.get("type") == "done", (
        f"Expected last event to be [DONE], got: {last_event}"
    )


# ---------------------------------------------------------------------------
# S-4  Assistant message persisted to MongoDB  (integration)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
async def test_stream_persists_assistant_message(mcp_server, jwt_token, stream_session_id):
    """S-4 [integration]: After the stream completes an assistant message must
    exist in the test MongoDB for the session.
    """
    import api  # noqa: PLC0415

    payload = {"session_id": stream_session_id, "message": "Hi"}

    # Count messages before streaming
    mongo = _get_test_mongo_client()
    db = mongo[_TEST_DB_NAME]
    messages_col = db["chat_messages"]
    session_oid = ObjectId(stream_session_id)

    before_count = messages_col.count_documents({"session_id": session_oid})

    async with api.lifespan(api.app):
        async with _make_client(api.app) as client:
            async with client.stream("POST", "/stream", json=payload, headers=jwt_token) as response:
                assert response.status_code == 200
                await _collect_stream(response)

    # Brief delay to allow any async persistence to complete
    await asyncio.sleep(0.5)

    after_count = messages_col.count_documents({"session_id": session_oid})

    # Fetch the latest assistant message
    latest = list(
        messages_col.find({"session_id": session_oid, "role": "assistant"})
        .sort("_id", -1)
        .limit(1)
    )
    mongo.close()

    assert after_count > before_count, (
        f"Expected new messages after streaming. Before: {before_count}, after: {after_count}"
    )
    assert latest, "No assistant message found in DB after stream completed"
    assert latest[0].get("content", ""), (
        "Persisted assistant message has empty content"
    )
