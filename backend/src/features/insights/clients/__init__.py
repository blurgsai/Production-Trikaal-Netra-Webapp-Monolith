from __future__ import annotations

from typing import Any

from src.shared.config import settings

VESSEL_STATE_COLLECTION = "vessel_state"
EVENTS_COLLECTION = settings.EVENTS_COLLECTION  # Mongo `dev.events`


async def fetch_vessel_count(db) -> int:
    """Count distinct vessel_id values in Mongo vessel_state."""
    collection = db.get_collection(VESSEL_STATE_COLLECTION)
    values = await collection.distinct("vessel_id")
    return len([v for v in values if v is not None])


async def fetch_event_type_counts(db) -> list[dict[str, Any]]:
    """Count documents per type in Mongo events."""
    collection = db.get_collection(EVENTS_COLLECTION)
    pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results: list[dict[str, Any]] = []
    async for doc in collection.aggregate(pipeline):
        if doc.get("_id") is None:
            continue
        results.append({"type": str(doc["_id"]), "count": int(doc["count"])})
    return results
