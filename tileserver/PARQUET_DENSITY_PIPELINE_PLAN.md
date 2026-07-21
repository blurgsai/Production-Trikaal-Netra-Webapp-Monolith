# Plan: Parquet (S2 Cell) → MBTiles Density Layer Pipeline

**Status:** Planning only — not yet implemented.
**Scope:** `tileserver/` service, `overlays` feature (+ one small generic addition to `tiles/repository`).
**Goal:** Admin uploads a `.parquet` S2-cell density file (e.g. `traffic_density.parquet`) via `POST /overlays/upload`. Tileserver rasterizes it into a **filled-cell** tile pyramid (each S2 cell rendered as its actual polygon footprint, not a point/blob) stored as a standard `.mbtiles` file, registers it as an overlay, and serves it up to **zoom 18** through the **existing** `/tiles/{overlay_id}/{z}/{x}/{y}.png` pipeline.

## 0. Confirmed input schema (inspected `/home/pavankumarkona/Downloads/traffic_density.parquet`)

```
month               object   e.g. "2022-02"
s2_cell_l8          int64    S2 CellId, level 8  (~31 km edge), stored as signed two's-complement of the uint64 id
s2_cell_l12         int64    S2 CellId, level 12 (~2 km edge),  same signed-uint64 encoding
vessel_category     object
mmsis               object
unique_mmsi_count   int64    aggregate weight (already pre-aggregated per cell/month/category)
```

