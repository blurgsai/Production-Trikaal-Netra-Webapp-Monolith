from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class EventTypeCount(BaseModel):
    type: str
    count: int


class InsightsSummary(BaseModel):
    vessel_count: int
    event_type_counts: list[EventTypeCount]


def map_event_type_counts_from_raw(raw: list[dict[str, Any]]) -> list[EventTypeCount]:
    return [
        EventTypeCount(type=item["type"], count=int(item["count"]))
        for item in raw
    ]


def map_insights_summary(
    vessel_count: int,
    event_type_counts_raw: list[dict[str, Any]],
) -> InsightsSummary:
    return InsightsSummary(
        vessel_count=vessel_count,
        event_type_counts=map_event_type_counts_from_raw(event_type_counts_raw),
    )
