import os
import httpx
from pydantic import BaseModel

CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD")
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST")
CLICKHOUSE_PORT = os.getenv("CLICKHOUSE_PORT")
CLICKHOUSE_URL = f"http://{CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}"


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


async def fetch_trajectory(vessel_id: int, time_seconds: int) -> str:
    query = f"""
        SELECT lat, lon, ts
        FROM (
            SELECT
                lat,
                lon,
                toDateTime(metadata_timestamp / 1000) AS ts
            FROM integration_test.ais_processed_flat
            WHERE vessel_id = {vessel_id}
              AND lat IS NOT NULL
              AND lon IS NOT NULL
              AND toDateTime(metadata_timestamp / 1000) >= now() - INTERVAL {time_seconds} SECOND
            ORDER BY metadata_timestamp DESC
        )
        ORDER BY ts ASC
        FORMAT TabSeparated
    """

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            CLICKHOUSE_URL,
            auth=(CLICKHOUSE_USER, CLICKHOUSE_PASSWORD),
            params={"query": query},
        )
        resp.raise_for_status()
        return resp.text


async def fetch_playback(
    minx: float, miny: float, maxx: float, maxy: float,
    start_str: str, end_str: str,
) -> str:
    query = f"""
        SELECT vessel_id,
               toDateTime(metadata_timestamp / 1000) AS ts,
               lat,
               lon,
               heading
        FROM default.ais_processed_flat
        WHERE metadata_timestamp BETWEEN (toUnixTimestamp(toDateTime('{start_str}'))*1000)
                                    AND (toUnixTimestamp(toDateTime('{end_str}'))*1000)
          AND lat BETWEEN {miny} AND {maxy}
          AND lon BETWEEN {minx} AND {maxx}
          AND lat IS NOT NULL
          AND lon IS NOT NULL
        ORDER BY vessel_id, ts
        FORMAT TabSeparated
    """

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(
            CLICKHOUSE_URL,
            auth=(CLICKHOUSE_USER, CLICKHOUSE_PASSWORD),
            params={"query": query},
        )
        resp.raise_for_status()
        return resp.text
