from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from src.features.basemaps.schemas import BaseMapResponse, UrlTileRequest
from src.features.basemaps.services import (
    create_url_basemap,
    get_all_basemaps,
    remove_basemap,
    upload_basemap,
)
from src.shared.auth import require_admin

router = APIRouter(prefix="/basemaps", tags=["basemaps"])


@router.get("", response_model=list[BaseMapResponse])
async def list_all_basemaps() -> list[dict]:
    return get_all_basemaps()


@router.post("/upload", response_model=BaseMapResponse, status_code=status.HTTP_201_CREATED)
async def upload_basemap_route(
    name: str = Form(...),
    file: UploadFile = File(...),
    attribution: str = Form(""),
    _admin: dict = Depends(require_admin),
) -> dict:
    return upload_basemap(name, file.filename, file.file, attribution)


@router.post("/url", response_model=BaseMapResponse, status_code=status.HTTP_201_CREATED)
async def add_url_basemap(
    payload: UrlTileRequest,
    _admin: dict = Depends(require_admin),
) -> dict:
    return create_url_basemap(payload.name, payload.tile_url, payload.attribution)


@router.delete("/{basemap_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_basemap_route(
    basemap_id: str,
    _admin: dict = Depends(require_admin),
) -> None:
    remove_basemap(basemap_id)
