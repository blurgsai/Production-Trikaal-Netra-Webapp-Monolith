"""Focus mode feature — Layer 1 (clients).

External data access for focus mode: MongoDB (`vessel_state` lookups) and
ClickHouse (AIS vessel trajectories). Knows nothing about FastAPI or domain
models. Self-contained: cross-feature imports are forbidden, so this mirrors
(rather than reuses) the ClickHouse query helpers already in
src.features.playback.clients / src.features.vessels.clients.
"""
from __future__ import annotations

import json

import httpx

from src.shared.config import settings


def _ais_table() -> str:
    return f"{settings.CLICKHOUSE_DB}.{settings.CLICKHOUSE_AIS_TABLE}"


def _parse_json_each_row(text: str) -> list[dict]:
    return [json.loads(line) for line in text.splitlines() if line.strip()]


async def query_clickhouse(client: httpx.AsyncClient, sql: str) -> list[dict]:
    response = await client.post(
        f"{settings.clickhouse_url}/?default_format=JSONEachRow",
        auth=(settings.CLICKHOUSE_USER, settings.CLICKHOUSE_PASSWORD),
        content=sql,
        timeout=30.0,
    )
    response.raise_for_status()
    if not response.text.strip():
        return []
    return _parse_json_each_row(response.text)


# ── MongoDB ──────────────────────────────────────────────────────────────────

async def fetch_vessels_by_mmsi(db, mmsi: int) -> list[dict]:
    """Vessels sharing the given MMSI, for the Focus Mode vessel picker."""
    cursor = db.get_collection(settings.VESSEL_STATE_COLLECTION).find(
        {"identification.mmsi": mmsi},
        {"_id": 0, "vesselId": 1, "identification.shipName": 1},
    )
    return await cursor.to_list(length=None)


async def fetch_vessel_mmsi(db, vessel_id: int) -> int | None:
    """Reverse lookup so the trajectory response can echo the vessel's MMSI."""
    doc = await db.get_collection(settings.VESSEL_STATE_COLLECTION).find_one(
        {"vesselId": vessel_id},
        {"_id": 0, "identification.mmsi": 1},
    )
    if not doc:
        return None
    return doc.get("identification", {}).get("mmsi")


# ── ClickHouse (AIS trajectory) ──────────────────────────────────────────────

async def fetch_trajectory_rows(
    client: httpx.AsyncClient,
    vessel_id: int,
    start_ms: int | None,
    end_ms: int | None,
) -> list[dict]:
    """Raw AIS rows for one vessel over [start_ms, end_ms] (both in ms, either optional).

    `metadata_timestamp` is stored in unix seconds in ais_processed_flat (verified
    against the real table) — multiplied by 1000 here so the caller, and the model
    layer's ms -> seconds conversion back for the frontend contract, can keep
    working in ms.
    """
    time_filter = ""
    if start_ms is not None:
        time_filter += f" AND metadata_timestamp * 1000 >= {int(start_ms)}"
    if end_ms is not None:
        time_filter += f" AND metadata_timestamp * 1000 <= {int(end_ms)}"

    sql = f"""
        SELECT
            metadata_timestamp * 1000 AS ts,
            lat,
            lon,
            processing_kinematics_speed_mps AS speed,
            processing_kinematics_heading_deg AS heading
        FROM {_ais_table()}
        WHERE vessel_id = {int(vessel_id)}
          AND lat IS NOT NULL
          AND lon IS NOT NULL{time_filter}
        ORDER BY metadata_timestamp ASC
    """
    return await query_clickhouse(client, sql)
