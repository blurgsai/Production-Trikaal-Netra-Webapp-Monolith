from fastapi import APIRouter

from routes.vessels.models import (
    VesselTrajectoryResponse,
    VesselPlaybackResponse,
    PlaybackWindowRequest,
)
from routes.vessels.services import get_vessel_trajectory, get_vessel_playback

router = APIRouter(prefix="/vessels", tags=["Vessels"])


@router.get("/trajectory/{vessel_id}", response_model=VesselTrajectoryResponse)
async def get_trajectory(vessel_id: str, time: int = 3600):
    return await get_vessel_trajectory(vessel_id, time)


@router.post("/playback", response_model=VesselPlaybackResponse)
async def get_playback(req: PlaybackWindowRequest):
    return await get_vessel_playback(req.polygon, req.start, req.end)
