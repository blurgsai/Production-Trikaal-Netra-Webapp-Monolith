"""
tests/test_api/test_health.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Pytest tests for GET /health.

Runs:
  pytest tests/test_api/test_health.py -v                  # all
  pytest tests/test_api/test_health.py -v -m "not integration"  # unit only
"""

import pytest
import httpx
from httpx import ASGITransport


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_client(app) -> httpx.AsyncClient:
    """Return an in-process AsyncClient bound to the FastAPI app."""
    return httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    )


# ---------------------------------------------------------------------------
# H-1  GET /health → 200
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_returns_200():
    """H-1: Health endpoint must return HTTP 200."""
    # Import app fresh for each test so module-level globals are predictable.
    import api  # noqa: PLC0415 (local import intentional)

    async with _make_client(api.app) as client:
        response = await client.get("/health")

    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}"
    )


# ---------------------------------------------------------------------------
# H-2  Response schema validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_response_schema():
    """H-2: Body must contain 'status: ok' and 'llm_client_connected: bool'."""
    import api  # noqa: PLC0415

    async with _make_client(api.app) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()

    assert "status" in body, "Response JSON missing 'status' key"
    assert body["status"] == "ok", f"Expected status 'ok', got '{body['status']}'"

    assert "llm_client_connected" in body, (
        "Response JSON missing 'llm_client_connected' key"
    )
    assert isinstance(body["llm_client_connected"], bool), (
        f"'llm_client_connected' should be bool, got {type(body['llm_client_connected'])}"
    )


# ---------------------------------------------------------------------------
# H-3  llm_client_connected == True with a live MCP stack (integration)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
async def test_health_llm_connected_true(mcp_server):
    """H-3 [integration]: llm_client_connected is True when MCP server is running.

    Requires the full Docker fixture chain (mongo → chroma → mcp_server).
    Skip in fast CI with:  pytest -m 'not integration'
    """
    import api  # noqa: PLC0415

    async with api.lifespan(api.app):
        async with _make_client(api.app) as client:
            response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body.get("llm_client_connected") is True, (
        "Expected llm_client_connected=True with live MCP server, "
        f"got: {body}"
    )


# ---------------------------------------------------------------------------
# H-4  llm_client_connected == False when client is not initialised
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_llm_connected_false(monkeypatch):
    """H-4: llm_client_connected is False when global llm_client is None."""
    import api  # noqa: PLC0415

    # Force the global to None so the endpoint reports not-connected.
    monkeypatch.setattr(api, "llm_client", None)

    async with _make_client(api.app) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body.get("llm_client_connected") is False, (
        f"Expected llm_client_connected=False when llm_client is None, got: {body}"
    )
