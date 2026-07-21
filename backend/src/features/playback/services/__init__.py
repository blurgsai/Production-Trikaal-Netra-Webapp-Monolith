"""Playback feature — Layer 3 (services).

Orchestrates a playback response: load the event(s) from MongoDB, compute the AIS
time window (with a context buffer), fetch vessel trajectories from ClickHouse, and
enrich with polygon/port geometry. Independent of FastAPI.
"""
from __future__ import annotations

from typing import Any

from src.features.playback.clients import (
    TRAJECTORY_BUFFER_MS,
    fetch_event_by_id,
    fetch_events_by_ids,
    fetch_polygon_by_id,
    fetch_port_by_id,
    fetch_trajectories,
)
from src.features.playback.models import (
    CompoundEventInformation,
    EventDetails,
    PlaybackResponse,
    TimeWindow,
    map_event_details,
    map_geofence_polygon,
    map_port_polygon,
)
from src.shared.errors import NotFoundError, ValidationError
from src.shared.serialization import dt_to_ms, serialize_datetime, to_utc

# Severity ranking for compound merge (highest wins).
SEVERITY_RANK = {"info": 0, "low": 1, "warning": 2, "medium": 3, "high": 4, "critical": 5}

# Event types whose zone geometry is fetched from a separate collection.
GEOFENCE_TYPES = {"geofence_intrusion"}
PORT_TYPES = {"port_intrusion", "dark_after_departure"}


def _window(event_start_ms: int | None, event_end_ms: int | None) -> tuple[int | None, int | None]:
    """AIS query window: event window padded by the context buffer on each side."""
    if event_start_ms is None:
        return None, None
    query_start = event_start_ms - TRAJECTORY_BUFFER_MS
    query_end = event_end_ms + TRAJECTORY_BUFFER_MS if event_end_ms else None
    return query_start, query_end


async def _enrich_zone(db, event_doc: dict, response_extras: dict[str, Any]) -> None:
    """Attach geofence_polygon / port_polygon (top-level) based on event type."""
    event_type = event_doc.get("type")
    info = event_doc.get("information") or {}

    if event_type in GEOFENCE_TYPES and info.get("geofence_id") is not None:
        polygon = await fetch_polygon_by_id(db, info["geofence_id"])
        if polygon:
            response_extras["geofence_polygon"] = map_geofence_polygon(polygon, info["geofence_id"])
    elif event_type in PORT_TYPES and info.get("port_id") is not None:
        port = await fetch_port_by_id(db, info["port_id"])
        if port:
            response_extras["port_polygon"] = map_port_polygon(port, info["port_id"])


async def get_atomic_playback(db, ch_client, event_id: str) -> PlaybackResponse:
    event = await fetch_event_by_id(db, event_id)
    if not event:
        raise NotFoundError("Event", event_id)

    event_start_ms = dt_to_ms(event.get("start_time"))
    event_end_ms = dt_to_ms(event.get("end_time"))
    query_start_ms, query_end_ms = _window(event_start_ms, event_end_ms)

    trajectories = await fetch_trajectories(
        ch_client, event.get("vessels_involved", []), query_start_ms, query_end_ms
    )

    extras: dict[str, Any] = {}
    await _enrich_zone(db, event, extras)

    return PlaybackResponse(
        event_details=map_event_details(event),
        trajectories=trajectories,
        time_window=TimeWindow(
            query_start=query_start_ms,
            query_end=query_end_ms,
            event_start=event_start_ms,
            event_end=event_end_ms,
            buffer_hours=TRAJECTORY_BUFFER_MS // (60 * 60 * 1000),
        ),
        **extras,
    )


def _highest_severity(events: list[dict]) -> str:
    return max(
        (ev.get("severity", "info") for ev in events),
        key=lambda s: SEVERITY_RANK.get(s, 0),
        default="info",
    )


async def get_compound_playback(db, ch_client, virtual_id: str) -> PlaybackResponse:
    event_ids = [p.strip() for p in virtual_id.split("__") if p.strip()]
    if len(event_ids) < 2:
        raise ValidationError(f"Invalid compound id format: '{virtual_id}'")

    events = await fetch_events_by_ids(db, event_ids)
    if not events:
        raise NotFoundError("Compound event", virtual_id)

    starts = [to_utc(ev.get("start_time")) for ev in events if ev.get("start_time")]
    ends = [to_utc(ev.get("end_time")) for ev in events if ev.get("end_time")]
    event_start = min(starts) if starts else None
    # Only bound the end if every constituent event has one, else it's still ongoing.
    event_end = max(ends) if ends and len(ends) == len(events) else None

    event_start_ms = dt_to_ms(event_start)
    event_end_ms = dt_to_ms(event_end)
    query_start_ms, query_end_ms = _window(event_start_ms, event_end_ms)

    all_vessels: list[str] = []
    seen: set[str] = set()
    for ev in events:
        for vid in ev.get("vessels_involved", []):
            s = str(vid)
            if s not in seen:
                seen.add(s)
                all_vessels.append(s)

    trajectories = await fetch_trajectories(ch_client, all_vessels, query_start_ms, query_end_ms)

    constituent_types = [ev.get("type") for ev in events]
    compound_type = "+".join(dict.fromkeys(t for t in constituent_types if t))
    location = next((ev.get("location") for ev in events if ev.get("location")), None)

    details = EventDetails(
        type=compound_type,
        location=location,
        start_time=serialize_datetime(event_start),
        end_time=serialize_datetime(event_end),
        vessels_involved=all_vessels,
        severity=_highest_severity(events),
        constituent_types=[t for t in constituent_types if t],
        # Map each constituent event's id -> its type, for the frontend to resolve.
        information=CompoundEventInformation(
            constituent_events={str(ev["_id"]): ev.get("type") for ev in events}
        ),
    )

    return PlaybackResponse(
        event_details=details,
        trajectories=trajectories,
        time_window=TimeWindow(
            query_start=query_start_ms,
            query_end=query_end_ms,
            event_start=event_start_ms,
            event_end=event_end_ms,
            buffer_hours=TRAJECTORY_BUFFER_MS // (60 * 60 * 1000),
        ),
    )
