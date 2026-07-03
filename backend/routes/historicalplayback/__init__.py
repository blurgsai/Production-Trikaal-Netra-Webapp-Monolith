from fastapi import APIRouter
from .routes import playback, lloyds_details

router = APIRouter()
router.include_router(playback.router)
router.include_router(lloyds_details.router)

__all__ = ["router"]
