"""
tests/stress_tests/conftest.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Specialized fixtures and mocking infrastructure for stress testing and failure analysis.
Automatically loaded by pytest for all tests inside tests/stress_tests/.
"""

import asyncio
import os
import time
from typing import AsyncGenerator, Dict, Any, List
from unittest.mock import AsyncMock, MagicMock

import pytest
import httpx
from httpx import ASGITransport
from bson import ObjectId


@pytest.fixture
def stress_jwt_header() -> Dict[str, str]:
    """Generate a valid JWT Authorization header for stress test users."""
    import jwt as pyjwt
    secret = os.getenv("JWT_SECRET", "jwt-secret-key")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    token = pyjwt.encode(
        {"sub": "stress_test_user", "role": "user"},
        secret,
        algorithm=algorithm,
    )
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def make_stress_client():
    """Factory fixture to create an HTTPX AsyncClient bound to the FastAPI app."""
    def _factory(app) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
            timeout=60.0,
        )
    return _factory


@pytest.fixture
def mock_rate_limit_llm(monkeypatch):
    """
    Simulates OpenAI/Gemini RateLimitError (HTTP 429) during LLM completion creation.
    Can be configured to fail on the Nth call or immediately.
    """
    import openai

    class FakeRateLimitError(openai.RateLimitError):
        def __init__(self):
            super().__init__(
                message="Rate limit reached for model (simulated 429 in stress test)",
                response=httpx.Response(429, request=httpx.Request("POST", "https://api.openai.com/v1/chat/completions")),
                body={"error": {"message": "Rate limit reached"}},
            )

    def _setup_rate_limit(fail_after_calls: int = 0):
        calls = {"count": 0}

        async def _fake_create(*args, **kwargs):
            calls["count"] += 1
            if calls["count"] > fail_after_calls:
                raise FakeRateLimitError()
            
            choice_mock = MagicMock()
            choice_mock.message.content = "Synthetic response before rate limit."
            resp_mock = MagicMock()
            resp_mock.choices = [choice_mock]
            return resp_mock

        from llm_client_with_mcp import get_llm_client
        fake_client = MagicMock()
        fake_client.chat.completions.create = AsyncMock(side_effect=_fake_create)
        monkeypatch.setattr("llm_client_with_mcp.get_llm_client", lambda provider: fake_client)
        return calls

    return _setup_rate_limit


@pytest.fixture
def mock_delayed_llm(monkeypatch):
    """
    Simulates slow LLM responses (configurable delay) to test streaming timeouts,
    client disconnects mid-generation, and concurrency queuing.
    """
    def _setup_delay(delay_seconds: float = 1.0, response_text: str = "Delayed synthesized output."):
        async def _fake_create(*args, **kwargs):
            await asyncio.sleep(delay_seconds)
            choice_mock = MagicMock()
            choice_mock.message.content = response_text
            resp_mock = MagicMock()
            resp_mock.choices = [choice_mock]
            return resp_mock

        fake_client = MagicMock()
        fake_client.chat.completions.create = AsyncMock(side_effect=_fake_create)
        monkeypatch.setattr("llm_client_with_mcp.get_llm_client", lambda provider: fake_client)

    return _setup_delay
