"""Focus mode feature — Layer 3 (services).

Orchestrates vessel-by-MMSI lookup and vessel trajectory retrieval: load from
MongoDB/ClickHouse via clients/, convert the wire's unix-seconds time bounds to
the ClickHouse ms domain, map through the anti-corruption layer. Independent of
FastAPI.
"""
from __future__ import annotations

from src.features.focus_mode.clients import (
    fetch_trajectory_rows,
    fetch_vessel_mmsi,
    fetch_vessels_by_mmsi,
)
from src.features.focus_mode.models import (
    TrajectoryPoint,
    VesselsByMmsiResponse,
    VesselTrajectoryResponse,
    map_trajectory_point,
    map_vessel_summary,
)


async def get_vessels_by_mmsi(db, mmsi: int) -> VesselsByMmsiResponse:
    docs = await fetch_vessels_by_mmsi(db, mmsi)
    vessels = [map_vessel_summary(doc) for doc in docs]
    return VesselsByMmsiResponse(mmsi=mmsi, vessels=vessels, count=len(vessels))


async def get_vessel_trajectory(
    db,
    ch_client,
    vessel_id: int,
    start_time: int | None,
    end_time: int | None,
) -> VesselTrajectoryResponse:
    start_ms = start_time * 1000 if start_time is not None else None
    end_ms = end_time * 1000 if end_time is not None else None

    rows = await fetch_trajectory_rows(ch_client, vessel_id, start_ms, end_ms)
    trajectory: list[TrajectoryPoint] = [map_trajectory_point(row) for row in rows]
    mmsi = await fetch_vessel_mmsi(db, vessel_id)

    return VesselTrajectoryResponse(
        vessel_id=vessel_id,
        mmsi=mmsi,
        trajectory=trajectory,
        count=len(trajectory),
    )
