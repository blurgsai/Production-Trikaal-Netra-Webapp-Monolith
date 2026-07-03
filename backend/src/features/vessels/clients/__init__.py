import httpx
from pydantic import BaseModel

from src.shared.config import settings


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


async def fetch_trajectory(
    client: httpx.AsyncClient, vessel_id: int, time_seconds: int
) -> str:
    query = """
        SELECT lat, lon, ts
        FROM (
            SELECT
                lat,
                lon,
                toDateTime(metadata_timestamp / 1000) AS ts
            FROM integration_test.ais_processed_flat
            WHERE vessel_id = {vessel_id:Int}
              AND lat IS NOT NULL
              AND lon IS NOT NULL
              AND toDateTime(metadata_timestamp / 1000) >= now() - INTERVAL {time_seconds:Int} SECOND
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
    query = """
        SELECT vessel_id,
               toDateTime(metadata_timestamp / 1000) AS ts,
               lat,
               lon,
               heading
        FROM default.ais_processed_flat
        WHERE metadata_timestamp BETWEEN (toUnixTimestamp(toDateTime({start_str:String})) * 1000)
                                    AND (toUnixTimestamp(toDateTime({end_str:String})) * 1000)
          AND lat BETWEEN {miny:Float} AND {maxy:Float}
          AND lon BETWEEN {minx:Float} AND {maxx:Float}
          AND lat IS NOT NULL
          AND lon IS NOT NULL
        ORDER BY vessel_id, ts
        FORMAT TabSeparated
    """

    resp = await client.get(
        settings.clickhouse_url,
        auth=(settings.CLICKHOUSE_USER, settings.CLICKHOUSE_PASSWORD),
        params={
            "query": query,
            "start_str": start_str,
            "end_str": end_str,
            "miny": str(miny),
            "maxy": str(maxy),
            "minx": str(minx),
            "maxx": str(maxx),
        },
    )
    resp.raise_for_status()
    return resp.text
