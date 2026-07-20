"""Events feature — Layer 4 (router).

HTTP endpoints for the atomic-events table. Matches the frontend eventTable
contract at /api/mongo-events/*. Only sees domain models; delegates all logic
to the service layer. All routes require an authenticated user.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.features.events.models import (
    EventListResponse,
    EventMetadataResponse,
    MetadataValueResponse,
)
from src.features.events.services import (
    get_event_list,
    get_field_values,
    get_metadata,
)
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db

router = APIRouter(prefix="/api/mongo-events", tags=["events"])


@router.get("/list", response_model=EventListResponse)
async def list_events(
    limit: int = Query(1000, ge=0, le=5000),
    offset: int = Query(0, ge=0),
    filters: str | None = Query(None),
    q: str | None = Query(None, max_length=200),
    id: str | None = Query(None, description="Filter by MongoDB _id"),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await get_event_list(db, limit=limit, offset=offset, filters=filters, q=q, id=id)


@router.get("/metadata", response_model=EventMetadataResponse)
async def events_metadata(
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await get_metadata(db)


@router.get("/metadata/values", response_model=MetadataValueResponse)
async def events_metadata_values(
    field: str = Query(..., description="Field name to fetch unique values for"),
    limit: int | None = Query(None, ge=1),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await get_field_values(db, field, limit)
