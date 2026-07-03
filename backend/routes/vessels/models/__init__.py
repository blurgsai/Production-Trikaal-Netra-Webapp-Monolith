from typing import List, Dict
from pydantic import BaseModel

from routes.vessels.clients import TrajectoryRawRow, PlaybackRawRow


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
    timestamps: List[str]
    vessels: Dict[str, List[VesselPlaybackPoint]]


class PlaybackWindowRequest(BaseModel):
    polygon: dict
    start: str
    end: str


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
    vessels: Dict[str, List[VesselPlaybackPoint]] = {}
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
