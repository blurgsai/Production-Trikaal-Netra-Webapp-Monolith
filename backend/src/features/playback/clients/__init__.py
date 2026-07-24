"""Playback feature — Layer 1 (clients).

External data access for playback: MongoDB (event / polygon / port documents) and
ClickHouse (AIS vessel trajectories). Knows nothing about FastAPI or domain models.

Self-contained: reads the events / compound / polygons / ports collections directly
(cross-feature imports are forbidden), using collection names from settings.

ClickHouse note: `metadata_timestamp` in ais_processed_flat is stored in **unix
seconds** (verified directly against the real trikaal_v3.ais_processed_flat table —
not milliseconds as this module previously assumed, which was silently returning zero
trajectory rows for every event). The queries below multiply by 1000 at the query
boundary so every other layer (services/, models/, the frontend contract) can keep
working in ms.
"""
from __future__ import annotations

import json

import httpx
from bson import ObjectId

from src.shared.config import settings

# 3-hour context buffer added around the event window when querying AIS.
TRAJECTORY_BUFFER_MS = 3 * 60 * 60 * 1000

POLYGONS_COLLECTION = "polygons"
PORTS_COLLECTION = "ports"


def _ais_table() -> str:
    return f"{settings.CLICKHOUSE_DB}.{settings.CLICKHOUSE_AIS_TABLE}"


# ── MongoDB fetches ──────────────────────────────────────────────────────────────

async def fetch_event_by_id(db, event_id: str) -> dict | None:
    if not ObjectId.is_valid(event_id):
        return None
    return await db.get_collection(settings.EVENTS_COLLECTION).find_one(
        {"_id": ObjectId(event_id)}
    )


async def fetch_events_by_ids(db, event_ids: list[str]) -> list[dict]:
    """Fetch multiple atomic events by id, preserving the requested order."""
    oids = [ObjectId(e) for e in event_ids if ObjectId.is_valid(e)]
    if not oids:
        return []
    docs = await db.get_collection(settings.EVENTS_COLLECTION).find(
        {"_id": {"$in": oids}}
    ).to_list(length=len(oids))
    by_id = {str(d["_id"]): d for d in docs}
    return [by_id[e] for e in event_ids if e in by_id]


async def fetch_polygon_by_id(db, polygon_id) -> dict | None:
    query_id = polygon_id
    if isinstance(polygon_id, str) and ObjectId.is_valid(polygon_id):
        query_id = ObjectId(polygon_id)
    return await db.get_collection(POLYGONS_COLLECTION).find_one({"_id": query_id})


async def fetch_port_by_id(db, port_id) -> dict | None:
    query_id = port_id
    if isinstance(port_id, str) and ObjectId.is_valid(port_id):
        query_id = ObjectId(port_id)
    return await db.get_collection(PORTS_COLLECTION).find_one({"_id": query_id})


# ── ClickHouse (AIS trajectories) ────────────────────────────────────────────────

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


def _safe_int_ids(vessel_ids: list) -> list[int]:
    """Coerce vessel ids to int, dropping non-numeric ones (SQL-injection safe)."""
    out: list[int] = []
    for vid in vessel_ids:
        try:
            out.append(int(str(vid).strip()))
        except (ValueError, TypeError):
            continue
    return out


async def fetch_trajectories(
    client: httpx.AsyncClient,
    vessel_ids: list,
    start_ms: int | None,
    end_ms: int | None,
) -> dict[str, dict[str, dict]]:
    """Fetch AIS positions for the vessels over [start_ms, end_ms] (both in ms).

    Returns { str(timestamp_ms): { str(vessel_id): {latitude, longitude, speed_mps,
    course, heading} } }.
    """
    ids = _safe_int_ids(vessel_ids)
    if not ids or start_ms is None:
        return {}

    ids_str = ",".join(map(str, ids))
    upper = f"AND metadata_timestamp * 1000 <= {int(end_ms)}" if end_ms else ""
    sql = f"""
        SELECT
            metadata_timestamp * 1000 AS ts,
            groupArray((toString(vessel_id), lat, lon,
                        processing_kinematics_speed_mps, course,
                        processing_kinematics_cog_deg)) AS vessel_data
        FROM {_ais_table()}
        WHERE vessel_id IN ({ids_str})
          AND metadata_timestamp * 1000 >= {int(start_ms)}
          {upper}
          AND lat IS NOT NULL
          AND lon IS NOT NULL
        GROUP BY metadata_timestamp
        ORDER BY metadata_timestamp ASC
    """
    rows = await query_clickhouse(client, sql)

    trajectories: dict[str, dict[str, dict]] = {}
    for row in rows:
        ts = str(row["ts"])  # ms (query converts from stored unix seconds)
        frame = trajectories.setdefault(ts, {})
        for v in row["vessel_data"]:
            frame[str(v[0])] = {
                "latitude": v[1],
                "longitude": v[2],
                "speed_mps": v[3],
                "course": v[4],
                "heading": v[5],
            }
    return trajectories
