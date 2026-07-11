from __future__ import annotations

import math
import re
from collections.abc import Iterable
from datetime import UTC, datetime, timezone
from typing import Any

from bson import ObjectId


def _parse_iso_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(normalized)
        except ValueError:
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    return None


def _escape_keyword(keyword: str) -> str:
    return re.escape(keyword.strip())


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _sort_spec(sort: str) -> list[tuple[str, int]]:
    if sort == "oldest":
        return [("enriched_at", 1), ("_id", 1)]
    if sort == "most_relevant":
        return [("relevance_score", -1), ("enriched_at", -1), ("_id", -1)]
    if sort == "most_severe":
        return [("threat_level", -1), ("relevance_score", -1), ("enriched_at", -1)]
    return [("enriched_at", -1), ("_id", -1)]


def build_pagination(*, page: int, page_size: int, total: int) -> dict[str, int]:
    total_pages = max(math.ceil(total / page_size), 1) if page_size else 1
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


async def fetch_metadata(db) -> dict[str, list[str]]:
    events = db.get_collection("world_monitor_events")
    articles = db.get_collection("world_monitor_articles")

    event_types = await events.distinct("event_type")
    threat_levels = await events.distinct("threat_level")
    sources = await articles.distinct("source")
    processing_statuses = await articles.distinct("processing_status")

    return {
        "event_types": sorted([v for v in event_types if v]),
        "threat_levels": sorted([v for v in threat_levels if v]),
        "sources": sorted([v for v in sources if v]),
        "processing_statuses": sorted([v for v in processing_statuses if v]),
    }


async def _resolve_source_article_ids(db, sources: list[str]) -> list[ObjectId] | None:
    if not sources:
        return None
    articles = db.get_collection("world_monitor_articles")
    docs = await articles.find({"source": {"$in": sources}}, {"_id": 1}).to_list(length=None)
    return [doc["_id"] for doc in docs]


