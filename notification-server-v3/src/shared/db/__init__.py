"""
Motor client registry.

Caches one AsyncIOMotorClient per unique connection string so that
per-topic storage routing never creates duplicate connection pools.

Usage
-----
    db, collection = get_db_for_topic(
        storage_uri=doc.storage_uri,
        storage_db=doc.storage_db,
        storage_collection=doc.storage_collection,
    )
    await db[collection].insert_one(...)
"""

import logging
from urllib.parse import urlparse, urlunparse

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from shared.config import get_settings

logger = logging.getLogger(__name__)

_registry: dict[str, AsyncIOMotorClient] = {}


def _mask_uri(uri: str) -> str:
    """Replace password in URI with *** for safe logging."""
    try:
        p = urlparse(uri)
        if p.password:
            netloc = f"{p.username}:***@{p.hostname}"
            if p.port:
                netloc += f":{p.port}"
            return urlunparse(p._replace(netloc=netloc))
    except Exception:
        pass
    return uri


def get_client_for_uri(uri: str) -> AsyncIOMotorClient:
    if uri not in _registry:
        _registry[uri] = AsyncIOMotorClient(uri)
        logger.info("Motor client registered: %s", _mask_uri(uri))
    return _registry[uri]


def get_db_for_topic(
    storage_uri: str | None,
    storage_db: str | None,
    storage_collection: str,
) -> tuple[AsyncIOMotorDatabase, str]:
    """
    Resolve (database, collection_name) for a topic's storage config.
    Strict mode: if any storage field is set, all must be set.
    If none are set, fall back to global defaults.
    """
    settings = get_settings()
    has_custom = any([storage_uri, storage_db, storage_collection != "notifications"])
    if has_custom:
        if not (storage_uri and storage_db and storage_collection):
            raise ValueError(
                "Partial storage config not allowed: if any of storage_uri, storage_db, "
                "or storage_collection is set, all must be set."
            )
        return get_client_for_uri(storage_uri)[storage_db], storage_collection
    return get_client_for_uri(settings.mongodb_uri)[settings.mongodb_db], storage_collection


async def close_all() -> None:
    for uri, client in list(_registry.items()):
        client.close()
        logger.info("Motor client closed: %s", _mask_uri(uri))
    _registry.clear()
