"""Compound events feature — Layer 3 (services).

Business logic: list admin-created configs, and compute compound instances on
demand. An instance is one vessel that has overlapping events of ALL of a config's
constituent types within its time window. Nothing is stored.
"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timezone

from src.features.compound_events.clients import (
    count_configs,
    fetch_config_by_id,
    fetch_configs,
    fetch_events_in_window,
)
from src.features.compound_events.models import (
    CompoundConfigListResponse,
    CompoundInstanceItem,
    CompoundInstanceListResponse,
    serialize_config,
    serialize_instance,
)
from src.shared.errors import NotFoundError, ValidationError
from src.shared.serialization import to_utc

# Sentinel end for events with no end_time (treated as still ongoing).
FAR_FUTURE = datetime(9999, 12, 31, tzinfo=UTC)


def overlap_seconds(ev_a: dict, ev_b: dict) -> float:
    """Seconds two events share (unclamped): >0 genuine overlap, 0 boundary touch,
    <0 disjoint."""
    start_a = to_utc(ev_a.get("start_time"))
    start_b = to_utc(ev_b.get("start_time"))
    if start_a is None or start_b is None:
        return -1.0
    end_a = to_utc(ev_a.get("end_time")) or FAR_FUTURE
    end_b = to_utc(ev_b.get("end_time")) or FAR_FUTURE
    return (min(end_a, end_b) - max(start_a, start_b)).total_seconds()


async def list_compound_configs(
    db, *, limit: int, offset: int, q: str | None = None
) -> CompoundConfigListResponse:
    query = {"type": {"$regex": q.strip(), "$options": "i"}} if q and q.strip() else {}
    total = await count_configs(db, query)
    docs = await fetch_configs(db, query, limit=limit, offset=offset)
    return CompoundConfigListResponse(
        events=[serialize_config(doc) for doc in docs],
        total=total,
        limit=limit,
        offset=offset,
    )


async def compute_instances(
    db, config_id: str, *, limit: int, offset: int, q: str | None = None
) -> CompoundInstanceListResponse:
    config = await fetch_config_by_id(db, config_id)
    if not config:
        raise NotFoundError("Compound config", config_id)

    constituent_types = config.get("constituent_types", [])
    if len(constituent_types) < 2:
        raise ValidationError("Config must have at least 2 constituent_types")

    config_name = config.get("type") or "+".join(constituent_types)
    window_start = to_utc(config.get("start_time"))
    window_end = to_utc(config.get("end_time"))
    if window_start is None or window_end is None:
        raise ValidationError("Config is missing start_time or end_time")

    # Fetch events of every constituent type concurrently.
    results = await asyncio.gather(
        *[fetch_events_in_window(db, t, window_start, window_end) for t in constituent_types]
    )
    events_by_type = dict(zip(constituent_types, results, strict=True))

    # Group events by vessel: { vessel_id -> { event_type -> [event, ...] } }.
    vessel_map: dict[str, dict[str, list]] = {}
    for ev_type, events in events_by_type.items():
        for ev in events:
            for vessel_id in ev.get("vessels_involved", []):
                vessel_map.setdefault(str(vessel_id), {}).setdefault(ev_type, []).append(ev)

    instances: list[CompoundInstanceItem] = []
    for vessel_id, type_map in vessel_map.items():
        # Vessel must have at least one event of every constituent type.
        if not all(t in type_map for t in constituent_types):
            continue
        if q and q.lower() not in vessel_id.lower():
            continue

        best = _best_combination(type_map, constituent_types)
        if best is None:
            continue

        selected, overlap_start, overlap_end = best
        instances.append(
            serialize_instance(
                selected,
                overlap_start=overlap_start,
                overlap_end=None if overlap_end == FAR_FUTURE else overlap_end,
                config_id=config_id,
                config_name=config_name,
                constituent_types=constituent_types,
            )
        )

    # Newest-first by start time.
    instances.sort(key=lambda inst: inst.start_time or "", reverse=True)

    total = len(instances)
    return CompoundInstanceListResponse(
        instances=instances[offset : offset + limit],
        total=total,
        limit=limit,
        offset=offset,
    )


def _best_combination(
    type_map: dict[str, list],
    constituent_types: list[str],
) -> tuple[list[dict], datetime, datetime] | None:
    """Pick the combination of one event per type with the longest common overlap.

    Try each event of the first type as an anchor; for every other type pick the
    best-overlapping event. Keep the combination whose shared window is longest.
    Returns (selected_events, overlap_start, overlap_end) or None if no vessel
    combination shares a common window.
    """
    best: tuple[list[dict], datetime, datetime, float] | None = None

    for anchor in type_map[constituent_types[0]]:
        selected = [anchor]
        valid = True

        for other_type in constituent_types[1:]:
            scored = [(overlap_seconds(anchor, ev), ev) for ev in type_map[other_type]]
            qualifying = [(score, ev) for score, ev in scored if score >= 0]
            if not qualifying:
                valid = False
                break
            _, best_ev = max(qualifying, key=lambda pair: pair[0])
            selected.append(best_ev)

        if not valid:
            continue

        overlap_start = max(
            to_utc(ev["start_time"]) for ev in selected if ev.get("start_time")
        )
        overlap_end = min(to_utc(ev.get("end_time")) or FAR_FUTURE for ev in selected)
        duration = (overlap_end - overlap_start).total_seconds()

        # All N events must actually share a common window (anchor-pairwise overlap
        # doesn't guarantee mutual overlap).
        if duration >= 0 and (best is None or duration > best[3]):
            best = (selected, overlap_start, overlap_end, duration)

    if best is None:
        return None
    selected, overlap_start, overlap_end, _ = best
    return selected, overlap_start, overlap_end
