from src.features.tiles.repository import read_tile
from src.shared.errors import NotFoundError


def get_tile_data(item_id: str, z: int, x: int, y: int) -> bytes:
    tile_data = read_tile(item_id, z, x, y)
    if tile_data is None:
        tile_data = read_overlay_tile(item_id, z, x, y)
    if tile_data is None:
        raise NotFoundError("Tile", f"{item_id}/{z}/{x}/{y}")
    return tile_data


def read_overlay_tile(overlay_id: str, z: int, x: int, y: int) -> bytes | None:
    from src.features.overlays.repository import get_overlay
    overlay = get_overlay(overlay_id)
    if not overlay or overlay["type"] != "file":
        return None
    source_type = overlay["source_type"]
    file_path = overlay["file_path"]
    if not file_path:
        return None
    from src.features.tiles.repository import _TILE_READERS
    import os
    if not os.path.exists(file_path):
        return None
    reader = _TILE_READERS.get(source_type)
    if reader is None:
        return None
    return reader(file_path, z, x, y)
