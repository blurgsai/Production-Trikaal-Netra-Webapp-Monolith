from __future__ import annotations

from datetime import UTC, datetime, timezone
from typing import Any

from src.features.world_monitor.clients import (
    build_event_query,
    build_pagination,
    fetch_all_events,
    fetch_article_by_id,
    fetch_articles,
    fetch_articles_by_ids,
    fetch_event_by_id,
    fetch_events,
    fetch_events_by_article_ids,
    fetch_map_events,
    fetch_metadata,
    fetch_recent_events,
    fetch_today_article_count,
)
from src.features.world_monitor.models import (
    SEVERITY_ORDER,
    _clean_text,
    _extract_reasoning,
    _extract_threat_level,
    _primary_location_name,
    _stringify_datetime,
    map_article_from_doc,
    map_article_preview_from_doc,
    map_event_from_doc,
    map_map_markers_from_doc,
)
from src.shared.errors import NotFoundError

SORT_OPTIONS = [
    {"value": "latest", "label": "Latest"},
    {"value": "oldest", "label": "Oldest"},
]


async def get_metadata(db) -> dict[str, Any]:
    metadata = await fetch_metadata(db)
    metadata["sort_options"] = SORT_OPTIONS
    return metadata


async def get_event_list(db, **filters: Any) -> dict[str, Any]:
    query = await build_event_query(
        db,
        keyword=filters.get("keyword"),
        event_types=filters.get("event_types"),
        threat_levels=filters.get("threat_levels"),
        sources=filters.get("sources"),
        date_from=filters.get("date_from"),
        date_to=filters.get("date_to"),
        has_linked_article=filters.get("has_linked_article"),
        relevance_score_from=filters.get("relevance_score_from"),
        relevance_score_to=filters.get("relevance_score_to"),
        extracted_data_location=filters.get("extracted_data_location"),
        extracted_data_vessel_name=filters.get("extracted_data_vessel_name"),
        extracted_data_threat_type=filters.get("extracted_data_threat_type"),
        extracted_data_origin=filters.get("extracted_data_origin"),
        extracted_data_damage=filters.get("extracted_data_damage"),
        extracted_data_countermeasures=filters.get("extracted_data_countermeasures"),
        location_name=filters.get("location_name"),
    )
    result = await fetch_events(
        db,
        query,
        page=filters["page"],
        page_size=filters["page_size"],
        sort=filters["sort"],
    )
    article_map = await fetch_articles_by_ids(
        db, [doc.get("article_id") for doc in result["documents"]]
    )
    data = [
        map_event_from_doc(doc, article_map.get(str(doc.get("article_id"))))
        for doc in result["documents"]
    ]
    return {
        "data": data,
        "pagination": build_pagination(
            page=filters["page"],
            page_size=filters["page_size"],
            total=result["total"],
        ),
    }


async def get_map_data(db, **filters: Any) -> dict[str, Any]:
    query = await build_event_query(
        db,
        keyword=filters.get("keyword"),
        event_types=filters.get("event_types"),
        threat_levels=filters.get("threat_levels"),
        sources=filters.get("sources"),
        date_from=filters.get("date_from"),
        date_to=filters.get("date_to"),
        has_linked_article=filters.get("has_linked_article"),
    )
    documents = await fetch_map_events(db, query)
    markers: list[dict[str, Any]] = []
    for doc in documents:
        markers.extend(map_map_markers_from_doc(doc))
    return {
        "data": markers,
        "total_events": len(documents),
        "total_markers": len(markers),
    }


async def get_event_detail(db, event_id: str) -> dict[str, Any] | None:
    event_doc = await fetch_event_by_id(db, event_id)
    if not event_doc:
        return None
    article_doc = None
    if event_doc.get("article_id") is not None:
        article_doc = await fetch_article_by_id(db, str(event_doc["article_id"]))
    return map_event_from_doc(event_doc, article_doc, include_structured_fields=True)


