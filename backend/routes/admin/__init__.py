from fastapi import APIRouter
from routes.admin import map
from .users import router as users_router
from .databaseuploader import router as database_uploader_router
from .vessel_images import router as vessel_images_router

router = APIRouter(prefix="/admin", tags=["admin"])
router.include_router(users_router)
router.include_router(database_uploader_router)
router.include_router(vessel_images_router)
router.include_router(map.router)

