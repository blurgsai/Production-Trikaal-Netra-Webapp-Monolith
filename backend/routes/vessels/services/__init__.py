from datetime import datetime
from typing import Dict, List, Set

import httpx
from fastapi import HTTPException
from shapely.geometry import shape, Point

from routes.vessels.clients import fetch_trajectory, fetch_playback
from routes.vessels.models import (
    VesselTrajectoryResponse,
    VesselPlaybackResponse,
    VesselPlaybackPoint,
    map_trajectory_from_raw,
    parse_playback_raw_rows,
)


async def get_vessel_trajectory(vessel_id: str, time: int = 3600) -> VesselTrajectoryResponse:
    try:
        vessel_id_int = int(vessel_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid vessel_id: must be numeric",
        )

    if time < 1:
        raise HTTPException(
            status_code=400,
            detail="time must be a positive integer (seconds)",
        )
    time = min(time, 2592000)

    try:
        raw_text = await fetch_trajectory(vessel_id_int, time)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"ClickHouse request failed: {e}",
        )

    response = map_trajectory_from_raw(raw_text, vessel_id)

    if not response.trajectory:
        raise HTTPException(
            status_code=404,
            detail=f"No trajectory found for vessel {vessel_id}",
        )

    return response


async def get_vessel_playback(
    polygon: dict, start: str, end: str,
) -> VesselPlaybackResponse:
    try:
        poly = shape(polygon)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid polygon GeoJSON: {e}",
        )

    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d %H:%M:%S")
        end_dt = datetime.strptime(end, "%Y-%m-%d %H:%M:%S")
        start_str = start_dt.strftime("%Y-%m-%d %H:%M:%S")
        end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid date format: use YYYY-MM-DD HH:MM:SS",
        )

    minx, miny, maxx, maxy = poly.bounds

    try:
        raw_text = await fetch_playback(minx, miny, maxx, maxy, start_str, end_str)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"ClickHouse query failed: {e}",
        )

    if not raw_text.strip():
        raise HTTPException(
            status_code=404,
            detail="No vessel data found in window",
        )

    raw_rows = parse_playback_raw_rows(raw_text)

    vessels: Dict[str, List[VesselPlaybackPoint]] = {}
    timestamps: Set[str] = set()

    for row in raw_rows:
        pt = Point(row.lon, row.lat)
        if not poly.covers(pt):
            continue

        vessels.setdefault(row.vessel_id, []).append(
            VesselPlaybackPoint(
                ts=row.ts,
                lat=row.lat,
                lon=row.lon,
                heading=row.heading,
            )
        )
        timestamps.add(row.ts)

    if not vessels:
        raise HTTPException(
            status_code=404,
            detail="No data points inside polygon for this window",
        )

    return VesselPlaybackResponse(
        timestamps=sorted(timestamps),
        vessels=vessels,
    )
