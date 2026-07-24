from typing import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from shared.config import get_settings
from shared.errors import UnauthorizedError

_client: AsyncIOMotorClient | None = None


def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    settings = get_settings()
    client = get_mongo_client()
    yield client[settings.mongodb_db]


async def require_api_key(
    api_key: str | None = None,
) -> str:
    from fastapi import Header

    settings = get_settings()
    if not settings.api_keys:
        return "open"
    if api_key not in settings.api_keys:
        raise UnauthorizedError()
    return api_key


from fastapi import Header as _Header, Depends as _Depends


async def api_key_guard(
    x_api_key: str | None = _Header(default=None, alias="X-API-Key"),
) -> str:
    settings = get_settings()
    if not settings.api_keys:
        return "open"
    if x_api_key not in settings.api_keys:
        raise UnauthorizedError()
    return x_api_key
