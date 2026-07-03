from fastapi import APIRouter, Depends
import httpx

from routes.vessels.models import (
    VesselTrajectoryResponse,
    VesselPlaybackResponse,
    PlaybackWindowRequest,
)
from routes.vessels.services import get_vessel_trajectory, get_vessel_playback
from shared.dependencies import get_http_client

router = APIRouter(prefix="/vessels", tags=["Vessels"])


@router.get("/trajectory/{vessel_id}", response_model=VesselTrajectoryResponse)
async def get_trajectory(
    vessel_id: str,
    time: int = 3600,
    client: httpx.AsyncClient = Depends(get_http_client),
):
    return await get_vessel_trajectory(client, vessel_id, time)


@router.post("/playback", response_model=VesselPlaybackResponse)
async def get_playback(
    req: PlaybackWindowRequest,
    client: httpx.AsyncClient = Depends(get_http_client),
):
    return await get_vessel_playback(client, req.polygon, req.start, req.end)
