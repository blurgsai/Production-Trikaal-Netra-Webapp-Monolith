"""Focus mode feature — Layer 4 (router).

HTTP endpoints for the Focus Mode vessel picker + trajectory playback (vessel
search by MMSI, AIS trajectory over an arbitrary time range). Events are
intentionally out of scope for now. All routes require auth.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.features.focus_mode.models import VesselsByMmsiResponse, VesselTrajectoryResponse
from src.features.focus_mode.services import get_vessel_trajectory, get_vessels_by_mmsi
from src.shared.auth import get_current_user
from src.shared.dependencies import get_clickhouse_client, get_db

router = APIRouter(prefix="/api/focus-mode", tags=["focus-mode"])


@router.get("/vessel/by-mmsi/{mmsi}", response_model=VesselsByMmsiResponse)
async def vessels_by_mmsi(
    mmsi: int,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await get_vessels_by_mmsi(db, mmsi)


@router.get("/vessel/{vessel_id}/trajectory", response_model=VesselTrajectoryResponse)
async def vessel_trajectory(
    vessel_id: int,
    start_time: int | None = Query(None, description="Unix seconds"),
    end_time: int | None = Query(None, description="Unix seconds"),
    db=Depends(get_db),
    ch_client=Depends(get_clickhouse_client),
    current_user: dict = Depends(get_current_user),
):
    return await get_vessel_trajectory(db, ch_client, vessel_id, start_time, end_time)