- 2,298,432 rows → 79,103 unique `s2_cell_l8` values, 1,950,652 unique `s2_cell_l12` values.
- **No lat/lon columns.** Coordinates must be derived from the S2 cell IDs via `s2sphere` (already installed in the venv, confirmed via `CellId(uint64_id).to_point()` / `Cell.get_vertex(i)`).
- Sign fix confirmed: `unsigned_id = signed_id & 0xFFFFFFFFFFFFFFFF` before constructing `CellId` (parquet stores the id as signed int64; S2 ids are unsigned uint64).
- **Density = filled S2 cell**, not a point/Gaussian splat — each row represents an exact rectangular(ish) S2 cell on the sphere, so the tile must paint the *entire cell footprint*, colored/shaded by `unique_mmsi_count` (summed across `month`/`vessel_category` per cell for the MVP — see open question #1).

---

## 1. Why this fits the existing architecture

Reviewed:
- `tileserver/src/features/overlays/services/__init__.py` — upload dispatch by extension (`_EXTENSION_TO_SOURCE_TYPE`), vector path converts to GeoPackage + GeoServer (`_convert_and_publish_to_geoserver`).
- `tileserver/src/features/overlays/repository/__init__.py` — `insert_file_overlay(name, source_type, file_path, ...)`; when `source_type in ("mbtiles","sqlite","directory")` it auto-derives `tile_url = /tiles/{overlay_id}/{z}/{x}/{y}.png`.
- `tileserver/src/features/tiles/repository/__init__.py` — `_read_mbtiles_tile` already reads any standard MBTiles sqlite (TMS row-flip: `tms_y = (2**z - 1) - y`).
- `tileserver/src/features/tiles/services/__init__.py` — `read_overlay_tile` already falls back to overlay lookup + `_TILE_READERS["mbtiles"]`.
- `tileserver/.importlinter` — strict layering: `repository → services → router`, `shared` only imports `shared`.

**Conclusion:** if we produce a spec-compliant `.mbtiles` raster file and register it with `source_type="mbtiles"`, the entire tile-serving path (`/tiles/{id}/{z}/{x}/{y}.png`) works with only **one small, generic addition** to `tiles/repository` (§3.4 "overzoom" — needed because S2 cells are much larger than a zoom-18 tile and we don't want to physically render/store 4× more tiles per zoom level all the way to 18). No changes to `tiles/router` or `tiles/services`.

### Why we can't just render zoom 0–18 directly (tile-count blow-up)

- `s2_cell_l12` edge ≈ **1.96 km**. At zoom 14 a tile is ≈ 9.6 km/side → a cell ≈ 1/5 of a tile (crisp, appropriate resolution). This is the **native max zoom** for the L12 layer.
- At zoom 18 a tile is ≈ 0.6 km/side → **one L12 cell would span roughly 13×13 = 169 tiles**, all identical solid color, for 1.95M cells. That is billions of redundant identical tiles — not viable to precompute/store.
- **Solution:** render real tiles only up to each S2 level's *native max zoom* (computed automatically from cell size), store that as the MBTiles `maxzoom`, and let the tile-read path **overzoom** (crop + nearest-neighbor magnify the ancestor tile) for any request between `native_max_zoom` and 18. Because the source data is piecewise-solid-color rectangles, magnifying is lossless/artifact-free — it reproduces exactly what re-rendering the polygon at that zoom would have produced.

---

## 2. New dependencies (`tileserver/requirements.txt`)

```
pandas==2.3.3           # parquet aggregation (already verified installed)
pyarrow==23.0.1          # parquet engine for pandas
numpy==2.4.6             # array math / rasterization buffers
Pillow==10.4.0           # PNG tile encoding + polygon fill (ImageDraw)
s2sphere==0.2.5          # decode S2 CellId -> lat/lng cell polygon vertices
```

(Versions pinned to what's already present in the current Python environment — verified via `pip list`/import checks; adjust if the tileserver's actual venv/lockfile differs.)

Rationale: no GDAL/fiona needed for this path (S2 cell geometry is simple quads handled by `s2sphere` + `Pillow`, not a GDAL vector format). `Dockerfile` needs no new system packages.

---

## 3. New module: `tileserver/src/shared/density_converter.py`

Mirrors `vector_converter.py`'s role but outputs an MBTiles pyramid instead of a GeoPackage.

### 3.1 Public function

```python
def convert_parquet_to_mbtiles(
    parquet_path: str,
    output_mbtiles_path: str,
    weight_col: str = "unique_mmsi_count",
    max_zoom: int = 18,               # user-facing max; tiles beyond native_max_zoom are served via overzoom (§3.4)
    color_ramp: str = "heat",         # "heat" (blue->cyan->yellow->red) or "mono" (transparent -> overlay `color`)
) -> dict:
    """Returns {
        "cell_count": int,
        "bounds": [minlon, minlat, maxlon, maxlat],
        "min_zoom": int,
        "native_max_zoom": int,   # highest zoom actually rasterized/stored
        "max_zoom": int,          # == input max_zoom; served via overzoom above native_max_zoom
    }"""
```

Auto-detects which S2 columns are present (`s2_cell_l8`, `s2_cell_l12`, …) — any `s2_cell_l<N>` column found is used as one rendering "pass" at its own native zoom band, so both the coarse (L8) and fine (L12) cells contribute to the pyramid at the zoom range where each is appropriately sized (see §3.2 step 2).

### 3.2 Algorithm — render the **actual S2 cell polygon**, not a point/blob

1. **Read & aggregate**: for each `s2_cell_l<N>` column present, `df.groupby(f"s2_cell_l{N}")[weight_col].sum()` — sums `unique_mmsi_count` across `month`/`vessel_category` per cell (MVP behavior; see open question #1 for per-month/category filtering later).
   - Missing `weight_col` → `ValidationError` listing available columns.
   - Empty result → `ValidationError("No cells found in parquet file")`.
2. **Determine each S2 level's native zoom band** — compute automatically from cell edge length so a cell renders at roughly 4–20 px/side (crisp, not blocky-huge nor sub-pixel):
   - `cell_edge_m(level)` via `s2sphere`: get one representative cell's 4 `Cell.get_vertex(i)` points, convert to Web-Mercator meters, take the mean edge length.
   - `native_zoom_for_level(level) = round(log2(2*ORIGIN_SHIFT / (cell_edge_m * PIXELS_PER_CELL_TARGET)))`, with `PIXELS_PER_CELL_TARGET ≈ 8`.
   - For the confirmed data: **L8 → native zoom ≈ 8–9** (covers `min_zoom..~9`), **L12 → native zoom ≈ 13–14** (covers `~10..native_max_zoom`). Bands are assigned contiguously: coarser level renders `min_zoom..band_boundary`, finer level renders `band_boundary+1..native_max_zoom`, where `band_boundary` is the midpoint between the two levels' native zooms (falls back gracefully if only one S2 column is present).
   - `native_max_zoom = max(native_zoom_for_level(l) for l in present_levels)`, **capped at the user-supplied `max_zoom`** (so a caller who passes `max_zoom=10` never renders finer than that, even if L12 data would natively want zoom 14).
3. **Per rendering band** (one S2 level, one contiguous zoom range `z_start..z_end`):
   - For **every zoom `z` in the band**, project each cell's 4 vertices (lat/lng from `s2sphere.Cell(CellId(unsigned_id)).get_vertex(i)`) to Web Mercator meters, then to pixel coords within the global `z` raster (`px = (x_m + ORIGIN_SHIFT) / tile_size_m(z) * 256`, same for `py` with the Y flip).
   - **Group cells by which output tile(s) their vertex bounding box touches** (`tile_x = floor(px/256)`, `tile_y_xyz = floor(py/256)`) — at a cell's native zoom this is normally exactly 1 tile; at coarser zooms within the band it may span a few, at finer zooms a cell may be smaller than a tile (fine, drawn as a small quad within one tile).
   - **Per tile**: open (or create) a 256×256 RGBA canvas (`numpy` array, reused across cells in that tile), and for every cell intersecting the tile, draw the filled quad in **local tile pixel coordinates** using `PIL.ImageDraw.polygon(xy, fill=rgba)` — this paints the **entire cell footprint**, not a single point.
     - Color/alpha per cell comes from `weight_col`, normalized against a **global percentile** (95th) computed once per rendering band so intensity is comparable across all tiles/zooms in that band.
     - `"heat"`: fixed multi-stop gradient (transparent → blue → cyan → yellow → red) keyed by normalized weight.
     - `"mono"`: transparent → the overlay's `color` hex, alpha scaled by normalized weight (fits existing `color`/`opacity` overlay model).
     - When multiple cells overlap a tile (adjacent same-level cells at a coarse zoom), later draws simply overwrite/blend — S2 cells at a fixed level never overlap each other, so this only happens at zoom levels *coarser* than the cell's native zoom, where adjacent cells legitimately tile side-by-side within the same output tile.
   - **Skip/discard fully-transparent tiles** (no cells intersected) — keeps the MBTiles file small.
4. **Encode** each populated tile canvas to PNG (`Image.fromarray(rgba, "RGBA").save(buf, "PNG")`).
5. **Write MBTiles** (spec-compliant, matches `mbtiles-spec` 1.3):
   - `metadata` table: `name`, `format=png`, `bounds`, `minzoom`, `maxzoom=native_max_zoom`, `type=overlay`.
   - `tiles` table: `(zoom_level, tile_column, tile_row, tile_data)` with `tile_row = (2**z - 1) - tile_y_xyz` (TMS row-flip), matching `_read_mbtiles_tile`'s de-flip exactly.
   - `CREATE UNIQUE INDEX` on `(zoom_level, tile_column, tile_row)`.
   - Store the **requested** `max_zoom` (up to 18) separately in the `overlays` DB row (not in the MBTiles `metadata.maxzoom`, which stays at `native_max_zoom`) so the tile-read overzoom logic (§3.4) knows how far to extrapolate.

### 3.3 Constants

```python
ORIGIN_SHIFT = 20037508.34
DEFAULT_MIN_ZOOM = 0
DEFAULT_MAX_ZOOM = 18          # per requirement — served natively up to native_max_zoom, then via overzoom
PIXELS_PER_CELL_TARGET = 8      # target on-screen size of one S2 cell at its native zoom
WEIGHT_PERCENTILE = 95          # normalization cap for color intensity
```

### 3.4 New generic capability: tile "overzoom" fallback in `tiles/repository/__init__.py`

**This is the one non-`shared` file that needs a change**, but it's a small, generic, backward-compatible addition — any `mbtiles`/`sqlite` source benefits (not just density layers), since MBTiles files commonly don't store every zoom level.

```python
def _read_mbtiles_tile(file_path: str, z: int, x: int, y: int) -> bytes | None:
    tile = _read_mbtiles_tile_exact(file_path, z, x, y)
    if tile is not None:
        return tile
    return _overzoom(file_path, z, x, y, _read_mbtiles_tile_exact, max_backtrack=6)


def _overzoom(file_path, z, x, y, exact_reader, max_backtrack=6):
    """If (z,x,y) isn't stored, walk up to the ancestor tile that IS stored and
    crop+nearest-upsample the matching quadrant. Lossless for solid-fill data."""
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
```
- `_crop_and_upsample` (new small helper, `PIL`-based): opens the parent PNG, computes which `256/2**levels_up`-sized sub-region of it corresponds to `(x, y)` at the descendant zoom, crops that sub-region, and resizes to 256×256 with `Image.NEAREST` (no interpolation — preserves crisp cell-boundary edges rather than blurring them).
- Applied identically to `_read_sqlite_tile` (same TMS scheme, same helper reused).
- `_read_directory_tile` is left untouched (directory tile sets are typically pre-generated externally with all zooms already present).
- **Bounded cost**: `max_backtrack=6` (e.g. native zoom 14 → covers requests up to zoom 20) keeps the fallback O(1) small crops, never a full re-render.
- **No signature/behavior change** for existing callers — `read_tile`/`read_overlay_tile`/`get_tile_data` call sites in `tiles/services` and `tiles/router` are untouched; overzoom is purely internal to the two reader functions.

---

## 4. `overlays` feature changes

### 4.1 `schemas/__init__.py`
Add an optional request model for parquet-specific form parameters (used only for OpenAPI docs clarity; actual endpoint uses `Form(...)` per existing convention):

```python
class DensityUploadOptions(BaseModel):
    weight_col: str = "unique_mmsi_count"
    max_zoom: int = 18
    color_ramp: str = "heat"   # "heat" | "mono"
```
(Not strictly required since it's multipart form data, but documents the contract. No `lat_col`/`lon_col` — coordinates are derived from the auto-detected `s2_cell_l*` columns, not passed by the caller.)

### 4.2 `services/__init__.py`
- Add `".parquet": "parquet"` to `_EXTENSION_TO_SOURCE_TYPE`.
- Add new private function, sibling to `_convert_and_publish_to_geoserver`:

```python
def _convert_and_publish_density(
    overlay_id, name, source_path, attribution, color, opacity,
    weight_col, max_zoom, color_ramp,
) -> dict:
    mbtiles_path = os.path.join(DATA_DIR, f"{overlay_id}.mbtiles")
    result = convert_parquet_to_mbtiles(
        source_path, mbtiles_path, weight_col=weight_col,
        max_zoom=max_zoom, color_ramp=color_ramp,
    )
    if os.path.isfile(source_path) and source_path != mbtiles_path:
        os.remove(source_path)   # drop raw parquet, keep only the tile pyramid (mirrors gpkg cleanup)
    return insert_file_overlay(
        name, "mbtiles", mbtiles_path, attribution, color, opacity,
        overlay_id=overlay_id, bounds=result["bounds"],
        max_zoom=result["max_zoom"],   # requested max (up to 18); native_max_zoom stored inside the .mbtiles itself
    )
```
- In `upload_overlay(...)`, extend signature with the new optional params (defaulted, so basemap/other overlay calls are unaffected) and branch:

```python
if source_type == "parquet":
    return _convert_and_publish_density(
        overlay_id, name, dest_path, attribution, color, opacity,
        weight_col, max_zoom, color_ramp,
    )
```
- `tile_url` for this overlay ends up as the **default** `/tiles/{overlay_id}/{z}/{x}/{y}.png` (from `insert_file_overlay`'s existing `source_type in ("mbtiles", ...)` branch) — requests for `z` up to 18 are satisfied by the overzoom fallback in §3.4 once `z > native_max_zoom`.

### 4.3 `repository/__init__.py`
Small addition: `insert_file_overlay(...)` gains an optional `max_zoom: int | None = None` kwarg, stored in a new nullable `max_zoom` column on the `overlays` table (idempotent migration like the existing `_migrate_add_bounds_column`). Used only to advertise the layer's effective max zoom to the frontend (e.g. to clamp `flyTo`/zoom controls); **not required** for tile serving itself, since overzoom in `tiles/repository` derives everything it needs from the `.mbtiles` file's own `metadata.maxzoom`, independent of this DB column.

### 4.4 `router/__init__.py`
Extend `upload_overlay_route` with optional form fields (all with sane defaults so existing GeoJSON/KML/mbtiles/zip uploads are unaffected):

```python
@router.post("/upload", response_model=OverlayResponse, status_code=status.HTTP_201_CREATED)
async def upload_overlay_route(
    name: str = Form(...),
    file: UploadFile = File(...),
    attribution: str = Form(""),
    color: str = Form("#3388ff"),
    opacity: float = Form(1.0),
    weight_col: str = Form("unique_mmsi_count"),
    max_zoom: int = Form(18),
    color_ramp: str = Form("heat"),
    _admin: dict = Depends(require_admin),
) -> dict:
    return upload_overlay(
        name, file.filename, file.file, attribution, color, opacity,
        weight_col=weight_col, max_zoom=max_zoom, color_ramp=color_ramp,
    )
```
These extra fields are simply ignored by `upload_overlay` for non-parquet source types — keep the function signature backward compatible with defaults.

---

## 5. Validation & error handling (matches `ValidationError` / `NotFoundError` conventions)

- No `s2_cell_l*` column found in parquet → `ValidationError` listing actual columns.
- Missing `weight_col` → `ValidationError` listing available columns.
- Empty/all-null cell data after aggregation → `ValidationError`.
- `max_zoom > 18` or `max_zoom < 1` → `ValidationError`.
- `color_ramp` not in `{"heat", "mono"}` → `ValidationError`.
- Corrupt/unreadable parquet (pyarrow exception) → wrap and re-raise as `ValidationError`.
- Cell ID that doesn't decode to a valid `s2sphere.CellId` (defensive — malformed data) → skip the row with a logged warning rather than failing the whole upload.

---

## 6. Performance / size considerations for large files (e.g. AIS "traffic_density")

- Confirmed file: 2.3M rows → aggregates down to 79K (L8) + 1.95M (L12) unique cells. Aggregation (`groupby.sum`) and Web-Mercator projection are fully vectorized (`pandas`/`numpy`), no Python-level per-row loops for the math.
- The per-tile polygon-draw step (`ImageDraw.polygon`) is the one genuinely per-cell loop (S2 cell geometry isn't trivially vectorizable into raster fills) — but it's bounded by **tile count at native zoom**, not raw row count: grouping cells by destination tile first means each tile canvas is touched only by the handful of cells that actually intersect it (~1–4 for L12 at its native zoom).
- Rendering stops at `native_max_zoom` (≈13–14 for L12 data), **not 18** — this is what makes "up to 18 zoom levels" tractable; the expensive polygon rasterization happens once per cell per band, not once per cell per zoom-0-to-18.
- **Synchronous MVP**: runs inline in the `POST /overlays/upload` request (same as current GeoJSON/KML/ENC conversion, which is also synchronous today). Given ~2M cells to rasterize, this may take tens of seconds to a few minutes — acceptable for an admin upload flow but worth surfacing a clear "processing…" state in the frontend even without full async support.
- **Phase 2 (optional, if this proves too slow)**: move conversion to `fastapi.BackgroundTasks`, add an overlay `status` column (`processing` / `ready` / `failed`), return `202 Accepted` immediately, frontend polls `GET /overlays` until `status="ready"`. Not required for MVP.

---

## 7. Testing plan

- **Unit** (`tileserver` currently has no visible test suite — check `tileserver/` for a `tests/` dir before deciding framework; likely `pytest`):
  - `density_converter.convert_parquet_to_mbtiles` with a small synthetic parquet (a few dozen known S2 cell IDs at L8 and L12 with known `unique_mmsi_count`) → assert output `.mbtiles` has valid `metadata`+`tiles` tables, `maxzoom == native_max_zoom`, and that a tile known to contain a cell is fully/partially opaque at the cell's exact expected pixel region (not just "non-empty" — verify the **shape** is a filled rectangle, not a single dot).
  - `_overzoom`/`_crop_and_upsample` unit test: given a synthetic parent tile with a known solid-color quadrant, assert the cropped+upsampled child tile is pixel-identical to what re-rendering at the child zoom would produce.
  - Round-trip: `tiles.repository._read_mbtiles_tile` on a stored `(z,x,y)` → non-empty PNG; on `(z,x,y)` beyond `native_max_zoom` → overzoom path returns a valid crop, not `None`.
  - Validation errors (missing `s2_cell_l*` columns, missing weight column, bad zoom range).
- **Integration**:
  - `POST /overlays/upload` with the real `/home/pavankumarkona/Downloads/traffic_density.parquet` (or a trimmed fixture) → assert `201`, `source_type == "mbtiles"`.
  - `GET /tiles/{id}/{z}/{x}/{y}.png` for a known dense tile at `native_max_zoom` → `200 image/png`; same request at `z=18` → `200 image/png` via overzoom (not 404).
  - `DELETE /overlays/{id}` → confirm `.mbtiles` file removed (existing `remove_overlay` cleanup already handles this, no change needed).

---

## 8. Frontend touch points (out of stated scope, listed for completeness only)

- `frontend/src/features/admin/api/overlaysApi.ts` — `uploadOverlayFile` would need optional params for `weight_col`/`max_zoom`/`color_ramp` if the admin UI wants to expose them; the `unique_mmsi_count` + `max_zoom=18` defaults work silently otherwise.
- `frontend/src/features/admin/ui/OverlayManagement.tsx` — file picker `accept` attribute would need `.parquet` added.
- No change needed in map rendering components (`MapOverlays.tsx`, etc.) — a `source_type="mbtiles"` overlay already renders like any other raster tile overlay, and now transparently supports zoom up to 18 via the tileserver's overzoom fallback.

---

## 9. File-by-file change summary

| File | Change |
|---|---|
| `tileserver/requirements.txt` | add `pandas`, `pyarrow`, `numpy`, `Pillow`, `s2sphere` |
| `tileserver/src/shared/density_converter.py` | **new** — S2 cell → filled-polygon → mbtiles renderer |
| `tileserver/src/features/overlays/services/__init__.py` | add `.parquet` mapping, `_convert_and_publish_density`, extend `upload_overlay` signature |
| `tileserver/src/features/overlays/router/__init__.py` | add optional form fields (`weight_col`, `max_zoom`, `color_ramp`) to `/overlays/upload` |
| `tileserver/src/features/overlays/schemas/__init__.py` | add `DensityUploadOptions` (docs-only) |
| `tileserver/src/features/overlays/repository/__init__.py` | add optional `max_zoom` column + kwarg on `insert_file_overlay` (advisory metadata only) |
| `tileserver/src/features/tiles/repository/__init__.py` | add generic `_overzoom`/`_crop_and_upsample` fallback for `mbtiles`/`sqlite` readers |
| `tileserver/src/features/tiles/router/__init__.py`, `tiles/services/__init__.py` | **no change** |
| `tileserver/.importlinter` | **no change** — `density_converter.py` lives in `shared`, imported only by `services`; `tiles/repository`'s new helpers are private, same-layer additions (already legal) |

---

## 10. Resolved / remaining open questions

**Resolved from recent input:**
1. ~~Parquet schema~~ → confirmed: `s2_cell_l8`, `s2_cell_l12`, `unique_mmsi_count` (+ `month`, `vessel_category`, `mmsis`).
2. ~~Point vs. cell rendering~~ → **entire S2 cell footprint is filled**, not a point/blob (§3.2).
3. ~~Zoom range~~ → **up to zoom 18**, via native rendering + overzoom fallback (§3.4).

**Still open:**
1. Should `month`/`vessel_category` be filterable (e.g. one overlay per month, or a query-param to slice by category), or is a single overlay aggregating **all** rows (current MVP plan) sufficient for the first version?
2. Preferred color ramp default — `"heat"` (fixed multi-color gradient) or `"mono"` (single hue driven by the overlay's existing `color` field, consistent with vector overlay styling)?
3. Confirm `unique_mmsi_count` is the correct weight column (vs. deriving density purely from row/cell counts).
