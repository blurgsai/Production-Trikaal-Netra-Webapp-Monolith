import os
import sqlite3

from src.shared.config import METADATA_DB_PATH


def _get_basemap(basemap_id: str) -> dict | None:
    conn = sqlite3.connect(METADATA_DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM basemaps WHERE id = ?", (basemap_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def _read_mbtiles_tile(file_path: str, z: int, x: int, y: int) -> bytes | None:
    conn = sqlite3.connect(file_path)
    tms_y = (2 ** z - 1) - y
    row = conn.execute(
        "SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?",
        (z, x, tms_y),
    ).fetchone()
    conn.close()
    return row[0] if row else None


def _read_directory_tile(file_path: str, z: int, x: int, y: int) -> bytes | None:
    tile_file = os.path.join(file_path, str(z), str(x), f"{y}.png")
    if not os.path.isfile(tile_file):
        return None
    with open(tile_file, "rb") as f:
        return f.read()


def _read_sqlite_tile(file_path: str, z: int, x: int, y: int) -> bytes | None:
    conn = sqlite3.connect(file_path)
    tms_y = (2 ** z - 1) - y
    row = conn.execute(
        "SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?",
        (z, x, tms_y),
    ).fetchone()
    conn.close()
    return row[0] if row else None


_TILE_READERS = {
    "mbtiles": _read_mbtiles_tile,
    "directory": _read_directory_tile,
    "sqlite": _read_sqlite_tile,
}


def read_tile(basemap_id: str, z: int, x: int, y: int) -> bytes | None:
    basemap = _get_basemap(basemap_id)
    if not basemap or basemap["type"] != "file":
        return None

    source_type = basemap["source_type"]
    file_path = basemap["file_path"]
    if not file_path or not os.path.exists(file_path):
        return None

    reader = _TILE_READERS.get(source_type)
    if reader is None:
        return None

    return reader(file_path, z, x, y)
