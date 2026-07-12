import math
import os

import requests
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse, Response

from src.features.overlays.schemas import OverlayResponse, UrlOverlayRequest
from src.features.overlays.services import (
    create_url_overlay,
    get_all_overlays,
    remove_overlay,
    upload_overlay,
)
from src.shared.auth import require_admin
from src.shared.errors import NotFoundError

router = APIRouter(prefix="/overlays", tags=["overlays"])


def _tile_to_bbox(z: int, x: int, y: int) -> str:
    """Convert z/x/y tile coordinates to a Web Mercator (EPSG:3857) bbox string."""
    n = 2 ** z
    min_lon = x / n * 360.0 - 180.0
    max_lon = (x + 1) / n * 360.0 - 180.0
    lat_rad_min = math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n)))
    lat_rad_max = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    min_lat = math.degrees(lat_rad_min)
    max_lat = math.degrees(lat_rad_max)

    def lonlat_to_webmerc(lon: float, lat: float) -> tuple[float, float]:
        x_m = lon * 20037508.34 / 180.0
        lat_rad = math.radians(lat)
        y_m = math.log(math.tan(math.pi / 4 + lat_rad / 2)) * 20037508.34 / math.pi
        return (x_m, y_m)

    min_x, min_y = lonlat_to_webmerc(min_lon, min_lat)
    max_x, max_y = lonlat_to_webmerc(max_lon, max_lat)
    return f"{min_x},{min_y},{max_x},{max_y}"


@router.get("", response_model=list[OverlayResponse])
def list_all_overlays() -> list[dict]:
    return get_all_overlays()


@router.post("/upload", response_model=OverlayResponse, status_code=status.HTTP_201_CREATED)
def upload_overlay_route(
    name: str = Form(...),
    file: UploadFile = File(...),
    attribution: str = Form(""),
    color: str = Form("#3388ff"),
    opacity: float = Form(1.0),
    _admin: dict = Depends(require_admin),
) -> dict:
    return upload_overlay(name, file.filename, file.file, attribution, color, opacity)


@router.post("/url", response_model=OverlayResponse, status_code=status.HTTP_201_CREATED)
def add_url_overlay(
    payload: UrlOverlayRequest,
    _admin: dict = Depends(require_admin),
) -> dict:
    return create_url_overlay(
        payload.name, payload.tile_url, payload.overlay_type,
        payload.attribution, payload.color, payload.opacity,
    )


@router.get("/{overlay_id}/data")
def get_overlay_data(overlay_id: str):
    from src.features.overlays.repository import get_overlay
    overlay = get_overlay(overlay_id)
    if not overlay:
        raise NotFoundError("Overlay", overlay_id)
    file_path = overlay.get("file_path")
    if not file_path or not os.path.isfile(file_path):
        raise NotFoundError("Overlay file", overlay_id)

    source_type = overlay.get("source_type", "")
    media_type = "application/octet-stream"
    if source_type == "geojson":
        media_type = "application/geo+json"
    elif source_type == "kml":
        media_type = "application/vnd.google-earth.kml+xml"

    return FileResponse(file_path, media_type=media_type)


@router.get("/{overlay_id}/mvt/{z}/{x}/{y}.pbf")
def get_mvt_tile(
    overlay_id: str,
    z: int,
    x: int,
    y: int,
    wms_url: str = Query(...),
    layers: str = Query(...),
):
    """Proxy MVT tile request to GeoServer WMS.

    Converts z/x/y tile coordinates to Web Mercator bbox and fetches
    MVT tiles from GeoServer via WMS GetMap.
    """
    bbox = _tile_to_bbox(z, x, y)

    params = {
        "service": "WMS",
        "version": "1.1.1",
        "request": "GetMap",
        "layers": layers,
        "bbox": bbox,
        "width": "256",
        "height": "256",
        "srs": "EPSG:3857",
        "format": "application/x-protobuf;type=mapbox-vector",
        "transparent": "true",
    }

    try:
        resp = requests.get(wms_url, params=params, timeout=30)
    except requests.RequestException:
        return Response(status_code=502, content=b"")

    if resp.status_code != 200 or len(resp.content) == 0:
        return Response(status_code=204, content=b"")

    return Response(content=resp.content, media_type="application/vnd.mapbox-vector-tile")


@router.get("/{overlay_id}/wms/{z}/{x}/{y}.png")
def get_wms_tile(
    overlay_id: str,
    z: int,
    x: int,
    y: int,
    wms_url: str = Query(...),
    layers: str = Query(...),
    styles: str = Query(""),
):
    """Proxy WMS PNG raster tile request to GeoServer.

    Renders server-side using SLD styles and returns PNG tiles.
    This is the industry-standard approach for ENC chart rendering.
    """
    bbox = _tile_to_bbox(z, x, y)

    params = {
        "service": "WMS",
        "version": "1.1.1",
        "request": "GetMap",
        "layers": layers,
        "styles": styles,
        "bbox": bbox,
        "width": "512",
        "height": "512",
        "srs": "EPSG:3857",
        "format": "image/png",
        "transparent": "true",
    }

    try:
        resp = requests.get(wms_url, params=params, timeout=30)
    except requests.RequestException:
        return Response(status_code=502, content=b"")

    if resp.status_code != 200 or len(resp.content) == 0:
        return Response(status_code=204, content=b"")

    return Response(content=resp.content, media_type="image/png")


@router.get("/{overlay_id}/bounds")
def get_overlay_bounds(overlay_id: str):
    """Get the bounding box [min_lon, min_lat, max_lon, max_lat] for an overlay.

    Returns cached bounds from the DB when available, otherwise queries GeoServer
    once. Used by the frontend to fly-to the ENC chart area.
    """
    import json

    from src.features.overlays.repository import get_overlay
    overlay = get_overlay(overlay_id)
    if not overlay:
        raise NotFoundError("Overlay", overlay_id)

    if overlay.get("source_type") not in ("wms", "mvt") or overlay.get("type") != "file":
        return {"bounds": None}

    bounds_raw = overlay.get("bounds")
    if bounds_raw:
        try:
            return {"bounds": json.loads(bounds_raw)}
        except (json.JSONDecodeError, TypeError):
            pass

    # Legacy fallback: query GeoServer and cache the result.
    from src.shared.geoserver_client import GeoServerClient
    gs = GeoServerClient()
    bounds = gs.get_overlay_bounds(overlay_id, overlay["name"])
    return {"bounds": bounds}


@router.delete("/{overlay_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_overlay_route(
    overlay_id: str,
    _admin: dict = Depends(require_admin),
) -> None:
    remove_overlay(overlay_id)
