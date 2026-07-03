from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import httpx
import os
import json
from dotenv import load_dotenv
from uuid import uuid4

from utils.gcs import save_json_to_gcs, BUCKET_NAME

load_dotenv()

router = APIRouter(
    prefix="/api/events",
    tags=["events"],
    responses={404: {"description": "Not found"}},
)

# ClickHouse configuration
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "34.14.212.228")
CLICKHOUSE_PORT = os.getenv("CLICKHOUSE_PORT", "8123")
CLICKHOUSE_URL = f"http://{CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}"
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "FcBkawbYEPanUDFip9Wad17RuvNQrMFTiGG+4gnquUw=")

# Event severity mapping
EVENT_SEVERITY = {
    'anomalous_acceleration': 'warning',
    'anomalous_turn_rate': 'warning',
    'prolonged_stationary': 'info',
    'prolonged_low_speed': 'info',
    'dark_ship': 'high',
    'geofence_enter': 'info',
    'geofence_exit': 'info',
    'spoofing_detected': 'high',
    'identity_mismatch': 'high',
}

class EventBase(BaseModel):
    event_id: Optional[str] = None
    event_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    timestamp: Optional[int] = None
    start_time: Optional[int] = None
    end_time: Optional[int] = None
    duration: Optional[int] = None
    location_wkt: Optional[str] = None
    vessels: Optional[List[int]] = None
    s2_cell_id: Optional[str] = None
    processed_at: Optional[int] = None
    # Common info fields
    info_threshold_acceleration: Optional[str] = None
    info_average_acceleration_delta: Optional[str] = None
    info_max_acceleration: Optional[str] = None
    info_recieved_positions: Optional[str] = None
    # Add other info fields as needed
class Event(EventBase):
    pass

async def execute_clickhouse_query(query: str) -> List[Dict]:
    """Execute a query against ClickHouse and return results"""
    auth = (CLICKHOUSE_USER, CLICKHOUSE_PASSWORD)
    
    print(f"\n[DEBUG] Executing ClickHouse query:\n{query}")
    print(f"[DEBUG] Using ClickHouse URL: {CLICKHOUSE_URL}")
    
    try:
        async with httpx.AsyncClient() as client:
            # Use JSONEachRow format for proper JSON parsing
            response = await client.post(
                f"{CLICKHOUSE_URL}/?default_format=JSONEachRow",
                auth=auth,
                content=query,
                timeout=30.0
            )
            response.raise_for_status()
            
            print(f"\n[DEBUG RAW RESPONSE] {response.text}")
            
            # If successful with JSON, parse and return
            if response.status_code == 200 and response.text.strip():
                # JSONEachRow returns one JSON object per line
                lines = response.text.strip().split('\n')
                result = []
                for line in lines:
                    if line.strip():
                        try:
                            result.append(json.loads(line))
                        except json.JSONDecodeError as e:
                            print(f"[WARNING] Failed to parse line: {line[:100]}... Error: {e}")
                            continue
                
                print(f"Successfully retrieved {len(result)} events in JSON format")
                return result
            
            # If no data returned
            print("No data returned from query")
            return []
            
    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP error from ClickHouse: {e.response.status_code} - {e.response.text}"
        print(f"[ERROR] {error_msg}")
        print(f"[ERROR] Request URL: {e.request.url}")
        print(f"[ERROR] Request headers: {e.request.headers}")
        print(f"[ERROR] Response headers: {e.response.headers}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error communicating with database: {error_msg}"
        )
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"[ERROR] Database error: {error_msg}")
        print(f"[ERROR] Exception type: {type(e).__name__}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {error_msg}"
        )

