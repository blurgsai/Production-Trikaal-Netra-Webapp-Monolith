from datetime import datetime

import httpx
from shapely.geometry import Point, shape

from src.features.vessels.clients import fetch_playback, fetch_trajectory
from src.features.vessels.models import (
    VesselPlaybackPoint,
    VesselPlaybackResponse,
    VesselTrajectoryResponse,
    map_trajectory_from_raw,
    parse_playback_raw_rows,
)
from src.shared.errors import ExternalServiceError, NotFoundError, ValidationError


async def get_vessel_trajectory(
    client: httpx.AsyncClient, vessel_id: str, time: int = 3600
) -> VesselTrajectoryResponse:
    try:
        vessel_id_int = int(vessel_id)
    except (ValueError, TypeError):
        raise ValidationError("Invalid vessel_id: must be numeric") from None

    if time < 1:
        raise ValidationError("time must be a positive integer (seconds)")
    time = min(time, 2592000)

    try:
        raw_text = await fetch_trajectory(client, vessel_id_int, time)
    except httpx.HTTPError as e:
        raise ExternalServiceError("ClickHouse", str(e)) from e

    response = map_trajectory_from_raw(raw_text, vessel_id)

    if not response.trajectory:
        raise NotFoundError("Vessel trajectory", vessel_id)

    return response


async def get_vessel_playback(
    client: httpx.AsyncClient, polygon: dict, start: str, end: str,
) -> VesselPlaybackResponse:
    try:
        poly = shape(polygon)
    except Exception as e:
        raise ValidationError(f"Invalid polygon GeoJSON: {e}") from e

    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d %H:%M:%S")
        end_dt = datetime.strptime(end, "%Y-%m-%d %H:%M:%S")
        start_str = start_dt.strftime("%Y-%m-%d %H:%M:%S")
        end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        raise ValidationError("Invalid date format: use YYYY-MM-DD HH:MM:SS") from None

    minx, miny, maxx, maxy = poly.bounds

    try:
        raw_text = await fetch_playback(client, minx, miny, maxx, maxy, start_str, end_str)
    except httpx.HTTPError as e:
        raise ExternalServiceError("ClickHouse", str(e)) from e

    if not raw_text.strip():
        raise NotFoundError("Vessel playback", "no data in window")

    raw_rows = parse_playback_raw_rows(raw_text)

    vessels: dict[str, list[VesselPlaybackPoint]] = {}
    timestamps: set[str] = set()

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
        raise NotFoundError("Vessel playback", "no data points inside polygon")

    return VesselPlaybackResponse(
        timestamps=sorted(timestamps),
        vessels=vessels,
    )
