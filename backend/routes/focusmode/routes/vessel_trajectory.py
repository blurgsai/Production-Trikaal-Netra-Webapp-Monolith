from fastapi import APIRouter, HTTPException, Request, Query
import httpx
import os
import json
from db import db

router = APIRouter(prefix="/vessel", tags=["FocusModeVessel"])

# ClickHouse config
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "34.14.212.228")
CLICKHOUSE_PORT = os.getenv("CLICKHOUSE_PORT", "8123")
CLICKHOUSE_URL = f"http://{CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}"
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD")

def parse_json_each_row(text: str) -> list[dict]:
    """Parse ClickHouse JSONEachRow format (one JSON object per line)."""
    lines = (line for line in text.splitlines() if line.strip())
    return [json.loads(line) for line in lines]

async def query_clickhouse(sql: str, clickhouse_client: httpx.AsyncClient) -> list:
    """Execute ClickHouse query and return results."""
    auth = (CLICKHOUSE_USER, CLICKHOUSE_PASSWORD)
    response = await clickhouse_client.post(
        f"{CLICKHOUSE_URL}/?default_format=JSONEachRow",
        auth=auth,
        content=sql,
        timeout=30.0
    )
    response.raise_for_status()

    if not response.text.strip():
        return []

    return parse_json_each_row(response.text)

@router.get("/by-mmsi/{mmsi}")
async def get_vessels_by_mmsi(mmsi: int):
    """
    Return all vessels from vessel_state that share the given MMSI.
    Used by the Focus Mode MMSI search to let users pick the right vessel.
    """
    collection = db.get_collection("vessel_state")
    cursor = collection.find(
        {"identification.mmsi": mmsi},
        {"_id": 0, "vesselId": 1, "identification.shipName": 1},
    )
    vessels = []
    async for doc in cursor:
        vessels.append({
            "vessel_id": str(doc.get("vesselId", "")),
            "ship_name": doc.get("identification", {}).get("shipName") or "Unknown",
        })

    return {"mmsi": mmsi, "vessels": vessels, "count": len(vessels)}


@router.get("/{vessel_id}/trajectory")
async def get_vessel_trajectory(
    vessel_id: int,
    request: Request,
    start_time: int | None = Query(None),  # Unix seconds, optional
    end_time:   int | None = Query(None),  # Unix seconds, optional
):
    """
    Get trajectory for a vessel. Optionally filter by start_time / end_time (Unix seconds).
    """

    try:
        clickhouse_client = getattr(request.app.state, "clickhouse_client", None)
        if clickhouse_client is None:
            raise HTTPException(status_code=500, detail="ClickHouse client not initialized")

        time_filter = ""
        if start_time: time_filter += f"\n          AND metadata_timestamp >= {start_time}"
        if end_time:   time_filter += f"\n          AND metadata_timestamp <= {end_time}"

        query = f"""
        SELECT
            metadata_timestamp as timestamp,
            lat,
            lon,
            processing_kinematics_speed_mps as speed,
            course,
            processing_kinematics_heading_deg as heading
        FROM integration_test.ais_processed_flat
        WHERE vessel_id = {vessel_id}
          AND lat IS NOT NULL
          AND lon IS NOT NULL{time_filter}
        ORDER BY metadata_timestamp ASC
        """
        
        rows = await query_clickhouse(query, clickhouse_client)

        # Look up MMSI from vessel_state so the frontend can show it in the input
        vessel_doc = await db.get_collection("vessel_state").find_one(
            {"vesselId": vessel_id},
            {"_id": 0, "identification.mmsi": 1},
        )
        mmsi = vessel_doc.get("identification", {}).get("mmsi") if vessel_doc else None

        return {
            "vessel_id": vessel_id,
            "mmsi": mmsi,
            "trajectory": rows,
            "count": len(rows)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
