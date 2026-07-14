from collections.abc import AsyncGenerator

import httpx
import motor.motor_asyncio

from src.shared.config import settings


async def get_http_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        yield client


def get_db():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
    return client[settings.MONGO_DB]


async def get_gridfs():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    return motor.motor_asyncio.AsyncIOMotorGridFSBucket(db)
