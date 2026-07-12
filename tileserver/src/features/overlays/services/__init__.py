import os
import shutil
import sqlite3
import zipfile

from src.features.overlays.repository import (
    delete_overlay,
    get_overlay,
    insert_file_overlay,
    insert_url_overlay,
    list_overlays,
)
from src.shared.config import DATA_DIR
from src.shared.errors import NotFoundError, ValidationError
from src.shared.geoserver_client import GeoServerClient
from src.shared.vector_converter import (
    convert_geojson_to_gpkg,
    convert_kml_to_gpkg,
    parse_enc_to_gpkg,
)

_EXTENSION_TO_SOURCE_TYPE = {
    ".mbtiles": "mbtiles",
    ".db": "sqlite",
    ".sqlite": "sqlite",
    ".geojson": "geojson",
    ".json": "geojson",
    ".kml": "kml",
    ".kmz": "kml",
    ".zip": "zip",
    ".000": "enc",
}

VALID_OVERLAY_TYPES = frozenset({"tile", "wms", "mvt"})

_VECTOR_CONVERTERS = {
    "enc": parse_enc_to_gpkg,
    "geojson": convert_geojson_to_gpkg,
    "kml": convert_kml_to_gpkg,
}


def get_all_overlays() -> list[dict]:
    return list_overlays()


def _detect_source_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    source_type = _EXTENSION_TO_SOURCE_TYPE.get(ext)
    if not source_type:
        raise ValidationError(
            f"Unsupported file type: '{ext or 'no extension'}'. "
            f"Allowed: .mbtiles, .db, .sqlite, .geojson, .json, .kml, .kmz, .zip, .000 (ENC)"
        )
    return source_type


def _compute_gpkg_bounds(gpkg_path: str) -> list[float] | None:
    """Compute combined bounds of all layers in a GeoPackage.

    Reads the gpkg_contents table (SRS bounds) and returns
    [min_lon, min_lat, max_lon, max_lat] or None.
    """
    if not os.path.isfile(gpkg_path):
        return None
    try:
        conn = sqlite3.connect(gpkg_path)
        rows = conn.execute(
            "SELECT min_x, min_y, max_x, max_y FROM gpkg_contents "
            "WHERE min_x IS NOT NULL AND min_y IS NOT NULL AND max_x IS NOT NULL AND max_y IS NOT NULL"
        ).fetchall()
        conn.close()
        if not rows:
            return None
        return [
            min(r[0] for r in rows),
            min(r[1] for r in rows),
            max(r[2] for r in rows),
            max(r[3] for r in rows),
        ]
    except (sqlite3.Error, OSError):
        return None


def _find_tile_root(extract_dir: str) -> str:
    """Find the directory containing {z}/{x}/{y}.png tile structure."""
    for root, dirs, files in os.walk(extract_dir):
        if not files:
            continue
        has_png = any(f.endswith(".png") for f in files)
        if has_png:
            parent = os.path.dirname(root)
            grandparent = os.path.dirname(parent)
            if grandparent == extract_dir or parent == extract_dir:
                return parent if grandparent == extract_dir else root
    return extract_dir


