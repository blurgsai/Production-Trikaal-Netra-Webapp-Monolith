from fastapi import APIRouter, Response

from src.features.tiles.services import get_tile_data

router = APIRouter(prefix="/tiles", tags=["tiles"])


@router.get("/{basemap_id}/{z}/{x}/{y}.png")
async def get_tile(basemap_id: str, z: int, x: int, y: int) -> Response:
    tile_data = get_tile_data(basemap_id, z, x, y)
    return Response(content=tile_data, media_type="image/png")