async def get_article_list(db, **filters: Any) -> dict[str, Any]:
    result = await fetch_articles(
        db,
        search=filters.get("search"),
        source=filters.get("source"),
        processing_status=filters.get("processing_status"),
        title=filters.get("title"),
        author=filters.get("author"),
        source_type=filters.get("source_type"),
        published_from=filters.get("published_from"),
        published_to=filters.get("published_to"),
        ingested_from=filters.get("ingested_from"),
        ingested_to=filters.get("ingested_to"),
        updated_from=filters.get("updated_from"),
        updated_to=filters.get("updated_to"),
        tags=filters.get("tags"),
        location_name=filters.get("location_name"),
        page=filters["page"],
        page_size=filters["page_size"],
        sort=filters["sort"],
    )
    events_by_article = await fetch_events_by_article_ids(
        db, [doc["_id"] for doc in result["documents"]]
    )
    data = [
        map_article_from_doc(
            doc,
            events_by_article.get(str(doc["_id"]), []),
            include_linked_events=False,
        )
        for doc in result["documents"]
    ]
    return {
        "data": data,
        "pagination": build_pagination(
            page=filters["page"],
            page_size=filters["page_size"],
            total=result["total"],
        ),
    }


async def get_article_detail(db, article_id: str) -> dict[str, Any] | None:
    article_doc = await fetch_article_by_id(db, article_id)
    if not article_doc:
        return None
    events_by_article = await fetch_events_by_article_ids(db, [article_doc["_id"]])
    return map_article_from_doc(
        article_doc,
        events_by_article.get(str(article_doc["_id"]), []),
        include_linked_events=True,
    )


async def get_overview_summary(db) -> dict[str, Any]:
    events = await fetch_all_events(db)
    now = datetime.now(UTC)
    last_24h_ts = now.timestamp() - 86400

    active_events = len(events)
    critical_high_events = 0
    new_events_last_24h = 0
    region_names: set[str] = set()
    primary_area_names: set[str] = set()
    review_required_events = 0
    linked_article_events = 0

    for event in events:
        threat_level = _extract_threat_level(event)
        if SEVERITY_ORDER.get(threat_level, 0) >= SEVERITY_ORDER["HIGH"]:
            critical_high_events += 1

        if event.get("article_id") is not None:
            linked_article_events += 1

        if (
            event.get("relevance_score") is None
            or not _clean_text(event.get("summary"))
            or not _extract_reasoning(event)
        ):
            review_required_events += 1

        primary_location_name = _primary_location_name(event)
        if primary_location_name:
            primary_area_names.add(primary_location_name)

        enriched_at = event.get("enriched_at")
        if isinstance(enriched_at, str):
            try:
                enriched_dt = datetime.fromisoformat(enriched_at.replace("Z", "+00:00"))
            except ValueError:
                enriched_dt = None
        elif isinstance(enriched_at, datetime):
            enriched_dt = enriched_at
        else:
            enriched_dt = None

        if enriched_dt:
            if enriched_dt.tzinfo is None:
                enriched_dt = enriched_dt.replace(tzinfo=UTC)
            if enriched_dt.timestamp() >= last_24h_ts:
                new_events_last_24h += 1

        for location in event.get("location") or []:
            name = (location or {}).get("name")
            if name:
                region_names.add(name)

    return {
        "active_events": active_events,
        "critical_high_events": critical_high_events,
        "new_events_last_24h": new_events_last_24h,
        "distinct_regions": len(region_names),
        "articles_ingested_today": await fetch_today_article_count(db),
        "active_areas": len(primary_area_names),
        "review_required_events": review_required_events,
        "linked_article_events": linked_article_events,
        "avg_enrichment_lag_hours": None,
    }


async def get_overview_recent(db, limit: int = 8) -> list[dict[str, Any]]:
    docs = await fetch_recent_events(db, limit=limit)
    article_map = await fetch_articles_by_ids(
        db, [doc.get("article_id") for doc in docs]
    )
    return [
        map_event_from_doc(doc, article_map.get(str(doc.get("article_id"))))
        for doc in docs
    ]


