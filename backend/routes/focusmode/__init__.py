from fastapi import APIRouter
from .routes import ping, vessel_trajectory

router = APIRouter(prefix="/focusmode")
router.include_router(ping.router)
router.include_router(vessel_trajectory.router)

__all__ = ["router"]
