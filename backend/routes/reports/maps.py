import asyncio
import base64
import json
import logging
import os
from io import BytesIO
from typing import Any, Dict, List, Tuple

from PIL import Image
from staticmap import StaticMap, Line, CircleMarker

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Density tile layer configuration
# ---------------------------------------------------------------------------

_DENSITY_TILE_URL = os.getenv(
    "DENSITY_TILE_URL",
    "https://density-layer-tiles-760940605140.asia-south1.run.app/{z}/{x}/{y}.png",
)

# Self-contained Leaflet HTML page used for density map screenshots.
# __AOI_GEOJSON__ and __DENSITY_URL__ are replaced at runtime.
_DENSITY_MAP_HTML = """\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 800px; height: 500px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var aoi = __AOI_GEOJSON__;
    var map = L.map('map', { zoomControl: false, attributionControl: false });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(map);

    L.tileLayer('__DENSITY_URL__', {
      opacity: 0.75,
      maxZoom: 18
    }).addTo(map);

    var poly = L.geoJSON(aoi, {
      style: {
        color: '#f97316',
        weight: 2.5,
        fillOpacity: 0.08,
        fillColor: '#f97316'
      }
    }).addTo(map);

    map.fitBounds(poly.getBounds(), { padding: [20, 20] });
  </script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Shared internal helper — converts a StaticMap to a base64 PNG.
# Runs in a thread to avoid blocking the async event loop.
# ---------------------------------------------------------------------------

async def _render_map_to_base64(m: StaticMap, zoom=None) -> str:
    """Render a StaticMap to a base64-encoded PNG string, off the event loop."""
    def _sync_render():
        image = m.render(zoom=zoom)
        buf = BytesIO()
        image.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    return await asyncio.to_thread(_sync_render)


# ---------------------------------------------------------------------------
# Public API — density map (Playwright headless screenshot)
# ---------------------------------------------------------------------------

def _unwrap_aoi_geom(aoi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """Return the GeoJSON geometry dict, unwrapping a Feature if necessary."""
    if isinstance(aoi_geojson, dict) and aoi_geojson.get("type") == "Feature":
        return aoi_geojson.get("geometry") or {}
    return aoi_geojson or {}


def get_density_map_html(aoi_geojson: Dict[str, Any]) -> str:
    """
    Build the Leaflet HTML string for the density map without launching Playwright.
    Used by PdfRenderer to reuse its already-open browser for the screenshot,
    avoiding a second separate Chromium launch.

    Returns "" if the AOI geometry is invalid.
    """
    geom = _unwrap_aoi_geom(aoi_geojson)
    if not geom.get("coordinates"):
        return ""
    return (
        _DENSITY_MAP_HTML
        .replace("__AOI_GEOJSON__", json.dumps(aoi_geojson))
        .replace("__DENSITY_URL__", _DENSITY_TILE_URL)
    )


async def generate_density_map_base64(aoi_geojson: Dict[str, Any]) -> str:
    """
    Screenshots a Leaflet map showing OSM tiles + the vessel density tile overlay,
    with the AOI polygon boundary drawn on top.

    Accepts both GeoJSON Geometry (Polygon/MultiPolygon) and Feature objects —
    Leaflet handles both; the geometry is unwrapped only for the validity check.

    Uses Playwright (headless Chromium) via the *sync* API inside asyncio.to_thread().
    This avoids the Windows SelectorEventLoop limitation where async_playwright
    calls asyncio.create_subprocess_exec() which raises NotImplementedError on Windows.

    Returns a base64-encoded PNG string, or "" on failure.
    """
    geom = _unwrap_aoi_geom(aoi_geojson)
    if not geom.get("coordinates"):
        logger.warning("[Maps] generate_density_map_base64 called with empty or invalid AOI.")
        return ""

    html = get_density_map_html(aoi_geojson)
    if not html:
        return ""

    try:
        def _sync_screenshot(page_html: str) -> bytes:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(viewport={"width": 800, "height": 500})
                page.set_content(page_html, wait_until="networkidle", timeout=30_000)
                result = page.screenshot(type="png")
                browser.close()
            return result

        screenshot_bytes = await asyncio.to_thread(_sync_screenshot, html)
        return base64.b64encode(screenshot_bytes).decode("utf-8")

    except Exception as e:
        logger.error("[Maps] Density map generation failed: %s", e, exc_info=True)
        return ""


# ---------------------------------------------------------------------------
# Event location map (staticmap — same library as trajectory/event maps)
# ---------------------------------------------------------------------------
# Uses staticmap instead of Playwright so there are zero JavaScript or CDN
# dependencies.  Markers are rendered directly by Pillow on server-side tiles.

_SEV_COLORS = {"high": "#ef4444", "warning": "#f59e0b", "info": "#3b82f6"}
_SEV_SIZES  = {"high": 16,        "warning": 12,        "info": 9       }


def _aoi_rings(aoi_geojson: Dict[str, Any]) -> List[List[Tuple[float, float]]]:
    """Return outer rings from a GeoJSON Polygon or MultiPolygon (or Feature).
    Returns [] when aoi_geojson is None — used by InsightReport which has no AOI.
    """
    if not aoi_geojson:
        return []
    geom = aoi_geojson
    if geom.get("type") == "Feature":
        geom = geom.get("geometry") or {}
    gtype = geom.get("type", "")
    if gtype == "Polygon":
        return [geom["coordinates"][0]]
    if gtype == "MultiPolygon":
        return [poly[0] for poly in geom["coordinates"]]
    return []


async def generate_event_heatmap_base64(
    aoi_geojson: Dict[str, Any],
    event_locations: List[Dict[str, Any]],
) -> str:
    """
    Build a staticmap image showing event locations as severity-coloured circles
    inside the AOI polygon outline.

    Switched from Playwright + Leaflet to staticmap (Pillow-based, server-side)
    to eliminate JavaScript / CDN failure modes that caused blank renders.

    Render order (lowest → highest, so critical shows on top):
      info markers → warning markers → high markers → AOI outline

    event_locations: list of {"lat": float, "lon": float, "severity": str}
    """
    if not event_locations:
        return ""

    valid = [
        e for e in event_locations
        if e.get("lat") is not None and e.get("lon") is not None
    ]
    if not valid:
        return ""

    try:
        m = StaticMap(800, 500)

        # AOI polygon outline
        for ring in _aoi_rings(aoi_geojson):
            m.add_line(Line(ring, color="#f97316", width=3))

        # Plot events lowest-severity first so critical renders on top
        for sev in ("info", "warning", "high"):
            for ev in valid:
                if ev.get("severity", "info") != sev:
                    continue
                m.add_marker(CircleMarker(
                    (ev["lon"], ev["lat"]),
                    color=_SEV_COLORS[sev],
                    width=_SEV_SIZES[sev],
                ))

        return await _render_map_to_base64(m)

    except Exception as e:
        logger.error("[Maps] Event heatmap generation failed: %s", e, exc_info=True)
        return ""


# ---------------------------------------------------------------------------
# Public API — track / event maps (staticmap)
# ---------------------------------------------------------------------------

async def generate_trajectory_map_base64(points: List[Tuple[float, float]]) -> str:
    """
    Accepts a chronological list of (lon, lat) tuples.
    Generates an 800×400 StaticMap of the full vessel trajectory.
    Returns a base64-encoded PNG string.
    """
    if not points or len(points) < 2:
        return ""
    try:
        m = StaticMap(800, 400)
        m.add_line(Line(points, color="#ea580c", width=3))
        m.add_marker(CircleMarker(points[0],  color="#16a34a", width=12))  # start
        m.add_marker(CircleMarker(points[-1], color="#dc2626", width=12))  # end
        return await _render_map_to_base64(m)
    except Exception as e:
        logger.error("[Maps] Trajectory map failed: %s", e, exc_info=True)
        return ""


async def generate_event_location_map_base64(lon: float, lat: float) -> str:
    """400×250 StaticMap with a red pin at the event location."""
    try:
        m = StaticMap(400, 250)
        m.add_marker(CircleMarker((lon, lat), color="#dc2626", width=14))
        return await _render_map_to_base64(m, zoom=10)
    except Exception as e:
        logger.error("[Maps] Event location map failed: %s", e, exc_info=True)
        return ""


async def generate_event_playback_map_base64(points: List[Tuple[float, float]]) -> str:
    """
    Accepts a chronological list of (lon, lat) tuples for an event duration.
    Generates a 400×250 StaticMap of the event trajectory segment.
    Falls back to a single location pin if only one point exists.
    """
    if not points:
        return ""
    if len(points) == 1:
        return await generate_event_location_map_base64(points[0][0], points[0][1])
    try:
        m = StaticMap(400, 250)
        m.add_line(Line(points, color="#2563eb", width=4))
        m.add_marker(CircleMarker(points[0],  color="#16a34a", width=10))
        m.add_marker(CircleMarker(points[-1], color="#dc2626", width=10))
        return await _render_map_to_base64(m)
    except Exception as e:
        logger.error("[Maps] Event playback map failed: %s", e, exc_info=True)
        return ""


# ---------------------------------------------------------------------------
# Speed zone heatmap (staticmap — coloured by avg speed per grid cell)
# ---------------------------------------------------------------------------

# Five speed tiers (knots).  Colour matches the legend in generic_report.html.
_SPEED_TIERS: List[Tuple[float, str]] = [
    (20.0, "#ef4444"),   # high speed  — red
    (14.0, "#f59e0b"),   # cruise      — amber
    (7.0,  "#22c55e"),   # transit     — green
    (2.0,  "#3b82f6"),   # slow        — blue
    (0.0,  "#94a3b8"),   # drifting    — slate
]

def _speed_color(kn: float) -> str:
    """Return a hex colour for a given speed in knots."""
    for threshold, color in _SPEED_TIERS:
        if kn >= threshold:
            return color
    return "#94a3b8"


async def generate_speed_heatmap_base64(
    aoi_geojson: Dict[str, Any],
    speed_grid: List[Dict[str, Any]],
) -> str:
    """
    Render a speed zone heatmap from a list of grid cells.

    speed_grid: [{lat, lon, avg_speed_kn, count}, ...]  — from repository.get_speed_grid_in_aoi()

    Each cell is drawn as a colour-coded CircleMarker; size is proportional
    to observation count (min 6 px, max 18 px) so dense zones visually pop.
    The AOI polygon outline is drawn on top (orange, same as density map).

    Uses staticmap (Pillow-based), so no Playwright / CDN required.
    Returns base64 PNG or "" on failure / empty grid.
    """
    if not speed_grid:
        return ""

    try:
        m = StaticMap(800, 500)

        # Compute count range for size normalisation
        counts = [c["count"] for c in speed_grid]
        max_count = max(counts) if counts else 1
        min_size, max_size = 6, 18

        # Plot lowest-speed cells first so faster cells render on top
        for cell in sorted(speed_grid, key=lambda c: c["avg_speed_kn"]):
            lat = cell["lat"]
            lon = cell["lon"]
            spd = cell["avg_speed_kn"]
            cnt = cell["count"]
            color = _speed_color(spd)
            size  = int(min_size + (cnt / max_count) * (max_size - min_size))
            m.add_marker(CircleMarker((lon, lat), color=color, width=size))

        # AOI polygon outline on top
        for ring in _aoi_rings(aoi_geojson):
            m.add_line(Line(ring, color="#f97316", width=3))

        return await _render_map_to_base64(m)

    except Exception as e:
        logger.error("[Maps] Speed heatmap generation failed: %s", e, exc_info=True)
        return ""


# ---------------------------------------------------------------------------
# Per-event-type spatial maps (staticmap — one map per event type)
# ---------------------------------------------------------------------------

async def _generate_single_event_type_map(
    aoi_geojson: Dict[str, Any],
    locations: List[Dict[str, Any]],
) -> str:
    """
    Single-type event location map.  All dots use severity colours so the map
    still conveys intensity even when showing only one event type.
    """
    if not locations:
        return ""
    valid = [loc for loc in locations if loc.get("lat") is not None and loc.get("lon") is not None]
    if not valid:
        return ""
    try:
        m = StaticMap(600, 380)
        for ring in _aoi_rings(aoi_geojson):
            m.add_line(Line(ring, color="#f97316", width=3))
        for sev in ("info", "warning", "high"):
            for loc in valid:
                if loc.get("severity", "info") != sev:
                    continue
                m.add_marker(CircleMarker(
                    (loc["lon"], loc["lat"]),
                    color=_SEV_COLORS[sev],
                    width=_SEV_SIZES[sev],
                ))
        return await _render_map_to_base64(m)
    except Exception as e:
        logger.error("[Maps] Per-type event map failed: %s", e, exc_info=True)
        return ""


async def generate_per_event_type_maps_base64(
    aoi_geojson: Dict[str, Any],
    event_locations_by_type: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, str]:
    """
    Generate one staticmap per event type concurrently.

    event_locations_by_type: {event_type: [{lat, lon, severity}, ...]}
      — from repository.get_event_clusters_in_aoi()["event_locations_by_type"]

    Returns {event_type: base64_png_or_empty_string}.
    Maps for types with no valid locations are silently excluded.
    """
    if not event_locations_by_type:
        return {}

    event_types = list(event_locations_by_type.keys())
    maps = await asyncio.gather(*(
        _generate_single_event_type_map(aoi_geojson, event_locations_by_type[et])
        for et in event_types
    ))
    return {et: b64 for et, b64 in zip(event_types, maps) if b64}