@router.get("/", response_model=List[dict])
async def get_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    vessel_id: Optional[int] = Query(None, description="Filter by vessel ID"),
    start_date: Optional[int] = Query(None, description="Start date for filtering"),
    end_date: Optional[int] = Query(None, description="End date for filtering"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    offset: int = Query(0, ge=0, description="Page offset"),
):
    """
    Get a paginated list of events with optional filtering.
    """
    print("\n[DEBUG] Received request to /api/events/")
    print(f"[DEBUG] Query params: event_type={event_type}, vessel_id={vessel_id}, start_date={start_date}, end_date={end_date}, severity={severity}, limit={limit}, offset={offset}")
    # Initialize where_clauses list
    where_clauses = ["1 = 1"]
    
    # Build the WHERE clause based on provided filters
    if event_type:
        where_clauses.append(f"event_type = '{event_type}'")
    
    if vessel_id:
        where_clauses.append(f"arrayExists(x -> x = {vessel_id}, vessels)")
        
    if start_date:
        where_clauses.append(f"timestamp >= {start_date}")
        
    if end_date:
        where_clauses.append(f"timestamp <= {end_date}")
        
    if severity:
        where_clauses.append(f"severity = '{severity}'")
    
    where_clause = " AND ".join(where_clauses)
    
    # Build the query with specific fields
    query = f"""
    SELECT 
        toString(event_id) as event_id,
        event_type,
        severity,
        status,
        timestamp,
        start_time,
        end_time,
        duration,
        location_wkt,
        vessels,
        s2_cell_id,
        processed_at,
        info_threshold_acceleration,
        info_average_acceleration_delta,
        info_max_acceleration,
        info_recieved_positions
    FROM ais_events_flat
    WHERE {where_clause}
    ORDER BY timestamp DESC
    LIMIT {limit} OFFSET {offset}
    """
    
    print(f"Executing query: {query}")
    
    try:
        # Execute query
        events = await execute_clickhouse_query(query)
        print(f"Retrieved {len(events)} events")
        return events
    except Exception as e:
        print(f"Error executing query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error executing query: {str(e)}"
        )

@router.get("/count")
async def get_events_count(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
):
    """Get total count of events with optional filtering"""
    where_clauses = ["1 = 1"]
    
    if event_type:
        where_clauses.append(f"event_type = '{event_type}'")
    if severity:
        where_clauses.append(f"severity = '{severity}'")
        
    where_clause = " AND ".join(where_clauses)
    
    query = f"""
    SELECT count(*) as total
    FROM ais_events_flat
    WHERE {where_clause}
    """
    
    try:
        result = await execute_clickhouse_query(query)
        return {"total": result[0]["total"] if result else 0}
    except Exception as e:
        print(f"Error getting event count: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting event count: {str(e)}"
        )

@router.get("/types", response_model=List[Dict[str, str]])
async def get_event_types():
    """Get list of available event types"""
    query = """
    SELECT DISTINCT event_type as type
    FROM ais_events_flat
    ORDER BY type
    """
    
    try:
        event_types = await execute_clickhouse_query(query)
        return [{"type": et["type"], "severity": EVENT_SEVERITY.get(et["type"], "info")} for et in event_types]
    except Exception as e:
        print(f"Error getting event types: {str(e)}")
        return []

@router.get("/{event_id}", response_model=Event)
async def get_event(event_id: str):
    """
    Get a specific event by ID
    """
    query = f"""
    SELECT 
        toString(event_id) as event_id,
        event_type,
        timestamp,
        start_time,
        end_time,
        duration,
        severity,
        status,
        location_wkt,
        vessels,
        s2_cell_id,
        processed_at
    FROM ais_events_flat
    WHERE event_id = '{event_id}'
    LIMIT 1
    """
    
    events = await execute_clickhouse_query(query)
    
    if not events:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
        
    event = events[0]
    return {
        "event_id": event["event_id"],
        "event_type": event["event_type"],
        "timestamp": event["timestamp"],
        "start_time": event["start_time"],
        "end_time": event["end_time"],
        "duration": event["duration"],
        "severity": event["severity"],
        "status": event["status"],
        "location_wkt": event["location_wkt"],
        "vessels": event["vessels"],
        "s2_cell_id": event["s2_cell_id"],
        "processed_at": event["processed_at"]
    }

