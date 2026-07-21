"""Convert a parquet file with S2 cell IDs into a raster MBTiles pyramid.

Each S2 cell is rendered as its full polygon footprint (filled quad),
colored by a weight column (e.g. ``unique_mmsi_count``).  Tiles are
generated up to each S2 level's *native* zoom (the zoom at which a cell
is ~8 px on screen).  Requests beyond ``native_max_zoom`` up to the
user-requested ``max_zoom`` (up to 18) are served via the overzoom
fallback in ``tiles.repository``.
"""

from __future__ import annotations

import io
import logging
import math
import os
import re
import sqlite3
import struct
import time

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw
from s2sphere import Cell, CellId, LatLng

from src.shared.errors import ValidationError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ORIGIN_SHIFT = 20037508.34  # Web Mercator half-extent in meters
TILE_SIZE = 256
DEFAULT_MIN_ZOOM = 0
DEFAULT_MAX_ZOOM = 18
PIXELS_PER_CELL_TARGET = 8
WEIGHT_PERCENTILE = 95
MAX_BACKTRACK = 6

_HEAT_STOPS = [
    (0.00, (0, 0, 0, 0)),
    (0.15, (0, 0, 255, 80)),
    (0.35, (0, 255, 255, 140)),
    (0.60, (255, 255, 0, 190)),
    (0.85, (255, 80, 0, 230)),
    (1.00, (255, 0, 0, 255)),
]


# ---------------------------------------------------------------------------
# S2 helpers
# ---------------------------------------------------------------------------

def _signed_to_unsigned(signed_id: int) -> int:
    """Convert a signed int64 S2 cell ID to its unsigned uint64 form."""
    return signed_id & 0xFFFFFFFFFFFFFFFF


def _cell_vertices_latlng(cell_id_unsigned: int) -> list[tuple[float, float]]:
    """Return the 4 vertices of an S2 cell as (lat, lon) degrees."""
    cell = Cell(CellId(cell_id_unsigned))
    verts = []
    for i in range(4):
        pt = cell.get_vertex(i)
        ll = LatLng.from_point(pt)
        verts.append((ll.lat().degrees, ll.lng().degrees))
    return verts


def _cell_edge_meters(level: int) -> float:
    """Approximate edge length (meters) of an S2 cell at *level*."""
    cid = CellId.from_lat_lng(LatLng.from_degrees(0.0, 0.0)).parent(level)
    verts = _cell_vertices_latlng(cid.id())
    # Convert first edge to Web Mercator meters
    lat0, lon0 = verts[0]
    lat1, lon1 = verts[1]
    x0 = lon0 * ORIGIN_SHIFT / 180.0
    y0 = math.log(math.tan(math.pi / 4 + math.radians(lat0) / 2)) * ORIGIN_SHIFT / math.pi
    x1 = lon1 * ORIGIN_SHIFT / 180.0
    y1 = math.log(math.tan(math.pi / 4 + math.radians(lat1) / 2)) * ORIGIN_SHIFT / math.pi
    return math.hypot(x1 - x0, y1 - y0)


def _native_zoom_for_level(level: int) -> int:
    """Compute the zoom at which one S2 cell of *level* is ~PIXELS_PER_CELL_TARGET px."""
    edge_m = _cell_edge_meters(level)
    world_px = TILE_SIZE * (2 ** 20)  # reference at zoom 20
    cell_px_at_20 = edge_m / (2 * ORIGIN_SHIFT) * world_px
    # Find z where cell_px ≈ PIXELS_PER_CELL_TARGET
    # cell_px(z) = cell_px_at_20 / 2^(z-20)
    # z = 20 - log2(cell_px_at_20 / target)
    if cell_px_at_20 <= 0:
        return 0
    z = 20 - math.log2(cell_px_at_20 / PIXELS_PER_CELL_TARGET)
    return max(0, round(z))


# ---------------------------------------------------------------------------
# Projection helpers
# ---------------------------------------------------------------------------

def _lonlat_to_webmerc(lon: float, lat: float) -> tuple[float, float]:
    """Convert lon/lat degrees to Web Mercator meters (EPSG:3857)."""
    x = lon * ORIGIN_SHIFT / 180.0
    lat_r = math.radians(lat)
    y = math.log(math.tan(math.pi / 4 + lat_r / 2)) * ORIGIN_SHIFT / math.pi
    return x, y


def _tile_size_meters(z: int) -> float:
    return 2 * ORIGIN_SHIFT / (2 ** z)


