from pydantic import BaseModel

from src.features.vessels.clients import (
    PlaybackRawRow,
    TrajectoryFilter,
    TrajectoryQueryRawRow,
    TrajectoryRawRow,
)

# ── Domain models (designed for API consumers, not ClickHouse shapes) ──


class VesselPoint(BaseModel):
    lat: float
    lng: float
    timestamp: str


class VesselTrajectoryResponse(BaseModel):
    vessel_id: str
    trajectory: list[VesselPoint]


class VesselPlaybackPoint(BaseModel):
    ts: str
    lat: float
    lon: float
    heading: float


class VesselPlaybackResponse(BaseModel):
    timestamps: list[str]
    vessels: dict[str, list[VesselPlaybackPoint]]


class PlaybackWindowRequest(BaseModel):
    polygon: dict
    start: str
    end: str


# ── Unified trajectory endpoint models ──


class TrajectoryPoint(BaseModel):
    ts: str
    lat: float
    lon: float
    heading: float
    speed: float


class TrajectoryRequest(BaseModel):
    vessel_ids: list[str] | None = None
    polygon: dict | None = None
    start_time: str | None = None
    end_time: str | None = None
    time_seconds: int | None = None
    filters: list[TrajectoryFilter] | None = None


class VesselTrajectoriesResponse(BaseModel):
    trajectories: dict[str, list[TrajectoryPoint]]
    timestamps: list[str]


# ── Mappers (the ONLY place that touches both raw and domain) ──


def map_trajectory_from_raw(raw_text: str, vessel_id: str) -> VesselTrajectoryResponse:
    trajectory: list[VesselPoint] = []

    for line in raw_text.strip().split("\n"):
        if not line.strip():
            continue
        lat_str, lon_str, ts_str = line.strip().split("\t")
        trajectory.append(
            VesselPoint(
                lat=float(lat_str),
                lng=float(lon_str),
                timestamp=ts_str,
            )
        )

    return VesselTrajectoryResponse(
        vessel_id=vessel_id,
        trajectory=trajectory,
    )


def map_playback_from_raw(raw_text: str) -> VesselPlaybackResponse:
    vessels: dict[str, list[VesselPlaybackPoint]] = {}
    timestamps: set[str] = set()

    for line in raw_text.strip().split("\n"):
        try:
            vessel_id, ts, lat, lon, heading = line.split("\t")
            vessels.setdefault(vessel_id, []).append(
                VesselPlaybackPoint(
                    ts=ts,
                    lat=float(lat),
                    lon=float(lon),
                    heading=float(heading) if heading else 0.0,
                )
            )
            timestamps.add(ts)
        except ValueError:
            continue

    return VesselPlaybackResponse(
        timestamps=sorted(timestamps),
        vessels=vessels,
    )


def parse_playback_raw_rows(raw_text: str) -> list[PlaybackRawRow]:
    rows: list[PlaybackRawRow] = []

    for line in raw_text.strip().split("\n"):
        try:
            vessel_id, ts, lat, lon, heading = line.split("\t")
            rows.append(
                PlaybackRawRow(
                    vessel_id=vessel_id,
                    ts=ts,
                    lat=float(lat),
                    lon=float(lon),
                    heading=float(heading) if heading else 0.0,
                )
            )
        except ValueError:
            continue

    return rows


def map_trajectories_from_raw(raw_text: str) -> VesselTrajectoriesResponse:
    trajectories: dict[str, list[TrajectoryPoint]] = {}
    timestamps: set[str] = set()

    for line in raw_text.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.strip().split("\t")
        if len(parts) != 6:
            continue
        vessel_id, ts, lat, lon, heading, speed = parts
        trajectories.setdefault(vessel_id, []).append(
            TrajectoryPoint(
                ts=ts,
                lat=float(lat),
                lon=float(lon),
                heading=float(heading) if heading else 0.0,
                speed=float(speed) if speed else 0.0,
            )
        )
        timestamps.add(ts)

    return VesselTrajectoriesResponse(
        trajectories=trajectories,
        timestamps=sorted(timestamps),
    )
