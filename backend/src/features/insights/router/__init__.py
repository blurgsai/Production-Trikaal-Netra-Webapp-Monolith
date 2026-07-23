from __future__ import annotations

from fastapi import APIRouter, Depends

from src.features.insights.models import InsightsSummary
from src.features.insights.services import get_insights_summary
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/summary", response_model=InsightsSummary)
async def insights_summary(
    db=Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    return await get_insights_summary(db)
