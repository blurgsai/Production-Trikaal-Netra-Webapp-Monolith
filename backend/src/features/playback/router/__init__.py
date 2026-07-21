"""Playback feature — Layer 4 (router).

HTTP endpoints for event playback (event details + AIS trajectories + zone geometry).
Self-contained feature at /api/playback (atomic + compound). All routes require auth.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.features.playback.models import PlaybackResponse
from src.features.playback.services import get_atomic_playback, get_compound_playback
from src.shared.auth import get_current_user
from src.shared.dependencies import get_clickhouse_client, get_db

router = APIRouter(prefix="/api/playback", tags=["playback"])


@router.get("/atomic/{event_id}", response_model=PlaybackResponse)
async def atomic_playback(
    event_id: str,
    db=Depends(get_db),
    ch_client=Depends(get_clickhouse_client),
    current_user: dict = Depends(get_current_user),
):
    return await get_atomic_playback(db, ch_client, event_id)


@router.get("/compound", response_model=PlaybackResponse)
async def compound_playback(
    id: str = Query(..., description="Virtual compound id: eventId1__eventId2[__...]"),
    db=Depends(get_db),
    ch_client=Depends(get_clickhouse_client),
    current_user: dict = Depends(get_current_user),
):
    return await get_compound_playback(db, ch_client, id)
