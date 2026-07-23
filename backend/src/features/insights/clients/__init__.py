from __future__ import annotations

from datetime import datetime
from typing import Any

from src.shared.config import settings

VESSEL_STATE_COLLECTION = "vessel_state"
EVENTS_COLLECTION = settings.EVENTS_COLLECTION


async def fetch_vessel_count(db) -> int:
    collection = db.get_collection(VESSEL_STATE_COLLECTION)
    values = await collection.distinct("vessel_id")
    return len([v for v in values if v is not None])


async def fetch_event_type_counts(db) -> list[dict[str, Any]]:
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


async def fetch_events_time_bounds(db) -> tuple[datetime | None, datetime | None]:
    collection = db.get_collection(EVENTS_COLLECTION)
    pipeline = [
        {
            "$group": {
                "_id": None,
                "min_ts": {"$min": "$timestamp"},
                "max_ts": {"$max": "$timestamp"},
            }
        }
    ]
    async for doc in collection.aggregate(pipeline):
        return doc.get("min_ts"), doc.get("max_ts")
    return None, None


async def fetch_severity_count(db, severities: list[str]) -> int:
    collection = db.get_collection(EVENTS_COLLECTION)
    return await collection.count_documents({"severity": {"$in": severities}})


async def fetch_daily_event_counts(
    db,
    start: datetime,
    end: datetime,
) -> list[dict[str, Any]]:
    """Daily event counts for the Activity Timeline only."""
    collection = db.get_collection(EVENTS_COLLECTION)
    pipeline = [
        {"$match": {"timestamp": {"$gte": start, "$lte": end}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    results: list[dict[str, Any]] = []
    async for doc in collection.aggregate(pipeline):
        results.append({"day": doc["_id"], "count": int(doc["count"])})
    return results
