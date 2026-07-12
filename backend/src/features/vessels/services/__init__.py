from datetime import datetime, timezone

import httpx
from shapely.geometry import Point, shape

from src.features.vessels.clients import fetch_playback, fetch_trajectory, fetch_vessel_trajectories
from src.features.vessels.models import (
    TrajectoryFilter,
    VesselPlaybackPoint,
    VesselPlaybackResponse,
    VesselTrajectoriesResponse,
    VesselTrajectoryResponse,
    map_trajectory_from_raw,
    map_trajectories_from_raw,
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
        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        start_str = start_dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        end_str = end_dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        raise ValidationError("Invalid date format: use ISO 8601 UTC (e.g. 2024-12-04T16:00:00Z)") from None

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


async def get_vessel_trajectories(
    client: httpx.AsyncClient,
    vessel_ids: list[str] | None = None,
    polygon: dict | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
    time_seconds: int | None = None,
    filters: list[TrajectoryFilter] | None = None,
) -> VesselTrajectoriesResponse:
    # ── Validate: must provide either time_window (start+end) or time_seconds ──
    has_time_window = start_time is not None and end_time is not None
    has_time_seconds = time_seconds is not None

    if not has_time_window and not has_time_seconds:
        raise ValidationError(
            "Must provide either (start_time + end_time) or time_seconds"
        )
    if has_time_window and has_time_seconds:
        raise ValidationError(
            "Provide either (start_time + end_time) or time_seconds, not both"
        )

    # ── Parse vessel_ids ──
    parsed_vessel_ids: list[int] | None = None
    if vessel_ids:
        try:
            parsed_vessel_ids = [int(v) for v in vessel_ids]
        except (ValueError, TypeError):
            raise ValidationError("vessel_ids must be a list of numeric strings") from None

    # ── Parse time window (accept ISO 8601 UTC: 2024-12-04T16:00:00.000Z) ──
    start_str: str | None = None
    end_str: str | None = None
    if has_time_window:
        try:
            start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
            start_str = start_dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            end_str = end_dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        except (ValueError, TypeError):
            raise ValidationError(
                "Invalid date format: use ISO 8601 UTC (e.g. 2024-12-04T16:00:00Z)"
            ) from None

    # ── Parse polygon bounds ──
    minx = miny = maxx = maxy = None
    if polygon:
        try:
            poly = shape(polygon)
            minx, miny, maxx, maxy = poly.bounds
        except Exception as e:
            raise ValidationError(f"Invalid polygon GeoJSON: {e}") from e

    # ── Fetch from ClickHouse ──
    try:
        raw_text = await fetch_vessel_trajectories(
            client,
            vessel_ids=parsed_vessel_ids,
            minx=minx,
            miny=miny,
            maxx=maxx,
            maxy=maxy,
            start_str=start_str,
            end_str=end_str,
            time_seconds=time_seconds if not has_time_window else None,
            filters=filters,
        )
    except httpx.HTTPError as e:
        raise ExternalServiceError("ClickHouse", str(e)) from e

    if not raw_text.strip():
        raise NotFoundError("Vessel trajectories", "no data found for the given criteria")

    response = map_trajectories_from_raw(raw_text)

    if not response.trajectories:
        raise NotFoundError("Vessel trajectories", "no data found for the given criteria")

    # ── Polygon filtering (precise, not just bounding box) ──
    if polygon:
        poly = shape(polygon)
        filtered_trajectories: dict[str, list] = {}
        filtered_timestamps: set[str] = set()
        for vid, points in response.trajectories.items():
            kept = [
                pt for pt in points
                if poly.covers(Point(pt.lon, pt.lat))
            ]
            if kept:
                filtered_trajectories[vid] = kept
                for pt in kept:
                    filtered_timestamps.add(pt.ts)

        if not filtered_trajectories:
            raise NotFoundError(
                "Vessel trajectories", "no data points inside polygon"
            )

        return VesselTrajectoriesResponse(
            trajectories=filtered_trajectories,
            timestamps=sorted(filtered_timestamps),
        )

    return response
