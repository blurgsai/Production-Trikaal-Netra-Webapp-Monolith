"""Focus mode feature — Layer 2 (models + mappers).

Domain models matching the frontend contract in
frontend/src/features/focusMode/api/types.ts. `metadata_timestamp` is stored in
unix seconds in ais_processed_flat; clients/ converts to ms at the query boundary
so every layer above it can keep assuming ms, and the frontend contract (carried
over from the legacy backend) works in unix seconds — the mappers here are the
one place that ms -> seconds conversion happens.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class VesselSummary(BaseModel):
    vessel_id: int
    ship_name: str


class VesselsByMmsiResponse(BaseModel):
    mmsi: int
    vessels: list[VesselSummary] = Field(default_factory=list)
    count: int


class TrajectoryPoint(BaseModel):
    timestamp: int  # unix seconds
    lat: float
    lon: float
    speed: float | None = None
    heading: float | None = None


class VesselTrajectoryResponse(BaseModel):
    vessel_id: int
    mmsi: int | None = None
    trajectory: list[TrajectoryPoint] = Field(default_factory=list)
    count: int


# ── Mappers ──────────────────────────────────────────────────────────────────


def map_vessel_summary(doc: dict) -> VesselSummary:
    return VesselSummary(
        vessel_id=int(doc.get("vesselId", 0)),
        ship_name=doc.get("identification", {}).get("shipName") or "Unknown",
    )


def map_trajectory_point(row: dict) -> TrajectoryPoint:
    return TrajectoryPoint(
        timestamp=int(row["ts"]) // 1000,
        lat=row["lat"],
        lon=row["lon"],
        speed=row.get("speed"),
        heading=row.get("heading"),
    )
