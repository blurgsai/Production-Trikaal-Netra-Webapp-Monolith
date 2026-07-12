import os
import shutil

from src.features.basemaps.repository import (
    delete_basemap,
    insert_file_basemap,
    insert_url_basemap,
    list_basemaps,
)
from src.shared.config import DATA_DIR
from src.shared.errors import NotFoundError, ValidationError

_EXTENSION_TO_SOURCE_TYPE = {
    ".mbtiles": "mbtiles",
    ".db": "sqlite",
    ".sqlite": "sqlite",
}


def get_all_basemaps() -> list[dict]:
    return list_basemaps()


def _detect_source_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    source_type = _EXTENSION_TO_SOURCE_TYPE.get(ext)
    if not source_type:
        raise ValidationError(
            f"Unsupported file type: '{ext or 'no extension'}'. "
            f"Allowed: .mbtiles, .db, .sqlite"
        )
    return source_type


def upload_basemap(name: str, filename: str, file_obj, attribution: str) -> dict:
    if not name.strip():
        raise ValidationError("Base map name is required")

    if not filename:
        raise ValidationError("File is required")

    source_type = _detect_source_type(filename)

    basemap_id = os.urandom(6).hex()
    safe_filename = f"{basemap_id}_{filename}"
    dest_path = os.path.join(DATA_DIR, safe_filename)

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file_obj, f)

    return insert_file_basemap(name, source_type, dest_path, attribution)


def create_url_basemap(name: str, tile_url: str, attribution: str) -> dict:
    if not name.strip():
        raise ValidationError("Base map name is required")

    if not tile_url.strip():
        raise ValidationError("Tile URL is required")

    return insert_url_basemap(name, tile_url, attribution)


def remove_basemap(basemap_id: str) -> None:
    if not delete_basemap(basemap_id):
        raise NotFoundError("Base map", basemap_id)
