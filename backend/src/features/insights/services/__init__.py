from __future__ import annotations

from src.features.insights.clients import fetch_event_type_counts, fetch_vessel_count
from src.features.insights.models import InsightsSummary, map_insights_summary
from src.shared.errors import ExternalServiceError


async def get_insights_summary(db) -> InsightsSummary:
    try:
        vessel_count = await fetch_vessel_count(db)
        event_type_counts_raw = await fetch_event_type_counts(db)
    except Exception as e:
        raise ExternalServiceError("MongoDB", str(e)) from e

    return map_insights_summary(vessel_count, event_type_counts_raw)
