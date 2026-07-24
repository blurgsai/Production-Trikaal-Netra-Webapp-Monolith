from __future__ import annotations

import difflib
import re
from collections.abc import Iterable
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ── Domain models (designed for API consumers, not MongoDB shapes) ──


class WorldMonitorLocation(BaseModel):
    name: str
    lat: float
    lng: float
    role: str = "mentioned"


class LinkedArticlePreview(BaseModel):
    id: str
    external_article_id: str | None = None
    title: str
    source: str | None = None
    source_type: str | None = None
    author: str | None = None
    published: str | None = None
    summary: str | None = None
    image_url: str | None = None
    processed_content: str | None = None
    raw_content: str | None = None
    tags: list[str] = Field(default_factory=list)
    locations: list[WorldMonitorLocation] = Field(default_factory=list)
    link: str | None = None


class WorldMonitorEventListItem(BaseModel):
    id: str
    event_id: str | None = None
    title: str
    event_type: str
    threat_level: str
    summary: str
    reasoning: str | None = None
    primary_location: WorldMonitorLocation | None = None
    locations: list[WorldMonitorLocation] = Field(default_factory=list)
    relevance_score: float | None = None
    enriched_at: str | None = None
    linked_article_preview: LinkedArticlePreview | None = None


class WorldMonitorMapMarker(BaseModel):
    marker_id: str
    event_id: str
    title: str
    event_type: str
    threat_level: str
    relevance_score: float | None = None
    enriched_at: str | None = None
    location: WorldMonitorLocation


class StructuredField(BaseModel):
    key: str
    label: str
    value: Any


class WorldMonitorEventDetail(WorldMonitorEventListItem):
    structured_fields: list[StructuredField] = Field(default_factory=list)


class WorldMonitorArticleListItem(BaseModel):
    id: str
    external_article_id: str | None = None
    title: str
    source: str | None = None
    source_type: str | None = None
    author: str | None = None
    published: str | None = None
    updated: str | None = None
    ingested_at: str | None = None
    summary: str | None = None
    image_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    processing_status: str | None = None
    linked_event_count: int = 0
    location_count: int = 0
    link: str | None = None


class WorldMonitorArticleDetail(WorldMonitorArticleListItem):
    processed_content: str | None = None
    raw_content: str | None = None
    locations: list[WorldMonitorLocation] = Field(default_factory=list)
    linked_events: list[WorldMonitorEventListItem] = Field(default_factory=list)


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int


class WorldMonitorEventListResponse(BaseModel):
    success: bool = True
    data: list[WorldMonitorEventListItem]
    pagination: PaginatedResponse


class WorldMonitorMapResponse(BaseModel):
    success: bool = True
    data: list[WorldMonitorMapMarker]
    total_events: int
    total_markers: int


class WorldMonitorArticleListResponse(BaseModel):
    success: bool = True
    data: list[WorldMonitorArticleListItem]
    pagination: PaginatedResponse


class WorldMonitorMetadataResponse(BaseModel):
    success: bool = True
    event_types: list[str]
    threat_levels: list[str]
    sources: list[str]
    processing_statuses: list[str]
    sort_options: list[dict[str, str]]


class VesselSearchMatch(BaseModel):
    vessel_id: int
    ship_name: str
    mmsi: int | None = None
    score: float


class VesselSearchResponse(BaseModel):
    success: bool = True
    query: str
    matches: list[VesselSearchMatch] = Field(default_factory=list)


class OverviewSummary(BaseModel):
    active_events: int
    critical_high_events: int
    new_events_last_24h: int
    distinct_regions: int
    articles_ingested_today: int
    active_areas: int = 0
    review_required_events: int = 0
    linked_article_events: int = 0
    avg_enrichment_lag_hours: float | None = None


class OverviewTrendPoint(BaseModel):
    bucket: str
    total_events: int
    critical_high_events: int


class OverviewDistributionItem(BaseModel):
    key: str
    label: str
    value: int


class OverviewDistributionsResponse(BaseModel):
    severity: list[OverviewDistributionItem]
    event_types: list[OverviewDistributionItem]
    sources: list[OverviewDistributionItem]


