"""
builders/generic.py — Generic Area Report builder.

Produces a spatial + temporal report for a user-drawn AOI.
Built in phases — each phase adds a new section to `data`:

  Phase 1 (live): Vessel density snapshot  (Playwright tile screenshot)
  Phase 2 (live): Speed profiles           (ClickHouse AOI aggregation)
  Phase 3 (live): Event prone areas        (MongoDB aggregation)

Nothing about rendering (HTML, PDF) lives here.
"""
import asyncio
from datetime import datetime
from typing import Any, Dict, List

from ..maps import (
    generate_density_map_base64,
    generate_event_heatmap_base64,
    generate_speed_heatmap_base64,
    generate_per_event_type_maps_base64,
    get_density_map_html,
    _unwrap_aoi_geom,
)
from .base import BaseReport
from ..constants import DENSITY_MAP_B64_VALUE as _DENSITY_MAP_PENDING


def _aoi_bbox_string(aoi: Dict[str, Any]) -> str:
    """Returns a human-readable bounding box description of the AOI polygon."""
    try:
        geom = _unwrap_aoi_geom(aoi)
        ring = geom.get("coordinates", [[]])[0]
        lons = [p[0] for p in ring]
        lats = [p[1] for p in ring]
        return (
            f"Lat {min(lats):.4f}° – {max(lats):.4f}°  /  "
            f"Lon {min(lons):.4f}° – {max(lons):.4f}°"
        )
    except Exception:
        return "N/A"


class GenericReport(BaseReport):
    TEMPLATE_KEY = "generic"

    def __init__(self, repo, request):
        super().__init__(repo)
        self.aoi        = request.aoi
        self.start_time = request.start_time
        self.end_time   = request.end_time
        self.is_pdf     = (request.format == "pdf")

    async def generate(self) -> Dict[str, Any]:
        if self.is_pdf:
            # For PDF output PdfRenderer will handle the density screenshot inside
            # its own Playwright session, so we skip a separate browser launch here.
            density_map      = _DENSITY_MAP_PENDING
            density_html_src = get_density_map_html(self.aoi)
            speed_data, event_data, speed_grid = await asyncio.gather(
                self.repo.get_speed_profiles_in_aoi(self.aoi, self.start_time, self.end_time),
                self.repo.get_event_clusters_in_aoi(self.aoi, self.start_time, self.end_time),
                self.repo.get_speed_grid_in_aoi(self.aoi, self.start_time, self.end_time),
            )
        else:
            # HTML mode: all phases run concurrently.
            density_html_src = ""
            density_map, speed_data, event_data, speed_grid = await asyncio.gather(
                generate_density_map_base64(self.aoi),
                self.repo.get_speed_profiles_in_aoi(self.aoi, self.start_time, self.end_time),
                self.repo.get_event_clusters_in_aoi(self.aoi, self.start_time, self.end_time),
                self.repo.get_speed_grid_in_aoi(self.aoi, self.start_time, self.end_time),
            )

        sections: List[Dict[str, Any]] = [
            {
                "type":       "density_snapshot",
                "title":      "Vessel Density Overview",
                "map_base64": density_map,
            },
        ]

        if speed_data:
            speed_heatmap = await generate_speed_heatmap_base64(self.aoi, speed_grid)
            sections.append({
                "map_base64": speed_heatmap,
                "type": "speed_profiles",
                **speed_data,
            })

        if event_data:
            # Generate the combined heatmap and per-type maps concurrently.
            # Pop raw location lists — they're only needed as map input.
            event_locations      = event_data.pop("event_locations", [])
            event_locs_by_type   = event_data.pop("event_locations_by_type", {})

            heatmap_b64, per_type_maps = await asyncio.gather(
                generate_event_heatmap_base64(self.aoi, event_locations),
                generate_per_event_type_maps_base64(self.aoi, event_locs_by_type),
            )
            sections.append({
                "type":          "event_clusters",
                "heatmap_b64":   heatmap_b64,
                "per_type_maps": per_type_maps,
                **event_data,
            })

        fmt = "%Y-%m-%d %H:%M UTC"
        result = self._envelope(
            "Generic Area Report",
            sections,
            aoi_bbox=_aoi_bbox_string(self.aoi),
            period=f"{self.start_time.strftime(fmt)}  →  {self.end_time.strftime(fmt)}",
        )
        if density_html_src:
            result["_density_html_src"] = density_html_src
        return result