async def build_event_query(
    db,
    *,
    keyword: str | None = None,
    event_types: str | None = None,
    threat_levels: str | None = None,
    sources: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    has_linked_article: bool | None = None,
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    and_clauses: list[dict[str, Any]] = []

    parsed_event_types = _split_csv(event_types)
    parsed_threat_levels = _split_csv(threat_levels)
    parsed_sources = _split_csv(sources)

    if keyword and keyword.strip():
        regex = {"$regex": _escape_keyword(keyword), "$options": "i"}
        and_clauses.append(
            {
                "$or": [
                    {"event_type": regex},
                    {"threat_level": regex},
                    {"reasoning": regex},
                    {"extracted_data.extracted_data.reasoning": regex},
                ]
            }
        )

    if parsed_event_types:
        and_clauses.append({"event_type": {"$in": parsed_event_types}})

    if parsed_threat_levels:
        and_clauses.append({"threat_level": {"$in": parsed_threat_levels}})

    if has_linked_article is True:
        and_clauses.append({"article_id": {"$exists": True, "$ne": None}})
    elif has_linked_article is False:
        and_clauses.append({"$or": [{"article_id": {"$exists": False}}, {"article_id": None}]})

    if date_from or date_to:
        range_query: dict[str, Any] = {}
        start_dt = _parse_iso_datetime(date_from) if date_from else None
        end_dt = _parse_iso_datetime(date_to) if date_to else None
        if start_dt:
            range_query["$gte"] = start_dt.isoformat()
        if end_dt:
            range_query["$lte"] = end_dt.isoformat()
        if range_query:
            and_clauses.append({"enriched_at": range_query})

    if parsed_sources:
        article_ids = await _resolve_source_article_ids(db, parsed_sources)
        and_clauses.append(
            {"article_id": {"$in": article_ids or [ObjectId("000000000000000000000000")]}}
        )

    if and_clauses:
        query["$and"] = and_clauses

    return query


async def fetch_events(
    db, query: dict[str, Any], *, page: int, page_size: int, sort: str
) -> dict[str, Any]:
    events = db.get_collection("world_monitor_events")
    skip = max(page - 1, 0) * page_size
    cursor = events.find(query).sort(_sort_spec(sort)).skip(skip).limit(page_size)
    documents = await cursor.to_list(length=page_size)
    total = await events.count_documents(query)
    return {"documents": documents, "total": total}


async def fetch_map_events(db, query: dict[str, Any]) -> list[dict[str, Any]]:
    events = db.get_collection("world_monitor_events")
    cursor = events.find(
        query,
        {
            "_id": 1,
            "event_id": 1,
            "event_type": 1,
            "threat_level": 1,
            "summary": 1,
            "reasoning": 1,
            "relevance_score": 1,
            "enriched_at": 1,
            "location": 1,
            "extracted_data": 1,
        },
    ).sort(_sort_spec("latest"))
    return await cursor.to_list(length=None)


async def fetch_event_by_id(db, event_id: str) -> dict[str, Any] | None:
    events = db.get_collection("world_monitor_events")
    doc = None
    if ObjectId.is_valid(event_id):
        doc = await events.find_one({"_id": ObjectId(event_id)})
    if doc:
        return doc
    return await events.find_one({"event_id": event_id})


async def fetch_article_by_id(db, article_id: str) -> dict[str, Any] | None:
    articles = db.get_collection("world_monitor_articles")
    if ObjectId.is_valid(article_id):
        return await articles.find_one({"_id": ObjectId(article_id)})
    return await articles.find_one({"article_id": article_id})


async def fetch_articles(
    db,
    *,
    search: str | None,
    source: str | None,
    processing_status: str | None,
    page: int,
    page_size: int,
    sort: str,
) -> dict[str, Any]:
    articles = db.get_collection("world_monitor_articles")
    query: dict[str, Any] = {}
    and_clauses: list[dict[str, Any]] = []

    if search and search.strip():
        regex = {"$regex": _escape_keyword(search), "$options": "i"}
        and_clauses.append(
            {
                "$or": [
                    {"title": regex},
                    {"summary": regex},
                    {"source": regex},
                    {"author": regex},
                ]
            }
        )

    if source:
        and_clauses.append({"source": source})

    if processing_status:
        and_clauses.append({"processing_status": processing_status})

    if and_clauses:
        query["$and"] = and_clauses

    sort_spec = (
        [("published", -1), ("_id", -1)]
        if sort != "oldest"
        else [("published", 1), ("_id", 1)]
    )
    skip = max(page - 1, 0) * page_size
    cursor = articles.find(query).sort(sort_spec).skip(skip).limit(page_size)
    documents = await cursor.to_list(length=page_size)
    total = await articles.count_documents(query)
    return {"documents": documents, "total": total}


async def fetch_articles_by_ids(
    db, article_ids: Iterable[Any]
) -> dict[str, dict[str, Any]]:
    normalized_ids = [aid for aid in article_ids if aid is not None]
    if not normalized_ids:
        return {}
    articles = db.get_collection("world_monitor_articles")
    docs = await articles.find({"_id": {"$in": list(normalized_ids)}}).to_list(length=None)
    return {str(doc["_id"]): doc for doc in docs}


async def fetch_events_by_article_ids(
    db, article_ids: Iterable[Any]
) -> dict[str, list[dict[str, Any]]]:
    normalized_ids = [aid for aid in article_ids if aid is not None]
    if not normalized_ids:
        return {}
    events = db.get_collection("world_monitor_events")
    docs = await events.find({"article_id": {"$in": list(normalized_ids)}}).to_list(length=None)
    grouped: dict[str, list[dict[str, Any]]] = {}
    for doc in docs:
        grouped.setdefault(str(doc.get("article_id")), []).append(doc)
    return grouped


async def fetch_recent_events(db, limit: int = 8) -> list[dict[str, Any]]:
    events = db.get_collection("world_monitor_events")
    cursor = events.find({}).sort([("enriched_at", -1), ("_id", -1)]).limit(limit)
    return await cursor.to_list(length=limit)


async def fetch_all_events(db) -> list[dict[str, Any]]:
    events = db.get_collection("world_monitor_events")
    return await events.find({}).to_list(length=None)


async def fetch_today_article_count(db) -> int:
    articles = db.get_collection("world_monitor_articles")
    now = datetime.now(UTC)
    start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    end = start.replace(hour=23, minute=59, second=59, microsecond=999999)
    return await articles.count_documents({"ingested_at": {"$gte": start, "$lte": end}})
