from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.features.insights.models import InsightsDashboard, InsightsTimelineResponse
from src.features.insights.services import (
    VALID_TIMELINE_RANGES,
    get_insights_dashboard,
    get_insights_timeline,
)
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/summary", response_model=InsightsDashboard)
async def insights_summary(
    db=Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    return await get_insights_dashboard(db)


@router.get("/timeline", response_model=InsightsTimelineResponse)
async def insights_timeline(
    db=Depends(get_db),
    _current_user: dict = Depends(get_current_user),
    timeline_range: str = Query(
        "1w",
        description="Activity Timeline window: all | 1y | 6m | 3m | 1m | 1w",
    ),
):
    if timeline_range not in VALID_TIMELINE_RANGES:
        timeline_range = "1w"
    return await get_insights_timeline(db, timeline_range=timeline_range)
