import io
import os
import sqlite3

from PIL import Image

from src.shared.config import METADATA_DB_PATH


def _get_basemap(basemap_id: str) -> dict | None:
    conn = sqlite3.connect(METADATA_DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM basemaps WHERE id = ?", (basemap_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def _read_mbtiles_tile_exact(file_path: str, z: int, x: int, y: int) -> bytes | None:
    conn = sqlite3.connect(file_path)
    tms_y = (2 ** z - 1) - y
    row = conn.execute(
        "SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?",
        (z, x, tms_y),
    ).fetchone()
    conn.close()
    return row[0] if row else None


def _crop_and_upsample(
    parent_png: bytes, z: int, x: int, y: int, pz: int, px: int, py: int, levels_up: int,
) -> bytes:
    """Crop the matching quadrant from a parent tile and upsample to 256×256."""
    img = Image.open(io.BytesIO(parent_png))
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    sub_size = 256 // (2 ** levels_up)
    if sub_size < 1:
        sub_size = 1
    ox = (x - (px << levels_up)) * sub_size
    oy = (y - (py << levels_up)) * sub_size
    cropped = img.crop((ox, oy, ox + sub_size, oy + sub_size))
    upsampled = cropped.resize((256, 256), Image.NEAREST)
    buf = io.BytesIO()
    upsampled.save(buf, format="PNG")
    return buf.getvalue()


def _overzoom(
    file_path: str, z: int, x: int, y: int, exact_reader, max_backtrack: int = 6,
) -> bytes | None:
    """If (z,x,y) isn't stored, walk up to the ancestor tile that IS stored and
    crop+nearest-upsample the matching quadrant."""
    for levels_up in range(1, max_backtrack + 1):
        pz = z - levels_up
        if pz < 0:
            return None
        px, py = x >> levels_up, y >> levels_up
        parent_png = exact_reader(file_path, pz, px, py)
        if parent_png is None:
            continue
        return _crop_and_upsample(parent_png, z, x, y, pz, px, py, levels_up)
    return None


def _read_mbtiles_tile(file_path: str, z: int, x: int, y: int) -> bytes | None:
    tile = _read_mbtiles_tile_exact(file_path, z, x, y)
    if tile is not None:
        return tile
    return _overzoom(file_path, z, x, y, _read_mbtiles_tile_exact)


def _read_directory_tile(file_path: str, z: int, x: int, y: int) -> bytes | None:
    tile_file = os.path.join(file_path, str(z), str(x), f"{y}.png")
    if not os.path.isfile(tile_file):
        return None
    with open(tile_file, "rb") as f:
        return f.read()


def _read_sqlite_tile_exact(file_path: str, z: int, x: int, y: int) -> bytes | None:
    conn = sqlite3.connect(file_path)
    tms_y = (2 ** z - 1) - y
    row = conn.execute(
        "SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?",
        (z, x, tms_y),
    ).fetchone()
    conn.close()
    return row[0] if row else None


def _read_sqlite_tile(file_path: str, z: int, x: int, y: int) -> bytes | None:
    tile = _read_sqlite_tile_exact(file_path, z, x, y)
    if tile is not None:
        return tile
    return _overzoom(file_path, z, x, y, _read_sqlite_tile_exact)


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