# @router.get("/{event_id}/trajectories")
# async def get_event_trajectory(event_id: str):
#     """
#     Get event trajectory information including:
#     - Start time & end time
#     - List of vessels involved
#     - Per-vessel trajectories sourced from ais_processed_flat
#     - A merged trajectory when multiple vessels are present
#     """
#     try:
#         # First, get the event details
#         event_query = f"""
#         SELECT 
#             toString(event_id) as event_id,
#             start_time,
#             end_time,
#             vessels
#         FROM ais_events_flat
#         WHERE toString(event_id) = '{event_id}'
#         LIMIT 1
#         """
        
#         events = await execute_clickhouse_query(event_query)
        
#         if not events:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Event not found"
#             )
            
#         event = events[0]

#         start_time = event.get("start_time")
#         end_time = event.get("end_time")
#         vessels = event.get("vessels", []) or []

#         merged_timeline: Dict[str, Dict[str, Dict]] = {}

#         if start_time is not None and end_time is not None and vessels:
#             for vessel_id in vessels:
#                 if vessel_id is None:
#                     continue

#                 try:
#                     vessel_id_int = int(vessel_id)
#                 except (TypeError, ValueError):
#                     continue

#                 traj_query = f"""
#                 SELECT 
#                     vessel_id,
#                     metadata_timestamp as timestamp,
#                     lat as latitude,
#                     lon as longitude,
#                     speed,
#                     course,
#                     heading
#                 FROM ais_processed_flat
#                 WHERE vessel_id = {vessel_id_int}
#                   AND metadata_timestamp >= {start_time}
#                   AND metadata_timestamp <= {end_time}
#                   AND lat IS NOT NULL
#                   AND lon IS NOT NULL
#                 ORDER BY metadata_timestamp ASC
#                 """

#                 positions = await execute_clickhouse_query(traj_query)
#                 if positions:
#                     for position in positions:
#                         ts_key = str(position.get("timestamp"))
#                         if ts_key not in merged_timeline:
#                             merged_timeline[ts_key] = {}
#                         merged_timeline[ts_key][str(vessel_id_int)] = {
#                             "latitude": position.get("latitude"),
#                             "longitude": position.get("longitude"),
#                             "speed": position.get("speed"),
#                             "course": position.get("course"),
#                             "heading": position.get("heading"),
#                         }

#             # Ensure timeline is ordered by timestamp
#             merged_timeline = dict(sorted(merged_timeline.items(), key=lambda item: int(item[0])))

#             # Propagate last known positions so each timestamp contains all active vessels
#             last_positions: Dict[str, Dict] = {}
#             for ts_key, vessel_points in merged_timeline.items():
#                 updated_points: Dict[str, Dict] = {}
#                 for vessel_id_str, position in vessel_points.items():
#                     updated_points[vessel_id_str] = position
#                     last_positions[vessel_id_str] = position

#                 for vessel_id in vessels:
#                     vessel_id_str = str(vessel_id)
#                     if vessel_id_str not in updated_points and vessel_id_str in last_positions:
#                         updated_points[vessel_id_str] = last_positions[vessel_id_str]

#                 merged_timeline[ts_key] = updated_points

