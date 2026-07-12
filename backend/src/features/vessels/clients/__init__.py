import httpx
from pydantic import BaseModel

from src.shared.config import settings


class TrajectoryFilter(BaseModel):
    column: str
    operator: str
    value: str | int | float
    combinator: str | None = None


class TrajectoryRawRow(BaseModel):
    lat: float
    lon: float
    ts: str


class PlaybackRawRow(BaseModel):
    vessel_id: str
    ts: str
    lat: float
    lon: float
    heading: float


class TrajectoryQueryRawRow(BaseModel):
    vessel_id: str
    ts: str
    lat: float
    lon: float
    heading: float
    speed: float


# ── ClickHouse column allowlist + type info ──

_NUMERIC_COLUMNS: frozenset[str] = frozenset({
    "vessel_id", "mmsi", "lat", "lon", "heading", "speed", "course",
    "status", "imo", "ship_type", "draught",
    "processing_kinematics_speed_mps", "processing_kinematics_distance_m",
    "processing_kinematics_dt_s", "processing_kinematics_accel_mps2",
    "processing_kinematics_heading_change_deg", "processing_kinematics_cog_deg",
})

_TEXT_COLUMNS: frozenset[str] = frozenset({
    "shipname", "callsign", "destination", "metadata_source",
})

_ALLOWED_COLUMNS: frozenset[str] = _NUMERIC_COLUMNS | _TEXT_COLUMNS

_OPERATOR_MAP: dict[str, str] = {
    "eq": "=",
    "ne": "!=",
    "gt": ">",
    "gte": ">=",
    "lt": "<",
    "lte": "<=",
    "like": "LIKE",
}


def _escape_string_literal(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def build_filter_clause(filters: list[TrajectoryFilter]) -> str:
    if not filters:
        return ""

    clauses: list[str] = []
    for f in filters:
        if f.column not in _ALLOWED_COLUMNS:
            continue
        op = _OPERATOR_MAP.get(f.operator)
        if op is None:
            continue

        if f.column in _NUMERIC_COLUMNS:
            try:
                numeric_value = float(f.value)
            except (ValueError, TypeError):
                continue
            clauses.append(f"{f.column} {op} {numeric_value}")
        else:
            escaped = _escape_string_literal(str(f.value))
            if f.operator == "like":
                clauses.append(f"{f.column} LIKE '{escaped}'")
            else:
                clauses.append(f"{f.column} {op} '{escaped}'")

    if not clauses:
        return ""

    result = clauses[0]
    for i, clause in enumerate(clauses[1:], start=1):
        combinator = filters[i].combinator or "AND"
        result += f" {combinator} {clause}"
    return result


async def fetch_trajectory(
    client: httpx.AsyncClient, vessel_id: int, time_seconds: int
) -> str:
    query = """
        SELECT lat, lon, ts
        FROM (
            SELECT
                lat,
                lon,
                formatDateTime(toDateTime(metadata_timestamp / 1000, 'UTC'), '%Y-%m-%dT%H:%i:%SZ') AS ts
            FROM integration_test.ais_processed_flat
            WHERE vessel_id = {vessel_id:Int}
              AND lat IS NOT NULL
              AND lon IS NOT NULL
              AND toDateTime(metadata_timestamp / 1000, 'UTC') >= now() - INTERVAL {time_seconds:Int} SECOND
            ORDER BY metadata_timestamp DESC
        )
        ORDER BY ts ASC
        FORMAT TabSeparated
    """

    resp = await client.get(
        settings.clickhouse_url,
        auth=(settings.CLICKHOUSE_USER, settings.CLICKHOUSE_PASSWORD),
        params={
            "query": query,
            "vessel_id": str(vessel_id),
            "time_seconds": str(time_seconds),
        },
    )
    resp.raise_for_status()
    return resp.text


async def fetch_playback(
    client: httpx.AsyncClient,
    minx: float, miny: float, maxx: float, maxy: float,
    start_str: str, end_str: str,
) -> str:
    query = f"""
        SELECT vessel_id,
               formatDateTime(toDateTime(metadata_timestamp / 1000, 'UTC'), '%Y-%m-%dT%H:%i:%SZ') AS ts,
               lat,
               lon,
               heading
        FROM default.ais_processed_flat
        WHERE metadata_timestamp BETWEEN (toUnixTimestamp(toDateTime('{start_str}', 'UTC')) * 1000)
                                    AND (toUnixTimestamp(toDateTime('{end_str}', 'UTC')) * 1000)
          AND lat BETWEEN {miny} AND {maxy}
          AND lon BETWEEN {minx} AND {maxx}
          AND lat IS NOT NULL
          AND lon IS NOT NULL
        ORDER BY vessel_id, ts
        FORMAT TabSeparated
    """

    resp = await client.post(
        settings.clickhouse_url,
        auth=(settings.CLICKHOUSE_USER, settings.CLICKHOUSE_PASSWORD),
        content=query,
    )
    resp.raise_for_status()
    return resp.text


async def fetch_vessel_trajectories(
    client: httpx.AsyncClient,
    vessel_ids: list[int] | None = None,
    minx: float | None = None,
    miny: float | None = None,
    maxx: float | None = None,
    maxy: float | None = None,
    start_str: str | None = None,
    end_str: str | None = None,
    time_seconds: int | None = None,
    filters: list[TrajectoryFilter] | None = None,
) -> str:
    query = """
        SELECT toString(vessel_id) AS vessel_id,
               formatDateTime(toDateTime(metadata_timestamp / 1000, 'UTC'), '%Y-%m-%dT%H:%i:%SZ') AS ts,
               lat,
               lon,
               heading,
               speed
        FROM default.ais_processed_flat
        WHERE lat IS NOT NULL AND lon IS NOT NULL
    """

    if vessel_ids:
        ids_str = ",".join(str(v) for v in vessel_ids)
        query += f" AND vessel_id IN ({ids_str})"

    if start_str and end_str:
        query += (
            f" AND metadata_timestamp >= (toUnixTimestamp(toDateTime('{start_str}', 'UTC')) * 1000)"
            f" AND metadata_timestamp <= (toUnixTimestamp(toDateTime('{end_str}', 'UTC')) * 1000)"
        )
    elif time_seconds is not None:
        query += (
            f" AND metadata_timestamp >= (toUnixTimestamp(now()) - {time_seconds}) * 1000"
        )

    if minx is not None and miny is not None and maxx is not None and maxy is not None:
        query += (
            f" AND lat BETWEEN {miny} AND {maxy}"
            f" AND lon BETWEEN {minx} AND {maxx}"
        )

    if filters:
        filter_clause = build_filter_clause(filters)
        if filter_clause:
            query += f" AND ({filter_clause})"

    query += " ORDER BY vessel_id, ts FORMAT TabSeparated"

    resp = await client.post(
        settings.clickhouse_url,
        auth=(settings.CLICKHOUSE_USER, settings.CLICKHOUSE_PASSWORD),
        content=query,
    )
    resp.raise_for_status()
    return resp.text
