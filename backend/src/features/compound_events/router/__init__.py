"""Compound events feature — Layer 4 (router).

HTTP endpoints for compound configs and their on-demand instances. Matches the
frontend eventTable contract at /api/compound-events/*. All routes require an
authenticated user.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.features.compound_events.models import (
    CompoundConfigListResponse,
    CompoundInstanceListResponse,
)
from src.features.compound_events.services import (
    compute_instances,
    list_compound_configs,
)
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db

router = APIRouter(prefix="/api/compound-events", tags=["compound-events"])


@router.get("/list", response_model=CompoundConfigListResponse)
async def list_configs(
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    q: str | None = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await list_compound_configs(db, limit=limit, offset=offset, q=q)


@router.get("/{config_id}/instances", response_model=CompoundInstanceListResponse)
async def list_instances(
    config_id: str,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    q: str | None = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await compute_instances(db, config_id, limit=limit, offset=offset, q=q)