#         return {
#             "trajectories": merged_timeline,
#             "event_details": {
#                 "event_id": event_id,
#                 "start_time": start_time,
#                 "end_time": end_time,
#                 "vessels": vessels
#             }
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         print(f"Error fetching event trajectory: {str(e)}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error fetching event trajectory: {str(e)}"
#         )



# @router.get("/trajectory/{vessel_id}", response_model=List[Dict])
async def get_vessel_trajectory(
    vessel_id: int,
    start_time: int = Query(..., description="Start timestamp in milliseconds"),
    end_time: int = Query(..., description="End timestamp in milliseconds"),
):
    """
    Get vessel trajectory (position history) for a specific vessel_id between start and end time.
    Used for event playback visualization.
    """
    print(f"\n[DEBUG] Fetching trajectory for vessel_id {vessel_id} from {start_time} to {end_time}")
    
    # Build query to fetch vessel positions from ais_processed_flat
    query = f"""
    SELECT 
        vessel_id,
        metadata_timestamp as timestamp,
        lat as latitude,
        lon as longitude,
        speed,
        course,
        heading
    FROM ais_processed_flat
    WHERE vessel_id = {vessel_id}
      AND metadata_timestamp >= {start_time}
      AND metadata_timestamp <= {end_time}
      AND lat IS NOT NULL
      AND lon IS NOT NULL
    ORDER BY metadata_timestamp ASC
    """
    
    try:
        positions = await execute_clickhouse_query(query)
        print(f"Retrieved {len(positions)} positions for vessel_id {vessel_id}")
        return positions
    except Exception as e:
        print(f"Error fetching trajectory: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching trajectory: {str(e)}"
        )

from typing import Dict, List
from fastapi import HTTPException, status
from uuid import uuid4

async def build_event_trajectory_response(event_id: str) -> Dict:
    """
    Common reusable function that builds the event trajectory response
    WITHOUT changing existing logic.
    """

    # 1. Get event details
    event_query = f"""
    SELECT 
        toString(event_id) AS event_id,
        event_type,
        start_time,
        end_time,
        vessels
    FROM ais_events_flat
    WHERE toString(event_id) = '{event_id}'
    LIMIT 1
    """

    events = await execute_clickhouse_query(event_query)

    if not events:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    event = events[0]
    event_type = event.get("event_type")
    start_time = event.get("start_time")
    end_time = event.get("end_time")
    vessels = event.get("vessels", []) or []

    merged_timeline: Dict[str, Dict[str, Dict]] = {}
    speed_data: List[Dict] = []

    if start_time and end_time and vessels:
        vessel_id = vessels[0]

        try:
            vessel_id_int = int(vessel_id)
        except (TypeError, ValueError):
            vessel_id_int = None

        if vessel_id_int is not None:
            traj_query = f"""
            SELECT 
                vessel_id,
                metadata_timestamp AS timestamp,
                lat AS latitude,
                lon AS longitude,
                processing_kinematics_speed_mps AS speed_mps,
                course,
                heading
            FROM ais_processed_flat
            WHERE vessel_id = {vessel_id_int}
              AND metadata_timestamp >= {start_time}
              AND metadata_timestamp <= {end_time}
              AND lat IS NOT NULL
              AND lon IS NOT NULL
            ORDER BY metadata_timestamp ASC
            """

            positions = await execute_clickhouse_query(traj_query)

            for position in positions:
                ts = position.get("timestamp")
                ts_key = str(ts)

                if ts_key not in merged_timeline:
                    merged_timeline[ts_key] = {}

                merged_timeline[ts_key][str(vessel_id_int)] = {
                    "latitude": position.get("latitude"),
                    "longitude": position.get("longitude"),
                    "speed_mps": position.get("speed_mps"),
                    "course": position.get("course"),
                    "heading": position.get("heading"),
                }

                if event_type == "prolonged_low_speed":
                    speed_data.append({
                        "time": ts,
                        "speed": position.get("speed_mps"),
                    })

    merged_timeline = dict(
        sorted(merged_timeline.items(), key=lambda item: int(item[0]))
    )

    return {
        "trajectories": merged_timeline,
        "speed_graph": {
            "enabled": event_type == "prolonged_low_speed",
            "unit": "mps",
            "speed_data": speed_data
        },
        "event_details": {
            "event_id": event_id,
            "event_type": event_type,
            "start_time": start_time,
            "end_time": end_time,
            "vessels": vessels
        }
    }


@router.get("/{event_id}/trajectories")
async def get_event_trajectory(event_id: str):
    try:
        return await build_event_trajectory_response(event_id)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching event trajectory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching event trajectory: {str(e)}"
        )


class ShareEventRequest(BaseModel):
    event_id: str
    user_id: str


EVENTS_FOLDER = "event"

@router.post("/share")
async def share_event_trajectory(payload: ShareEventRequest):
    try:
        # Build same response as GET endpoint
        response_data = await build_event_trajectory_response(payload.event_id)

        # Save to GCS
        filename = save_json_to_gcs(
            folder=EVENTS_FOLDER,
            user_id=payload.user_id,
            data=response_data
        )

        return {
            "success": True,
            "message": "Event trajectory shared successfully",
            "file": filename,
            "bucket": BUCKET_NAME,
            "path": f"{EVENTS_FOLDER}/{filename}"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sharing event trajectory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error sharing event trajectory"
        )