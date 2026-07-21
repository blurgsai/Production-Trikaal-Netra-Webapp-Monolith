"""Compound events feature — Layer 2 (models + mappers).

Domain models matching the frontend eventTable contract for compound configs and
computed instances (see frontend/src/features/eventTable/api/types.ts), plus the
mappers that translate raw Mongo docs / computed instances into them.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from src.shared.serialization import serialize_datetime

# Severity ranking — dict gives O(1) rank lookup.
SEVERITY_RANK = {"info": 0, "low": 1, "warning": 2, "medium": 3, "high": 4, "critical": 5}


def highest_severity(events: list[dict]) -> str:
    """Highest severity label across a list of atomic events."""
    return max(
        (ev.get("severity", "info") for ev in events),
        key=lambda s: SEVERITY_RANK.get(s, 0),
        default="info",
    )


# ── Domain models ────────────────────────────────────────────────────────────────


class CompoundConfigItem(BaseModel):
    id: str
    type: str | None = None
    constituent_types: list[str] = Field(default_factory=list)
    description: str | None = None
    severity: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    timestamp: str | None = None
    compound: bool = True


class CompoundConfigListResponse(BaseModel):
    # Envelope key is "events" (not "configs") to match the shared frontend list type.
    events: list[CompoundConfigItem]
    total: int
    limit: int
    offset: int


class CompoundInstanceItem(BaseModel):
    id: str
    config_id: str
    config_name: str
    constituent_types: list[str] = Field(default_factory=list)
    vessels_involved: list[str] = Field(default_factory=list)
    start_time: str | None = None
    end_time: str | None = None
    severity: str
    # Maps constituent event type -> atomic event ObjectId; used by playback navigation.
    constituent_events: dict[str, str] = Field(default_factory=dict)
    compound: bool = True


class CompoundInstanceListResponse(BaseModel):
    instances: list[CompoundInstanceItem]
    total: int
    limit: int
    offset: int


# ── Mappers ──────────────────────────────────────────────────────────────────────


def serialize_config(doc: dict) -> CompoundConfigItem:
    return CompoundConfigItem(
        id=str(doc["_id"]),
        type=doc.get("type"),
        constituent_types=doc.get("constituent_types", []),
        description=doc.get("description"),
        severity=doc.get("severity"),
        start_time=serialize_datetime(doc.get("start_time")),
        end_time=serialize_datetime(doc.get("end_time")),
        timestamp=serialize_datetime(doc.get("timestamp")),
        compound=True,
    )


def _constituent_event_map(events: list[dict]) -> dict[str, str]:
    """Map each event's type to its ObjectId. On a duplicate type, suffix the id fragment
    so no entry is lost."""
    mapping: dict[str, str] = {}
    for ev in events:
        event_id = str(ev["_id"])
        ev_type = str(ev.get("type") or f"unknown_{event_id[:6]}")
        if ev_type in mapping:
            ev_type = f"{ev_type}_{event_id[:6]}"
        mapping[ev_type] = event_id
    return mapping


def serialize_instance(
    events: list[dict],
    *,
    overlap_start: datetime | None,
    overlap_end: datetime | None,
    config_id: str,
    config_name: str,
    constituent_types: list[str],
) -> CompoundInstanceItem:
    """Serialize one computed compound instance.

    The virtual id joins the constituent event ObjectIds with '__' — the same id
    the (Phase 2) playback endpoint will split to reconstruct the instance.
    `overlap_end` is None when the compound is still ongoing.
    """
    virtual_id = "__".join(str(ev["_id"]) for ev in events)

    seen: set[str] = set()
    vessels: list[str] = []
    for ev in events:
        for vessel_id in ev.get("vessels_involved", []):
            vid = str(vessel_id)
            if vid not in seen:
                seen.add(vid)
                vessels.append(vid)

    return CompoundInstanceItem(
        id=virtual_id,
        config_id=config_id,
        config_name=config_name,
        constituent_types=constituent_types,
        vessels_involved=vessels,
        start_time=serialize_datetime(overlap_start),
        end_time=serialize_datetime(overlap_end),
        severity=highest_severity(events),
        constituent_events=_constituent_event_map(events),
        compound=True,
    )
