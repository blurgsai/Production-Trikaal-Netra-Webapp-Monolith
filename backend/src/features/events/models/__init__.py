"""Events feature — Layer 2 (models + mapper).

Domain models designed for the frontend eventTable contract (see
frontend/src/features/eventTable/api/types.ts), plus the ONLY mapper that
translates raw MongoDB event documents into them.

The nested `information` blob is deliberately NOT surfaced here — the table never
renders it, and its per-event-type shape belongs to the playback feature (Phase 2).
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from src.shared.serialization import serialize_datetime

# ── Domain models ────────────────────────────────────────────────────────────────


class EventListItem(BaseModel):
    id: str
    type: str | None = None
    severity: str | None = None
    status: str | None = None
    timestamp: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    vessels_involved: list[str] = Field(default_factory=list)
    location: Any = None
    temporality: str | None = None
    event_source: str | None = None
    model: str | None = None
    # Atomic events are never compound; kept so the frontend's unified row type
    # (EventApiResponse) is satisfied by both atomic and compound sources.
    compound: bool = False
    constituent_types: list[str] = Field(default_factory=list)


class EventListResponse(BaseModel):
    events: list[EventListItem]
    total: int
    limit: int
    offset: int


class MetadataColumn(BaseModel):
    field: str
    label: str
    type: str  # "string" | "number" | "timestamp" | "boolean"
    filterable: bool = True
    unique_values: list[Any] = Field(default_factory=list)


class EventMetadataResponse(BaseModel):
    columns: list[MetadataColumn]


class MetadataValueResponse(BaseModel):
    field: str
    values: list[str]
    count: int


# ── Mapper (the only place that touches raw Mongo docs) ──────────────────────────


def map_event_from_doc(doc: dict) -> EventListItem:
    return EventListItem(
        id=str(doc.get("_id")),
        type=doc.get("type"),
        severity=doc.get("severity"),
        status=doc.get("status"),
        timestamp=serialize_datetime(doc.get("timestamp")),
        start_time=serialize_datetime(doc.get("start_time")),
        end_time=serialize_datetime(doc.get("end_time")),
        vessels_involved=[str(v) for v in doc.get("vessels_involved", [])],
        location=doc.get("location"),
        temporality=doc.get("temporality"),
        event_source=doc.get("event_source"),
        model=doc.get("model"),
        compound=False,
        constituent_types=[],
    )


def map_metadata_columns(schema: dict[str, str]) -> list[MetadataColumn]:
    columns: list[MetadataColumn] = []
    for field_name in sorted(schema.keys()):
        field_type = schema[field_name]
        normalized_type = field_type[:-2] if field_type.endswith("[]") else field_type
        columns.append(
            MetadataColumn(
                field=field_name,
                label=field_name.replace("_", " ").replace(".", " ").title(),
                type=normalized_type,
                filterable=True,
                unique_values=[],
            )
        )
    return columns
