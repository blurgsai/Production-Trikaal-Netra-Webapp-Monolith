"""
builders/track.py — Track Report builder.

Responsibility: fetch vessel + event data, process it,
and assemble the profile dict the Jinja2 template expects.
Nothing about rendering (HTML, PDF) lives here.
"""
import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)

from ..maps import (
    generate_trajectory_map_base64,
    generate_event_location_map_base64,
    generate_event_playback_map_base64,
)
from .base import BaseReport, fmt_ts, parse_dt, get_dim, safe_int, fmt_event_info


class TrackReport(BaseReport):
    TEMPLATE_KEY = "track"

    def __init__(self, repo, request):
        super().__init__(repo)
        self.vessel_ids = request.vessel_ids
        self.start_time = request.start_time
        self.end_time   = request.end_time
        self.aoi        = request.aoi

    async def generate(self) -> Dict[str, Any]:
        vessel_ids = self.vessel_ids

        # AOI mode: resolve vessel IDs from current vessel positions before
        # building profiles.  The resolver runs an on-demand position sync
        # then uses $geoWithin on location.geojson (2dsphere index).
        if not vessel_ids and self.aoi:
            vessel_ids = await self.repo.get_vessel_ids_in_aoi(self.aoi)
            if not vessel_ids:
                return self._envelope(
                    "Vessel Profile Report",
                    [],
                    vessels_requested=0,
                    profiles_found=0,
                    note="No vessels were found inside the specified Area of Interest.",
                )

        docs, events = await asyncio.gather(
            self.repo.get_tracks_for_vessels(vessel_ids, self.start_time, self.end_time, self.aoi),
            self.repo.get_events_for_vessels(vessel_ids, self.start_time, self.end_time),
        )
        # Cap concurrent ClickHouse queries — each _build_profile issues one CH call.
        # Without a semaphore, an AOI with 50 vessels fires 50 simultaneous queries.
        sem = asyncio.Semaphore(5)

        async def _guarded(doc):
            async with sem:
                return await self._build_profile(doc, events)

        raw_profiles = await asyncio.gather(*[_guarded(d) for d in docs])
        profiles = [p for p in raw_profiles if p is not None]
        return self._envelope(
            "Vessel Profile Report",
            profiles,
            vessels_requested=len(vessel_ids) if vessel_ids else "All",
            profiles_found=len(profiles),
        )

    # ------------------------------------------------------------------

    async def _build_profile(self, doc: dict, all_events: list) -> dict | None:
        vessel_id = doc.get("vesselId")
        if not vessel_id:
            logger.warning("[TrackReport] Skipping vessel_state document with missing vesselId.")
            return None

        ident  = doc.get("identification") or {}
        kin    = doc.get("kinematics") or {}
        dims   = doc.get("dimensions") or {}
        loc    = (doc.get("location") or {}).get("current") or {}
        status = doc.get("status") or {}
        ais    = doc.get("aisInfo") or {}
        dest   = doc.get("destination") or {}
        mmsi   = ident.get("mmsi")

        # Build a set of IDs once so event matching is O(n) not O(n*m)
        lookup_ids = {str(vessel_id)}
        if mmsi is not None:
            lookup_ids.add(str(mmsi))

        my_events = [
            e for e in all_events
            if lookup_ids & {str(x) for x in e.get("vessels_involved", [])}
        ]

        # --- Single trajectory fetch with timestamps (eliminates N+1 ClickHouse queries) ---
        # Returns List[Tuple[float, float, int]] → (lon, lat, unix_timestamp)
        raw_pts: List[Tuple[float, float, int]] = await self.repo.get_trajectory_points(
            str(vessel_id), self.start_time, self.end_time
        )
        main_pts = [(lon, lat) for lon, lat, _ in raw_pts]

        # --- Format scalars ---
        name    = ident.get("shipName") or "Unknown Vessel"
        spd_raw = kin.get("speedOverGroundMps")
        speed   = round(float(spd_raw) * 1.94384, 1) if spd_raw is not None else "N/A"
        loa     = safe_int(get_dim(dims, "toBow"))  + safe_int(get_dim(dims, "toStern"))
        beam    = safe_int(get_dim(dims, "toPort")) + safe_int(get_dim(dims, "toStarboard"))
        lat     = round(float(loc.get("lat", 0)), 5) if loc.get("lat") is not None else "N/A"
        lon     = round(float(loc.get("lon", 0)), 5) if loc.get("lon") is not None else "N/A"

        # --- Trajectory overview map ---
        traj_map = await generate_trajectory_map_base64(main_pts) if main_pts else ""

        # --- Event rows + per-event maps (trajectory sliced client-side, no extra DB queries) ---
        event_rows, event_charts = [], []
        for ev in my_events:
            e_type  = str(ev.get("type", "Unknown")).replace("_", " ").title()
            e_start = fmt_ts(ev.get("start_time"))

            event_rows.append({
                "Type":       e_type,
                "Severity":   str(ev.get("severity", "N/A")).title(),
                "Status":     str(ev.get("status", "N/A")).title(),
                "Start Time": e_start,
                "End Time":   fmt_ts(ev.get("end_time")),
            })

            # Slice the already-fetched trajectory to the event window
            ev_start_dt = parse_dt(ev.get("start_time"))
            ev_end_dt   = parse_dt(ev.get("end_time"))
            if ev_start_dt and ev_end_dt:
                s_ts, e_ts = int(ev_start_dt.timestamp()), int(ev_end_dt.timestamp())
                ev_pts = [(lo, la) for lo, la, ts in raw_pts if s_ts <= ts <= e_ts]
            else:
                ev_pts = []

            coords = (ev.get("location") or {}).get("coordinates", [])
            if ev_pts and len(ev_pts) > 1:
                emap = await generate_event_playback_map_base64(ev_pts)
            elif len(coords) == 2:
                emap = await generate_event_location_map_base64(float(coords[0]), float(coords[1]))
            else:
                emap = ""

            if emap:
                event_charts.append({
                    "label":      e_type,
                    "time":       e_start,
                    "coords":     f"{coords[1]:.4f}, {coords[0]:.4f}" if len(coords) == 2 else "N/A",
                    "info":       fmt_event_info(ev.get("information")),
                    "map_base64": emap,
                })

        vessel_img = (
            doc.get("imageUrl") or doc.get("image") or
            ident.get("imageUrl") or ident.get("image") or ""
        )

        return {
            "profile_title":          f"{name} (MMSI: {mmsi})",
            "vessel_image_url":       vessel_img,
            "trajectory_map_base64":  traj_map,
            "event_charts":           event_charts,
            "track_window": {
                "Report Start Time": self.start_time.isoformat() if self.start_time else "Not specified",
                "Report End Time":   self.end_time.isoformat()   if self.end_time   else "Not specified",
            },
            "sections": {
                "Voyage & Route Advice": {
                    "Voyage Name":              f"Origin - {dest.get('destination', 'Unknown')}",
                    "Ordered Speed (kn)":       "N/A (Commercial)",
                    "ETA Destination (UTC)":    fmt_ts(dest.get("eta")) if dest.get("eta") else "N/A",
                    "Remaining Distance (nm)":  "N/A",
                    "Last Position (UTC)":      f"Lat: {lat}, Lon: {lon} @ {fmt_ts(loc.get('timestamp'))}",
                    "LOA / Beam":               f"{loa}m / {beam}m" if loa and beam else "N/A",
                    "Draft Fwd / Aft":          f"{get_dim(dims, 'draught')}m / N/A",
                },
                "Identification": {
                    "MMSI":            mmsi,
                    "IMO":             ident.get("imo")            or "N/A",
                    "Call Sign":       ident.get("callSign")       or "N/A",
                    "Flag":            ident.get("flag")           or "N/A",
                    "Port of Registry":ident.get("portOfRegistry") or "N/A",
                    "Build Year":      ident.get("buildYear")      or "N/A",
                    "Category":        doc.get("category")         or "N/A",
                },
                "Current Status": {
                    "Nav Status":   status.get("navStatusParsed") or "N/A",
                    "Latitude":     lat,
                    "Longitude":    lon,
                    "Last Updated": fmt_ts(loc.get("timestamp")),
                },
                "Kinematics": {
                    "Speed (kn)":        speed,
                    "Heading (°)":       round(float(kin.get("headingDeg", 0)), 1) if kin.get("headingDeg") else "N/A",
                    "Course Change (°)": round(kin.get("headingChangeDeg", 0), 4)  if kin.get("headingChangeDeg") is not None else "N/A",
                    "Turn Rate (°/min)": round(kin.get("turnRateDegPerMin", 0), 4) if kin.get("turnRateDegPerMin") is not None else "N/A",
                },
                "Dimensions (m)": {
                    "Draught": get_dim(dims, "draught"),
                    "To Bow":  get_dim(dims, "toBow"),
                    "To Stern":get_dim(dims, "toStern"),
                    "To Port": get_dim(dims, "toPort"),
                    "To Stbd": get_dim(dims, "toStarboard"),
                },
                "AIS": {
                    "Transponder Class": ais.get("aisTransponderClass") or "N/A",
                    "AIS Source":        ais.get("aisSource")           or "N/A",
                    "AIS Version":       ais.get("aisVersion")          or "N/A",
                },
                "Safety & Security": {
                    "Suspicious Activity": "Yes" if status.get("suspicious") else "No",
                    "Spoofing Detected":   "Yes" if doc.get("spoof", {}).get("status") else "No",
                    "Active Safety Event": "Yes" if doc.get("safety", {}).get("activeEvent") else "No",
                },
                "Associated Events": event_rows or [
                    {"Type": "N/A", "Severity": "N/A", "Status": "N/A",
                     "Start Time": "No events in this timeframe.", "End Time": ""}
                ],
            },
        }