def _convert_and_publish_to_geoserver(
    overlay_id: str,
    name: str,
    source_path: str,
    source_type: str,
    attribution: str,
    color: str,
    opacity: float,
) -> dict:
    """Convert a vector file to GeoPackage, upload to GeoServer, store in DB.

    All features and attributes are preserved in the GeoPackage.
    GeoServer renders the data server-side using S-52 SLD styles via WMS.
    Tileserver DB stores the WMS PNG proxy URL as tile_url.
    """
    converter = _VECTOR_CONVERTERS[source_type]
    gpkg_path = os.path.join(DATA_DIR, f"{overlay_id}.gpkg")

    converter(source_path, gpkg_path)

    # Remove the original uploaded file (we keep only the .gpkg)
    if os.path.isfile(source_path) and source_path != gpkg_path:
        os.remove(source_path)

    geoserver = GeoServerClient()
    if not geoserver.enabled:
        raise ValidationError(
            f"GeoServer is unavailable. {source_type.upper()} overlays require GeoServer for rendering."
        )

    gs_info = geoserver.publish_gpkg(overlay_id, name, gpkg_path)
    if not gs_info:
        raise ValidationError(f"GeoServer failed to publish {source_type.upper()} overlay.")

    # Compute the combined geographic bounds from the local GeoPackage once and
    # cache in the DB so the frontend can fly to the chart instantly without
    # querying the remote GeoServer.
    bounds = _compute_gpkg_bounds(gpkg_path)

    # Store the tileserver WMS PNG proxy URL as tile_url.
    # The proxy endpoint converts z/x/y → WMS bbox and fetches PNG raster tiles
    # from GeoServer, which renders server-side using S-52 SLD styles.
    layer_names = ",".join(gs_info["layer_names"])
    tile_url = f"/overlays/{overlay_id}/wms/{{z}}/{{x}}/{{y}}.png?wms_url={gs_info['wms_url']}&layers={layer_names}"

    return insert_file_overlay(
        name, "wms", gpkg_path, attribution, color, opacity, tile_url,
        overlay_id=overlay_id, bounds=bounds,
    )


def upload_overlay(
    name: str, filename: str, file_obj, attribution: str, color: str, opacity: float
) -> dict:
    if not name.strip():
        raise ValidationError("Overlay name is required")

    if not filename:
        raise ValidationError("File is required")

    source_type = _detect_source_type(filename)

    overlay_id = os.urandom(6).hex()
    safe_filename = f"{overlay_id}_{filename}"
    dest_path = os.path.join(DATA_DIR, safe_filename)

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file_obj, f)

    if source_type in ("enc", "geojson", "kml"):
        return _convert_and_publish_to_geoserver(
            overlay_id, name, dest_path, source_type, attribution, color, opacity
        )

    if source_type == "zip":
        extract_dir = os.path.join(DATA_DIR, f"{overlay_id}_tiles")
        os.makedirs(extract_dir, exist_ok=True)
        try:
            with zipfile.ZipFile(dest_path, "r") as zf:
                zf.extractall(extract_dir)
        except zipfile.BadZipFile:
            raise ValidationError("Invalid ZIP file")
        os.remove(dest_path)
        dest_path = _find_tile_root(extract_dir)
        source_type = "directory"

    return insert_file_overlay(name, source_type, dest_path, attribution, color, opacity)


def create_url_overlay(
    name: str, tile_url: str, overlay_type: str, attribution: str, color: str, opacity: float
) -> dict:
    if not name.strip():
        raise ValidationError("Overlay name is required")

    if not tile_url.strip():
        raise ValidationError("Tile URL is required")

    if overlay_type not in VALID_OVERLAY_TYPES:
        raise ValidationError(
            f"Invalid overlay_type: '{overlay_type}'. Must be one of: {', '.join(sorted(VALID_OVERLAY_TYPES))}"
        )

    return insert_url_overlay(name, tile_url, overlay_type, attribution, color, opacity)


def remove_overlay(overlay_id: str) -> None:
    overlay = get_overlay(overlay_id)
    if not overlay:
        raise NotFoundError("Overlay", overlay_id)

    if overlay.get("source_type") in ("mvt", "wms") and overlay.get("type") == "file":
        try:
            geoserver = GeoServerClient()
            if geoserver.enabled:
                geoserver.delete_overlay(overlay_id, overlay.get("name", ""))
        except Exception:
            pass

    file_path = overlay.get("file_path")
    if file_path:
        if os.path.isdir(file_path):
            shutil.rmtree(file_path, ignore_errors=True)
        elif os.path.isfile(file_path):
            os.remove(file_path)

    if not delete_overlay(overlay_id):
        raise NotFoundError("Overlay", overlay_id)
