"""
Redis-backed WebSocket event bus for horizontal scaling.

How it works
------------
- Any app instance that receives /api/notify publishes the WS payload to
  the Redis channel WS_CHANNEL.
- Every app instance runs a background subscriber loop.  On receiving a
  message it attempts local delivery via ws_manager.  The instance that
  holds the actual WebSocket connection will succeed; others silently no-op.

Fallback
--------
If REDIS_URL is empty the module is disabled; callers should fall back to
direct ws_manager delivery (single-instance mode).
"""

import asyncio
import json
import logging
from typing import Any

import redis.asyncio as aioredis

from shared.config import get_settings

logger = logging.getLogger(__name__)

WS_CHANNEL = "notif:ws:events"

_client: aioredis.Redis | None = None


def get_redis_client() -> aioredis.Redis:
    global _client
    if _client is None:
        settings = get_settings()
        _client = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _client


async def publish_ws_event(usernames: list[str], payload: dict[str, Any]) -> None:
    """Publish a WebSocket delivery event to all instances via Redis Pub/Sub."""
    message = json.dumps({"_usernames": usernames, **payload})
    await get_redis_client().publish(WS_CHANNEL, message)


async def run_ws_subscriber(ws_manager: Any) -> None:
    """
    Long-running background task.
    Subscribes to WS_CHANNEL and dispatches each event to locally-connected
    WebSocket clients using the provided WebSocketManager instance.
    """
    settings = get_settings()
    sub = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = sub.pubsub()
    await pubsub.subscribe(WS_CHANNEL)
    logger.info("Redis WS subscriber ready — channel: %s", WS_CHANNEL)
    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                event = json.loads(message["data"])
                usernames: list[str] = event.pop("_usernames", [])
                if usernames:
                    await ws_manager.broadcast_to_clients(usernames, event)
            except Exception as exc:
                logger.warning("WS subscriber dispatch error: %s", exc)
    except asyncio.CancelledError:
        logger.info("Redis WS subscriber shutting down")
    finally:
        await pubsub.unsubscribe(WS_CHANNEL)
        await sub.aclose()


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("Redis client closed")
