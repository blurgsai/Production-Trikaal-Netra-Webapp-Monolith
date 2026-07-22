"""Compound events feature — Layer 1 (clients).

Reads the MongoDB `compound_events` collection (admin-created configs) and the
`events` collection (constituent atomic events fetched within a config's time
window). Knows nothing about FastAPI or domain models; returns raw documents.

A compound event config defines a set of `constituent_types` and a time window.
Instances are computed on demand from the atomic events in that window — nothing
is stored. See the services layer for the overlap algorithm.
"""
from __future__ import annotations

from datetime import datetime

from bson import ObjectId

from src.shared.config import settings

COMPOUND_COLLECTION = settings.COMPOUND_COLLECTION
EVENTS_COLLECTION = settings.EVENTS_COLLECTION

# Safety cap on events fetched per constituent type when computing instances.
MAX_EVENTS_PER_TYPE = 500


async def count_configs(db, query: dict) -> int:
    return await db.get_collection(COMPOUND_COLLECTION).count_documents(query)


async def fetch_configs(db, query: dict, *, limit: int, offset: int) -> list[dict]:
    cursor = (
        db.get_collection(COMPOUND_COLLECTION)
        .find(query)
        .sort([("timestamp", -1)])
        .skip(offset)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def fetch_config_by_id(db, config_id: str) -> dict | None:
    if not ObjectId.is_valid(config_id):
        return None
    return await db.get_collection(COMPOUND_COLLECTION).find_one({"_id": ObjectId(config_id)})


async def fetch_events_in_window(
    db,
    event_type: str,
    window_start: datetime,
    window_end: datetime,
) -> list[dict]:
    """Fetch atomic events of a type whose start_time falls in [window_start, window_end]."""
    projection = {
        "_id": 1,
        "type": 1,
        "start_time": 1,
        "end_time": 1,
        "vessels_involved": 1,
        "severity": 1,
    }
    cursor = (
        db.get_collection(EVENTS_COLLECTION)
        .find(
            {"type": event_type, "start_time": {"$gte": window_start, "$lte": window_end}},
            projection,
        )
        .sort("start_time", 1)
        .limit(MAX_EVENTS_PER_TYPE)
    )
    return await cursor.to_list(length=MAX_EVENTS_PER_TYPE)