def _lonlat_to_tile_px(lon: float, lat: float, z: int) -> tuple[float, float, int, int]:
    """Convert lon/lat to (px, py, tile_x, tile_y) in XYZ convention at zoom *z*."""
    x_m, y_m = _lonlat_to_webmerc(lon, lat)
    ts = _tile_size_meters(z)
    global_x = (x_m + ORIGIN_SHIFT) / ts * TILE_SIZE
    global_y = (ORIGIN_SHIFT - y_m) / ts * TILE_SIZE
    tile_x = int(global_x // TILE_SIZE)
    tile_y = int(global_y // TILE_SIZE)
    px = global_x - tile_x * TILE_SIZE
    py = global_y - tile_y * TILE_SIZE
    return px, py, tile_x, tile_y


# ---------------------------------------------------------------------------
# Color ramp
# ---------------------------------------------------------------------------

def _heat_color(normalized: float) -> tuple[int, int, int, int]:
    """Map a 0–1 normalized weight to an RGBA tuple using the heat gradient."""
    if normalized <= 0:
        return (0, 0, 0, 0)
    if normalized >= 1:
        return _HEAT_STOPS[-1][1]
    for i in range(len(_HEAT_STOPS) - 1):
        t0, c0 = _HEAT_STOPS[i]
        t1, c1 = _HEAT_STOPS[i + 1]
        if t0 <= normalized <= t1:
            f = (normalized - t0) / (t1 - t0) if t1 > t0 else 0
            return tuple(int(c0[k] + (c1[k] - c0[k]) * f) for k in range(4))
    return _HEAT_STOPS[-1][1]


def _mono_color(normalized: float, base_hex: str) -> tuple[int, int, int, int]:
    """Map a 0–1 normalized weight to an RGBA tuple using a single hue."""
    if normalized <= 0:
        return (0, 0, 0, 0)
    base_hex = base_hex.lstrip("#")
    r = int(base_hex[0:2], 16)
    g = int(base_hex[2:4], 16)
    b = int(base_hex[4:6], 16)
    alpha = int(255 * min(1.0, normalized))
    return (r, g, b, alpha)


def _weight_to_color(normalized: float, color_ramp: str, base_color: str) -> tuple[int, int, int, int]:
    if color_ramp == "mono":
        return _mono_color(normalized, base_color)
    return _heat_color(normalized)


# ---------------------------------------------------------------------------
# MBTiles writer
# ---------------------------------------------------------------------------

def _init_mbtiles(path: str, name: str, bounds: list[float], min_zoom: int, max_zoom: int) -> sqlite3.Connection:
    if os.path.exists(path):
        os.remove(path)
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE metadata (name TEXT, value TEXT)"
    )
    conn.execute(
        "CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB)"
    )
    conn.execute(
        "CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row)"
    )
    md = {
        "name": name,
        "format": "png",
        "bounds": ",".join(f"{v:.6f}" for v in bounds),
        "minzoom": str(min_zoom),
        "maxzoom": str(max_zoom),
        "type": "overlay",
    }
    for k, v in md.items():
        conn.execute("INSERT INTO metadata (name, value) VALUES (?, ?)", (k, v))
    conn.commit()
    return conn


def _write_tile(conn: sqlite3.Connection, z: int, x: int, y_xyz: int, png_bytes: bytes) -> None:
    tms_y = (2 ** z - 1) - y_xyz
    conn.execute(
        "INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)",
        (z, x, tms_y, png_bytes),
    )


# ---------------------------------------------------------------------------
# Tile rendering
# ---------------------------------------------------------------------------

def _render_tile(
    cells: list[dict],
    z: int,
    tile_x: int,
    tile_y: int,
    p95: float,
    color_ramp: str,
    base_color: str,
) -> bytes | None:
    """Render a 256×256 PNG tile for the given cells that intersect (tile_x, tile_y) at zoom z.

    Each cell dict: {"verts": [(lat,lon), ...], "weight": float}
    """
    img = Image.new("RGBA", (TILE_SIZE, TILE_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    ts = _tile_size_meters(z)
    tile_origin_x_m = tile_x * ts - ORIGIN_SHIFT
    tile_origin_y_m = ORIGIN_SHIFT - tile_y * ts

    any_drawn = False
    for cell in cells:
        verts_px = []
        for lat, lon in cell["verts"]:
            x_m, y_m = _lonlat_to_webmerc(lon, lat)
            px = (x_m - tile_origin_x_m) / ts * TILE_SIZE
            py = (tile_origin_y_m - y_m) / ts * TILE_SIZE
            verts_px.append((px, py))

        normalized = cell["weight"] / p95 if p95 > 0 else 0
        normalized = min(1.0, normalized)
        fill = _weight_to_color(normalized, color_ramp, base_color)
        if fill[3] == 0:
            continue
        # Clamp vertices to tile bounds (with small bleed for edge cells)
        verts_px = [(max(-1, min(TILE_SIZE + 1, px)), max(-1, min(TILE_SIZE + 1, py))) for px, py in verts_px]
        if len(verts_px) >= 3:
            draw.polygon(verts_px, fill=fill)
            any_drawn = True

    if not any_drawn:
        return None

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# S2 column detection
# ---------------------------------------------------------------------------

_S2_COL_RE = re.compile(r"^s2_cell_l(\d+)$")


def _detect_s2_columns(df: pd.DataFrame) -> list[tuple[str, int]]:
    """Find all s2_cell_l<N> columns and return (column_name, level) sorted by level."""
    cols = []
    for col in df.columns:
        m = _S2_COL_RE.match(col)
        if m:
            cols.append((col, int(m.group(1))))
    cols.sort(key=lambda c: c[1])
    return cols


# ---------------------------------------------------------------------------
# Main conversion function
# ---------------------------------------------------------------------------

def convert_parquet_to_mbtiles(
    parquet_path: str,
    output_mbtiles_path: str,
    weight_col: str = "unique_mmsi_count",
    max_zoom: int = DEFAULT_MAX_ZOOM,
    color_ramp: str = "heat",
    base_color: str = "#3388ff",
    layer_name: str = "density",
) -> dict:
    """Convert a parquet file with S2 cell IDs into a raster MBTiles pyramid.

    Returns dict with keys: cell_count, bounds, min_zoom, native_max_zoom, max_zoom.
    """
    start_time = time.time()
    logger.info("Starting parquet -> MBTiles conversion: %s -> %s", parquet_path, output_mbtiles_path)
    logger.info("Options: weight_col=%s, max_zoom=%s, color_ramp=%s", weight_col, max_zoom, color_ramp)

    if not os.path.isfile(parquet_path):
        raise ValidationError(f"Parquet file not found: {parquet_path}")

    if color_ramp not in ("heat", "mono"):
        raise ValidationError(
            f"Invalid color_ramp: '{color_ramp}'. Must be 'heat' or 'mono'."
        )

    if max_zoom < 1 or max_zoom > 18:
        raise ValidationError(
            f"Invalid max_zoom: {max_zoom}. Must be between 1 and 18."
        )

    # Read parquet
    try:
        logger.info("Reading parquet file...")
        df = pd.read_parquet(parquet_path)
    except Exception as e:
        raise ValidationError(f"Failed to read parquet file: {e}")

    logger.info("Read %d rows, %d columns: %s", len(df), len(df.columns), list(df.columns))
    if df.empty:
        raise ValidationError("Parquet file is empty")

    # Detect S2 columns
    s2_cols = _detect_s2_columns(df)
    if not s2_cols:
        raise ValidationError(
            f"No s2_cell_l<N> columns found. Available columns: {list(df.columns)}"
        )

    logger.info("Detected S2 cell columns: %s", [f"{c}(L{lv})" for c, lv in s2_cols])

    if weight_col not in df.columns:
        raise ValidationError(
            f"Weight column '{weight_col}' not found. Available columns: {list(df.columns)}"
        )

    logger.info("Using weight column: %s", weight_col)

    # Determine zoom bands per S2 level
    levels_info = []
    for col_name, level in s2_cols:
        nz = _native_zoom_for_level(level)
        nz = min(nz, max_zoom)  # cap at user-requested max
        levels_info.append({"col": col_name, "level": level, "native_zoom": nz})

    # Assign contiguous zoom bands
    # Sort by native_zoom; coarser levels cover lower zooms
    levels_info.sort(key=lambda x: x["native_zoom"])
    bands = []
    for i, info in enumerate(levels_info):
        if i == 0:
            z_start = DEFAULT_MIN_ZOOM
        else:
            z_start = levels_info[i - 1]["native_zoom"] + 1
        if i < len(levels_info) - 1:
            z_end = levels_info[i]["native_zoom"]
            # boundary: midpoint between this and next level's native zoom
            next_nz = levels_info[i + 1]["native_zoom"]
            boundary = (info["native_zoom"] + next_nz) // 2
            z_end = min(boundary, info["native_zoom"])
        else:
            z_end = info["native_zoom"]
        z_end = min(z_end, max_zoom)
        if z_start <= z_end:
            bands.append({**info, "z_start": z_start, "z_end": z_end})

    if not bands:
        raise ValidationError(
            "No valid zoom bands could be computed. Check max_zoom and S2 cell levels."
        )

    native_max_zoom = max(b["z_end"] for b in bands)
    logger.info(
        "Zoom bands: %s, native_max_zoom=%d",
        [f"{b['col']} z{b['z_start']}-{b['z_end']}" for b in bands],
        native_max_zoom,
    )

    # Aggregate and render per band
    all_bounds = [float("inf"), float("inf"), float("-inf"), float("-inf")]
    total_cells = 0
    tiles_written = 0

    conn = None
    for band in bands:
        col = band["col"]
        level = band["level"]
        z_start = band["z_start"]
        z_end = band["z_end"]
        band_start = time.time()
        logger.info("Processing S2 level %d (%s), zooms %d-%d", level, col, z_start, z_end)

        # Aggregate weight per cell
        agg = df.groupby(col)[weight_col].sum().reset_index()
        agg = agg[agg[weight_col] > 0]
        if agg.empty:
            continue

        total_cells += len(agg)
        logger.info("  %d unique cells with positive weight", len(agg))

        # Compute p95 for normalization
        p95 = float(agg[weight_col].quantile(WEIGHT_PERCENTILE / 100.0))
        if p95 <= 0:
            p95 = float(agg[weight_col].max())
        if p95 <= 0:
            continue

        # Pre-compute cell vertices (lat/lng) for all unique cells
        cell_data = []
        valid_cells = 0
        invalid_cells = 0
        for _, row in agg.iterrows():
            signed_id = int(row[col])
            unsigned_id = _signed_to_unsigned(signed_id)
            try:
                verts = _cell_vertices_latlng(unsigned_id)
                valid_cells += 1
            except Exception:
                invalid_cells += 1
                continue
            weight = float(row[weight_col])
            cell_data.append({"verts": verts, "weight": weight})
            # Update bounds
            for lat, lon in verts:
                if lat < all_bounds[1]:
                    all_bounds[1] = lat
                if lat > all_bounds[3]:
                    all_bounds[3] = lat
                if lon < all_bounds[0]:
                    all_bounds[0] = lon
                if lon > all_bounds[2]:
                    all_bounds[2] = lon

        logger.info("  Decoded %d valid cell polygons (%d invalid)", valid_cells, invalid_cells)
        if not cell_data:
            continue

        # Render each zoom level in the band
        for z in range(z_start, z_end + 1):
            # Group cells by destination tile(s)
            tile_cells: dict[tuple[int, int], list[dict]] = {}

            for cell in cell_data:
                # Compute which tile(s) this cell's bounding box touches
                min_px = min_py = float("inf")
                max_px = max_py = float("-inf")
                tile_coords = set()
                for lat, lon in cell["verts"]:
                    px, py, tx, ty = _lonlat_to_tile_px(lon, lat, z)
                    min_px = min(min_px, px)
                    min_py = min(min_py, py)
                    max_px = max(max_px, px)
                    max_py = max(max_py, py)
                    tile_coords.add((tx, ty))

                # Also add tiles that the cell bbox spans (cell may cross tile boundaries)
                if len(tile_coords) == 1:
                    tx, ty = tile_coords.pop()
                    tile_cells.setdefault((tx, ty), []).append(cell)
                else:
                    # Cell spans multiple tiles — add to each touched tile
                    for tx, ty in tile_coords:
                        tile_cells.setdefault((tx, ty), []).append(cell)

            level_tiles = 0
            # Render each populated tile
            for (tx, ty), cells in tile_cells.items():
                png_bytes = _render_tile(cells, z, tx, ty, p95, color_ramp, base_color)
                if png_bytes is not None:
                    if conn is None:
                        conn = _init_mbtiles(
                            output_mbtiles_path, layer_name,
                            all_bounds if all_bounds[0] != float("inf") else [-180, -85, 180, 85],
                            DEFAULT_MIN_ZOOM, native_max_zoom,
                        )
                    _write_tile(conn, z, tx, ty, png_bytes)
                    level_tiles += 1
            logger.info("    z=%d: wrote %d tiles", z, level_tiles)
            tiles_written += level_tiles
        logger.info("  Band L%d complete in %.1fs", level, time.time() - band_start)

    if conn is None:
        raise ValidationError("No tiles were generated. The parquet file may contain only zero-weight cells.")

    logger.info(
        "Conversion complete: %d cells, %d tiles written, bounds=%s in %.1fs",
        total_cells,
        tiles_written,
        all_bounds if all_bounds[0] != float("inf") else [-180, -85, 180, 85],
        time.time() - start_time,
    )

    # Update metadata bounds now that we know the full extent
    if all_bounds[0] != float("inf"):
        conn.execute("UPDATE metadata SET value = ? WHERE name = 'bounds'", (",".join(f"{v:.6f}" for v in all_bounds),))
        conn.commit()

    conn.close()

    return {
        "cell_count": total_cells,
        "tiles_written": tiles_written,
        "bounds": all_bounds if all_bounds[0] != float("inf") else [-180, -85, 180, 85],
        "min_zoom": DEFAULT_MIN_ZOOM,
        "native_max_zoom": native_max_zoom,
        "max_zoom": max_zoom,
    }