class OverviewHotspot(BaseModel):
    location_name: str
    event_count: int
    critical_high_count: int
    dominant_event_type: str | None = None
    last_seen: str | None = None


class OverviewRecentResponse(BaseModel):
    success: bool = True
    data: list[WorldMonitorEventListItem]


# ── Mappers (the ONLY place that touches both raw MongoDB docs and domain models) ──


SEVERITY_ORDER = {
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4,
}


def _stringify_id(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _clean_text(value: str | None) -> str | None:
    if not value:
        return None
    return re.sub(r"\s+", " ", value).strip()


def _iter_extracted_payloads(event_doc: dict[str, Any]) -> list[dict[str, Any]]:
    """Yield extracted_data payload dicts from either document shape.

    Some events store extracted_data as a list of wrapper dicts:
        [{extracted_data: {vessel_name: ...}}, ...]
    Others store it as a plain dict:
        {vessel_name: ...}
    This normalises both into a list of payload dicts.
    """
    raw = event_doc.get("extracted_data")
    if raw is None:
        return []
    if isinstance(raw, dict):
        # Could be a direct payload or a single wrapper
        if "extracted_data" in raw and isinstance(raw["extracted_data"], dict):
            return [raw["extracted_data"]]
        return [raw]
    if isinstance(raw, list):
        payloads: list[dict[str, Any]] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            nested = item.get("extracted_data")
            if isinstance(nested, dict):
                payloads.append(nested)
            elif isinstance(item, dict) and item:
                # Item itself is the payload (no nested wrapper)
                payloads.append(item)
        return payloads
    return []


def _strip_html(value: str | None) -> str | None:
    if not value:
        return None
    no_tags = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", no_tags).strip()


def _labelize(key: str) -> str:
    return key.replace("_", " ").strip().title()


def _stringify_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _extract_reasoning(event_doc: dict[str, Any]) -> str | None:
    direct = _clean_text(event_doc.get("reasoning"))
    if direct:
        return direct
    for payload in _iter_extracted_payloads(event_doc):
        nested = _clean_text(payload.get("reasoning"))
        if nested:
            return nested
    return None


def _extract_threat_level(event_doc: dict[str, Any]) -> str:
    level = event_doc.get("threat_level")
    if isinstance(level, str) and level.strip():
        return level.strip().upper()
    for payload in _iter_extracted_payloads(event_doc):
        nested = payload.get("threat_level")
        if isinstance(nested, str) and nested.strip():
            return nested.strip().upper()
    return "MEDIUM"


def _primary_location_name(event_doc: dict[str, Any]) -> str | None:
    for payload in _iter_extracted_payloads(event_doc):
        nested_location = payload.get("location")
        if isinstance(nested_location, str) and nested_location.strip():
            return nested_location.strip()
    locations = event_doc.get("location") or []
    if locations:
        return (locations[0] or {}).get("name")
    return None


def _normalize_locations(
    raw_locations: Iterable[dict[str, Any]],
    primary_name: str | None,
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    seen: set[tuple[str, float, float]] = set()

    for location in raw_locations or []:
        geometry = (location or {}).get("geometry", {})
        coordinates = geometry.get("coordinates") or []
        if geometry.get("type") != "Point" or len(coordinates) != 2:
            continue

        lng, lat = coordinates
        if lng is None or lat is None:
            continue

        name = (location or {}).get("name") or "Unknown Location"
        key = (name, round(float(lat), 6), round(float(lng), 6))
        if key in seen:
            continue
        seen.add(key)

        role = "primary" if primary_name and name.lower() == primary_name.lower() else "mentioned"
        normalized.append(
            {
                "name": name,
                "lat": float(lat),
                "lng": float(lng),
                "role": role,
            }
        )

    if normalized and not any(loc["role"] == "primary" for loc in normalized):
        normalized[0]["role"] = "primary"

    return normalized


def _build_event_title(
    event_doc: dict[str, Any],
    primary_location: dict[str, Any] | None,
    article_preview: dict[str, Any] | None = None,
) -> str:
    explicit = _clean_text(event_doc.get("title"))
    if explicit:
        return explicit

    location_name = primary_location["name"] if primary_location else "Unknown Location"
    event_type = _clean_text(event_doc.get("event_type")) or "Threat Event"
    vessel_name = None
    threat_type = None

    for payload in _iter_extracted_payloads(event_doc):
        vessel_name = vessel_name or _clean_text(payload.get("vessel_name"))
        threat_type = threat_type or _clean_text(payload.get("threat_type"))

    if vessel_name:
        return f"{event_type} involving {vessel_name}"
    if threat_type:
        return f"{threat_type.title()} threat near {location_name}"
    if location_name:
        return f"{event_type} near {location_name}"
    if article_preview and article_preview.get("title"):
        return article_preview["title"]
    return event_type


def _build_event_summary(
    event_doc: dict[str, Any],
    article_preview: dict[str, Any] | None = None,
) -> str:
    direct_summary = _clean_text(event_doc.get("summary"))
    if direct_summary:
        return direct_summary

    for payload in _iter_extracted_payloads(event_doc):
        nested_summary = _clean_text(payload.get("summary"))
        if nested_summary:
            return nested_summary

        threat_type = _clean_text(payload.get("threat_type"))
        location = _clean_text(payload.get("location"))
        damage = _clean_text(payload.get("damage"))
        parts = [
            threat_type.title() if threat_type else None,
            f"reported near {location}" if location else None,
            damage,
        ]
        parts = [part for part in parts if part]
        if parts:
            return "; ".join(parts)

    article_summary = _clean_text((article_preview or {}).get("summary"))
    if article_summary:
        return article_summary

    reasoning = _extract_reasoning(event_doc)
    if reasoning:
        return reasoning[:220]

    return "Operational details available in the full event assessment."


def _extract_structured_fields(event_doc: dict[str, Any]) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    seen: set[str] = set()
    for payload in _iter_extracted_payloads(event_doc):
        for key, value in payload.items():
            if key in {"summary", "reasoning", "threat_level"} or value in (None, "", []):
                continue
            if key in seen:
                continue
            seen.add(key)
            fields.append({"key": key, "label": _labelize(key), "value": value})
    return fields


def map_vessel_search_matches(
    docs: list[dict[str, Any]], query: str, limit: int = 5
) -> dict[str, Any]:
    """Fuzzy-rank vessel_state candidate docs against `query` by ship name.

    Mongo only gives us a case-insensitive substring match; this ranks that
    candidate pool by similarity so the frontend can auto-pick a confident
    single match or offer a short disambiguation list.
    """
    normalized_query = query.strip().lower()
    matches: list[dict[str, Any]] = []
    for doc in docs:
        identification = doc.get("identification") or {}
        ship_name = identification.get("shipName")
        vessel_id = doc.get("vesselId")
        if not ship_name or vessel_id is None:
            continue
        normalized_ship_name = str(ship_name).strip().lower()
        ratio = difflib.SequenceMatcher(None, normalized_query, normalized_ship_name).ratio()
        # Strongly boost cases where the query is a substring of the ship name,
        # as those are usually the most relevant vessel matches.
        substring_bonus = 0.2 if normalized_query in normalized_ship_name else 0.0
        score = min(round(ratio + substring_bonus, 4), 1.0)
        matches.append(
            {
                "vessel_id": int(vessel_id),
                "ship_name": str(ship_name),
                "mmsi": identification.get("mmsi"),
                "score": score,
            }
        )
    matches.sort(key=lambda item: (-item["score"], -len(item["ship_name"])))
    return {"query": query, "matches": matches[:limit]}


def map_article_preview_from_doc(
    article_doc: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if not article_doc:
        return None
    locations = _normalize_locations(article_doc.get("location") or [], None)
    return {
        "id": str(article_doc["_id"]),
        "external_article_id": article_doc.get("article_id"),
        "title": _clean_text(article_doc.get("title")) or "Untitled Article",
        "source": _clean_text(article_doc.get("source")),
        "source_type": _clean_text(article_doc.get("source_type")),
        "author": _clean_text(article_doc.get("author")),
        "published": _stringify_datetime(article_doc.get("published")),
        "summary": _strip_html(article_doc.get("summary")),
        "image_url": article_doc.get("image_url"),
        "processed_content": _strip_html(article_doc.get("processed_content")),
        "raw_content": _strip_html(article_doc.get("raw_content")),
        "tags": [str(tag) for tag in article_doc.get("tags") or []],
        "locations": locations,
        "link": article_doc.get("link"),
    }


def map_event_from_doc(
    event_doc: dict[str, Any],
    article_doc: dict[str, Any] | None = None,
    *,
    include_structured_fields: bool = False,
) -> dict[str, Any]:
    primary_name = _primary_location_name(event_doc)
    locations = _normalize_locations(event_doc.get("location") or [], primary_name)
    primary_location = next(
        (loc for loc in locations if loc["role"] == "primary"), None
    )
    linked_article_preview = map_article_preview_from_doc(article_doc)
    normalized = {
        "id": str(event_doc["_id"]),
        "event_id": _stringify_id(event_doc.get("event_id")),
        "title": _build_event_title(event_doc, primary_location, linked_article_preview),
        "event_type": _clean_text(event_doc.get("event_type")) or "UnknownEvent",
        "threat_level": _extract_threat_level(event_doc),
        "summary": _build_event_summary(event_doc, linked_article_preview),
        "reasoning": _extract_reasoning(event_doc),
        "primary_location": primary_location,
        "locations": locations,
        "relevance_score": event_doc.get("relevance_score"),
        "enriched_at": _stringify_datetime(event_doc.get("enriched_at")),
        "linked_article_preview": linked_article_preview,
    }
    if include_structured_fields:
        normalized["structured_fields"] = _extract_structured_fields(event_doc)
    return normalized


def map_map_markers_from_doc(event_doc: dict[str, Any]) -> list[dict[str, Any]]:
    event_view = map_event_from_doc(event_doc)
    markers: list[dict[str, Any]] = []
    for index, location in enumerate(event_view["locations"]):
        markers.append(
            {
                "marker_id": f"{event_view['id']}:{index}",
                "event_id": event_view["id"],
                "title": event_view["title"],
                "event_type": event_view["event_type"],
                "threat_level": event_view["threat_level"],
                "relevance_score": event_view["relevance_score"],
                "enriched_at": event_view["enriched_at"],
                "location": location,
            }
        )
    return markers


def map_article_from_doc(
    article_doc: dict[str, Any],
    linked_events: list[dict[str, Any]],
    *,
    include_linked_events: bool,
) -> dict[str, Any]:
    locations = _normalize_locations(article_doc.get("location") or [], None)
    normalized = {
        "id": str(article_doc["_id"]),
        "external_article_id": article_doc.get("article_id"),
        "title": _clean_text(article_doc.get("title")) or "Untitled Article",
        "source": _clean_text(article_doc.get("source")),
        "source_type": _clean_text(article_doc.get("source_type")),
        "author": _clean_text(article_doc.get("author")),
        "published": _stringify_datetime(article_doc.get("published")),
        "updated": _stringify_datetime(article_doc.get("updated")),
        "ingested_at": _stringify_datetime(article_doc.get("ingested_at")),
        "summary": _strip_html(article_doc.get("summary")),
        "image_url": article_doc.get("image_url"),
        "tags": [str(tag) for tag in article_doc.get("tags") or []],
        "processing_status": article_doc.get("processing_status"),
        "linked_event_count": len(linked_events),
        "location_count": len(locations),
        "link": article_doc.get("link"),
    }

    if include_linked_events:
        normalized["processed_content"] = _strip_html(
            article_doc.get("processed_content")
        )
        normalized["raw_content"] = _strip_html(article_doc.get("raw_content"))
        normalized["locations"] = locations
        normalized["linked_events"] = [
            map_event_from_doc(event_doc) for event_doc in linked_events
        ]

    return normalized
