from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal

from src.features.insights.clients import (
    fetch_daily_event_counts,
    fetch_event_type_counts,
    fetch_events_time_bounds,
    fetch_severity_count,
    fetch_vessel_count,
)
from src.features.insights.models import (
    InsightsDashboard,
    InsightsTimelineResponse,
    map_insights_dashboard,
    map_insights_timeline,
)
from src.shared.errors import ExternalServiceError

HIGH_SEVERITIES = ["high", "critical", "High", "Critical"]
MID_SEVERITIES = ["medium", "Medium"]
LOW_SEVERITIES = ["low", "info", "Low", "Info"]

TimelineRange = Literal["all", "1y", "6m", "3m", "1m", "1w"]

VALID_TIMELINE_RANGES = frozenset({"all", "1y", "6m", "3m", "1m", "1w"})

# Approximate calendar spans (days) for "past X" windows.
_RANGE_DAYS: dict[str, int] = {
    "1w": 6,  # inclusive: today + prior 6 days = 7 days
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
}


def _resolve_timeline_window(
    timeline_range: str,
    min_ts: datetime | None,
    max_ts: datetime | None,
) -> tuple[datetime | None, datetime | None]:
    """Return (start, end) for the Activity Timeline only. Anchored to UTC now."""
    if max_ts is None:
        return None, None

    now = datetime.utcnow()
    end = now

    if timeline_range == "all":
        start = min_ts or max_ts
        return start, max(end, max_ts)

    days = _RANGE_DAYS.get(timeline_range, 6)
    start = (now - timedelta(days=days)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return start, end


async def get_insights_dashboard(db) -> InsightsDashboard:
    try:
        vessel_count = await fetch_vessel_count(db)
        type_counts = await fetch_event_type_counts(db)
        high_priority_count = await fetch_severity_count(db, HIGH_SEVERITIES)
        mid_priority_count = await fetch_severity_count(db, MID_SEVERITIES)
        low_priority_count = await fetch_severity_count(db, LOW_SEVERITIES)
    except Exception as e:
        raise ExternalServiceError("MongoDB", str(e)) from e

    return map_insights_dashboard(
        vessel_count=vessel_count,
        type_counts=type_counts,
        high_priority_count=high_priority_count,
        mid_priority_count=mid_priority_count,
        low_priority_count=low_priority_count,
    )


async def get_insights_timeline(
    db, *, timeline_range: str = "1w"
) -> InsightsTimelineResponse:
    if timeline_range not in VALID_TIMELINE_RANGES:
        timeline_range = "1w"

    try:
        min_ts, max_ts = await fetch_events_time_bounds(db)
        window_start, window_end = _resolve_timeline_window(
            timeline_range, min_ts, max_ts
        )
        daily_events: list = []
        if window_start is not None and window_end is not None:
            daily_events = await fetch_daily_event_counts(
                db, window_start, window_end
            )
    except Exception as e:
        raise ExternalServiceError("MongoDB", str(e)) from e

    return map_insights_timeline(
        daily_events,
        window_start=window_start,
        window_end=window_end,
        timeline_range=timeline_range,
    )