async def get_overview_distributions(db, source_limit: int = 8) -> dict[str, Any]:
    docs = await fetch_all_events(db)
    article_map = await fetch_articles_by_ids(
        db, [doc.get("article_id") for doc in docs]
    )

    severity_counts: dict[str, int] = {
        "LOW": 0,
        "MEDIUM": 0,
        "HIGH": 0,
        "CRITICAL": 0,
    }
    event_type_counts: dict[str, int] = {}
    source_counts: dict[str, int] = {}

    for doc in docs:
        threat_level = _extract_threat_level(doc)
        severity_counts[threat_level] = severity_counts.get(threat_level, 0) + 1

        event_type = _clean_text(doc.get("event_type")) or "UnknownEvent"
        event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1

        article_doc = article_map.get(str(doc.get("article_id")))
        source = _clean_text((article_doc or {}).get("source")) or "Unknown Source"
        source_counts[source] = source_counts.get(source, 0) + 1

    severity = [
        {"key": key, "label": key.title(), "value": value}
        for key, value in severity_counts.items()
    ]
    event_types = sorted(
        (
            {"key": key, "label": key, "value": value}
            for key, value in event_type_counts.items()
        ),
        key=lambda item: item["value"],
        reverse=True,
    )[:8]
    sources = sorted(
        (
            {"key": key, "label": key, "value": value}
            for key, value in source_counts.items()
        ),
        key=lambda item: item["value"],
        reverse=True,
    )[:source_limit]

    return {
        "severity": severity,
        "event_types": event_types,
        "sources": sources,
    }


async def get_overview_hotspots(db, limit: int = 8) -> list[dict[str, Any]]:
    docs = await fetch_all_events(db)
    hotspot_map: dict[str, dict[str, Any]] = {}
    for doc in docs:
        threat_level = _extract_threat_level(doc)
        primary_location_name = _primary_location_name(doc)
        if not primary_location_name:
            continue

        bucket = hotspot_map.setdefault(
            primary_location_name,
            {
                "event_count": 0,
                "critical_high_count": 0,
                "event_type_counts": {},
                "last_seen": None,
            },
        )
        bucket["event_count"] += 1
        if SEVERITY_ORDER.get(threat_level, 0) >= SEVERITY_ORDER["HIGH"]:
            bucket["critical_high_count"] += 1

        event_type = _clean_text(doc.get("event_type")) or "UnknownEvent"
        bucket["event_type_counts"][event_type] = (
            bucket["event_type_counts"].get(event_type, 0) + 1
        )

        enriched_at = _stringify_datetime(doc.get("enriched_at"))
        if enriched_at and (
            bucket["last_seen"] is None or enriched_at > bucket["last_seen"]
        ):
            bucket["last_seen"] = enriched_at

    hotspots = sorted(
        (
            {
                "location_name": name,
                "event_count": counts["event_count"],
                "critical_high_count": counts["critical_high_count"],
                "dominant_event_type": max(
                    counts["event_type_counts"].items(),
                    key=lambda item: item[1],
                )[0]
                if counts["event_type_counts"]
                else None,
                "last_seen": counts["last_seen"],
            }
            for name, counts in hotspot_map.items()
        ),
        key=lambda item: (item["critical_high_count"], item["event_count"]),
        reverse=True,
    )
    return hotspots[:limit]


async def get_overview_trends(db, days: int = 7) -> list[dict[str, Any]]:
    docs = await fetch_all_events(db)
    buckets: dict[str, dict[str, int]] = {}

    for doc in docs:
        enriched_at = doc.get("enriched_at")
        if isinstance(enriched_at, datetime):
            key = enriched_at.date().isoformat()
        elif isinstance(enriched_at, str):
            key = enriched_at[:10]
        else:
            continue

        bucket = buckets.setdefault(
            key, {"bucket": key, "total_events": 0, "critical_high_events": 0}
        )
        bucket["total_events"] += 1
        if SEVERITY_ORDER.get(_extract_threat_level(doc), 0) >= SEVERITY_ORDER["HIGH"]:
            bucket["critical_high_events"] += 1

    return sorted(buckets.values(), key=lambda item: item["bucket"])[-days:]
