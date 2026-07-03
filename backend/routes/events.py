from fastapi import APIRouter, HTTPException, Query, Request
from typing import Any, Dict, Literal
import httpx
import os
from dotenv import load_dotenv
from db import client  # Import client instead of db
import json
from datetime import datetime, timedelta, timezone
import re
import inspect
from pydantic import BaseModel, ValidationError, model_validator
from bson import ObjectId

load_dotenv()

router = APIRouter(
    prefix="/api/mongo-events",  # Different prefix to avoid conflict with event.router
    tags=["mongo-events"]
)

# ClickHouse config
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "34.14.212.228")
CLICKHOUSE_PORT = os.getenv("CLICKHOUSE_PORT", "8123")
CLICKHOUSE_URL = f"http://{CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}"
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "default")
# 🔒 SECURITY: Never store real passwords as defaults - must be set via env var
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD")
if not CLICKHOUSE_PASSWORD:
    raise ValueError("CLICKHOUSE_PASSWORD environment variable must be set")

# MongoDB config
MONGO_DB = "dev"
EVENTS_COLLECTION = "events"

Operator = Literal["eq", "ne", "gt", "gte", "lt", "lte", "between", "contains", "startsWith", "endsWith"]

# Regex patterns for date/time detection
DATE_ONLY_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MINUTE_ONLY_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")

# Helper for Motor/PyMongo compatibility
async def maybe_await(value):
    """Helper to handle both Motor (async) and PyMongo (sync) operations"""
    return await value if inspect.isawaitable(value) else value


async def iter_cursor(cursor):
    """Yield items from both Motor (async) and PyMongo (sync) cursors."""
    if hasattr(cursor, "__aiter__"):
        async for item in cursor:
            yield item
    else:
        for item in cursor:
            yield item


def is_supported_field(field: str) -> bool:
    return field != "information" and not field.startswith("information.")


def infer_scalar_type(value: Any) -> str:
    """Infer MongoDB scalar type from value."""
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, datetime):
        return "timestamp"
    if isinstance(value, str):
        return "string"
    return "string"


def infer_list_type(values: list[Any]) -> str:
    """Infer MongoDB array element type from first element."""
    if not values:
        return "array"
    first = values[0]
    if isinstance(first, bool):
        return "boolean[]"
    if isinstance(first, (int, float)):
        return "number[]"
    if isinstance(first, str):
        return "string[]"
    return "array"


def collect_schema(doc: dict) -> dict[str, str]:
    """Collect field schema from document using iterative stack traversal."""
    schema: dict[str, str] = {}
    stack = [(doc, "")]

    while stack:
        current, prefix = stack.pop()

        if not isinstance(current, dict):
            continue

        for key, value in current.items():
            if key == "_id":
                continue

            full_key = f"{prefix}.{key}" if prefix else key
            if not is_supported_field(full_key):
                continue

            if isinstance(value, dict) and not isinstance(value, datetime):
                stack.append((value, full_key))
            elif isinstance(value, list):
                schema[full_key] = infer_list_type(value)
            else:
                schema[full_key] = infer_scalar_type(value)

    return schema


async def get_collection_schema(events_collection) -> dict[str, str]:
    cursor = events_collection.find({}, {"_id": 0})
    combined_schema: dict[str, str] = {}
    async for doc in iter_cursor(cursor):
        combined_schema.update(collect_schema(doc))
    return combined_schema


def serialize_event(event: dict) -> dict:
    return {
        "id":               str(event.get("_id")),
        "type":             event.get("type"),
        "severity":         event.get("severity"),
        "status":           event.get("status"),
        "timestamp":        serialize_datetime(event.get("timestamp")),
        "start_time":       serialize_datetime(event.get("start_time")),
        "end_time":         serialize_datetime(event.get("end_time")),
        "vessels_involved": [str(v) for v in event.get("vessels_involved", [])],
        "location":         event.get("location"),
        "temporality":      event.get("temporality"),
        "event_source":     event.get("event_source"),
        "model":            event.get("model"),
    }


class EventFilter(BaseModel):
    field: str
    operator: Operator
    value: Any
    value2: Any | None = None

    @model_validator(mode="after")
    def validate_values(self):
        if self.value is None:
            raise ValueError("value is required")
        if self.operator == "between" and self.value2 is None:
            raise ValueError("value2 is required for between operator")
        return self


def _to_datetime(value: Any) -> Any:
    """Convert timestamp values to datetime (UTC naive for MongoDB compatibility)
    Supports: ISO 8601 strings (primary), millisecond integers (legacy)
    """
    if value is None:
        return value
    if isinstance(value, datetime):
        # Normalize to UTC naive (MongoDB stores naive UTC)
        if value.tzinfo:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value
    
    # Primary: Try ISO 8601 string format (2024-12-04T13:03:31.000Z)
    if isinstance(value, str):
        try:
            # Handle Z suffix for UTC
            normalized = value.replace('Z', '+00:00')
            dt = datetime.fromisoformat(normalized)
            # Convert to UTC naive
            if dt.tzinfo:
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt
        except Exception:
            pass
    
    # Fallback: Try millisecond timestamp (legacy support)
    try:
        timestamp_ms = int(value)
        # Create UTC naive datetime
        dt = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).replace(tzinfo=None)
        return dt
    except (ValueError, TypeError, OSError):
        pass
    
    return value


def get_time_window(raw_value: str, dt: datetime) -> tuple[datetime, datetime]:
    """Get time window boundaries based on date string precision.
    
    Returns (start, end) tuple for range queries:
    - Date only (YYYY-MM-DD) → whole day
    - Minute precision (YYYY-MM-DDTHH:MM) → whole minute
    - Full datetime → 1-second window
    """
    if DATE_ONLY_PATTERN.match(raw_value):
        return dt, dt + timedelta(days=1)
    if MINUTE_ONLY_PATTERN.match(raw_value):
        return dt, dt + timedelta(minutes=1)
    # Handle frontend DateTimePicker values like:
    # 2024-12-04T10:35:00.000Z
    # User selected only up to minute precision, but toISOString() added :00.000Z
    if isinstance(dt, datetime) and dt.second == 0 and dt.microsecond == 0:
        return dt, dt + timedelta(minutes=1)
    return dt, dt + timedelta(seconds=1)

def normalize_value_by_type(value: Any, field_type: str) -> Any:
    """Convert incoming filter value to the correct Python type based on schema type."""
    if value is None:
        return value

    base_type = field_type[:-2] if field_type.endswith("[]") else field_type

    if base_type == "number":
        try:
            text = str(value).strip()
            return int(text) if text.isdigit() else float(text)
        except (ValueError, TypeError):
            return value

    if base_type == "timestamp":
        return _to_datetime(value)

    if base_type == "boolean":
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered == "true":
                return True
            if lowered == "false":
                return False
        return value

    if base_type == "string":
        return str(value).strip()

    return value

SIMPLE_OPERATORS = {
    "eq": lambda f, v1, v2=None: {f: v1},
    "ne": lambda f, v1, v2=None: {f: {"$ne": v1}},
    "gt": lambda f, v1, v2=None: {f: {"$gt": v1}},
    "gte": lambda f, v1, v2=None: {f: {"$gte": v1}},
    "lt": lambda f, v1, v2=None: {f: {"$lt": v1}},
    "lte": lambda f, v1, v2=None: {f: {"$lte": v1}},
    "between": lambda f, v1, v2=None: {f: {"$gte": v1, "$lte": v2}},
}


def build_text_condition(field: str, operator: str, value: Any) -> dict:
    """Build regex condition for text search operators."""
    escaped = re.escape(str(value))
    if operator == "startsWith":
        pattern = f"^{escaped}"
    elif operator == "endsWith":
        pattern = f"{escaped}$"
    else:
        pattern = escaped
    return {field: {"$regex": pattern, "$options": "i"}}


def build_mongo_query(filters: list[EventFilter], schema: dict[str, str], search_query: str | None = None) -> dict:
    conditions: list[dict] = []

    for filter_item in filters:
        mongo_field = filter_item.field
        if not is_supported_field(mongo_field):
            continue
        field_type = schema.get(mongo_field)
        if not field_type:
            continue
        value1 = filter_item.value
        value2 = filter_item.value2
        raw_value = value1  # Keep original for pattern checking
        
        # Normalize values dynamically based on field type
        value1 = normalize_value_by_type(value1, field_type)
        if value2 is not None:
            value2 = normalize_value_by_type(value2, field_type)

        base_type = field_type[:-2] if field_type.endswith("[]") else field_type

        # Special handling for timestamp-typed fields
        if base_type == "timestamp":
            dt1 = _to_datetime(value1)

            # "eq" and "ne" on timestamp use range matching based on input precision
            if filter_item.operator in {"eq", "ne"} and isinstance(raw_value, str) and isinstance(dt1, datetime):
                start, end = get_time_window(raw_value, dt1)
                if filter_item.operator == "eq":
                    conditions.append({mongo_field: {"$gte": start, "$lt": end}})
                else:
                    conditions.append({
                        "$or": [
                            {mongo_field: {"$lt": start}},
                            {mongo_field: {"$gte": end}},
                        ]
                    })
                continue
            
            # Other timestamp operators use normalized datetime values
            value1 = dt1
            if value2 is not None:
                value2 = _to_datetime(value2)

        # # For vessels_involved filtering, normalize value to int when possible
        # # because DB may store as int but frontend sends as string
        # if mongo_field == "vessels_involved" and filter_item.operator in ["eq", "ne", "gt", "gte", "lt", "lte"]:
        #     try:
        #         value1 = int(value1)
        #         if value2 is not None:
        #             value2 = int(value2)
        #     except (ValueError, TypeError):
        #         # If not an int, use string as-is
        #         pass
        
        # Use operator dispatch for standard operators
        if filter_item.operator in SIMPLE_OPERATORS:
            conditions.append(SIMPLE_OPERATORS[filter_item.operator](mongo_field, value1, value2))
        elif filter_item.operator in {"contains", "startsWith", "endsWith"}:
            if field_type not in {"string", "string[]"}:
                continue
            # For string[] fields, regex matches if any array element matches.
            conditions.append(build_text_condition(mongo_field, filter_item.operator, value1))
        else:
            raise ValueError(f"Unsupported operator: {filter_item.operator}")

    if search_query:
        escaped_query = re.escape(search_query.strip())
        if escaped_query:
            or_conditions = [
                {"event_id": {"$regex": escaped_query, "$options": "i"}},
                {"type": {"$regex": escaped_query, "$options": "i"}},
                {"severity": {"$regex": escaped_query, "$options": "i"}},
                {"status": {"$regex": escaped_query, "$options": "i"}},
                {"vessels_involved": search_query.strip()},
            ]
            # Also match vessels_involved as integers (vessel IDs)
            try:
                vessel_id_int = int(search_query.strip())
                or_conditions.append({"vessels_involved": vessel_id_int})
            except ValueError:
                pass
            conditions.append({"$or": or_conditions})

    if not conditions:
        return {}
    return {"$and": conditions} if len(conditions) > 1 else conditions[0]


def serialize_datetime(dt) -> str | None:
    """Serialize a naive UTC datetime to an ISO 8601 string with 'Z' suffix.

    MongoDB stores datetimes as naive UTC. FastAPI would serialize them without
    a timezone suffix, causing JavaScript to mis-parse them as local time.
    Appending 'Z' forces JS to treat the value as UTC.
    """
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.strftime('%Y-%m-%dT%H:%M:%S.') + f'{dt.microsecond // 1000:03d}Z'
    return dt  # already a string or other type — pass through


def deep_serialize_datetimes(obj):
    """Recursively replace every datetime in a dict/list with a UTC ISO string."""
    if isinstance(obj, datetime):
        return serialize_datetime(obj)
    if isinstance(obj, dict):
        return {k: deep_serialize_datetimes(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [deep_serialize_datetimes(i) for i in obj]
    return obj


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

@router.get("/metadata")
async def get_events_metadata():
    """
    Get metadata for events table columns
    Dynamically discovers schema from MongoDB collection
    """
    events_collection = client[MONGO_DB][EVENTS_COLLECTION]
    combined_schema = await get_collection_schema(events_collection)

    columns = []
    for field_name in sorted(combined_schema.keys()):
        field_type = combined_schema[field_name]
        normalized_type = field_type[:-2] if field_type.endswith("[]") else field_type
        columns.append({
            "field": field_name,
            "label": field_name.replace("_", " ").replace(".", " ").title(),
            "type": normalized_type,
            "filterable": True,
            "unique_values": [],
        })

    return {"columns": columns}

def is_array_type(field_type: str) -> bool:
    return field_type.endswith("[]")

@router.get("/metadata/values")
async def get_field_values(
    field: str = Query(..., description="Field name to fetch unique values for"),
    limit: int | None = Query(None, ge=1, description="Maximum number of unique values to return")
):
    """
    Fetch unique values for a specific field dynamically
    Supports dynamic fields discovered from metadata schema.
    
    🔒 Security: Only allow querying fields that exist in metadata schema
    """
    events_collection = client[MONGO_DB][EVENTS_COLLECTION]
    
    if not is_supported_field(field):
        raise HTTPException(status_code=400, detail=f"Field '{field}' is not allowed")

    # ✅ Cheap existence check instead of rebuilding full schema
    exists = await maybe_await(
        events_collection.find_one({field: {"$exists": True}}, {"_id": 1})
    )

    schema = await get_collection_schema(events_collection)
    field_type = schema.get(field)

    if not field_type:
        raise HTTPException(status_code=400, detail=f"Field '{field}' not found in schema")

    if not exists:
        raise HTTPException(status_code=400, detail=f"Field '{field}' not found")
    
    try:
        unique_values = []

        # For known array fields, use unwind pipeline
        if is_array_type(field_type):
            pipeline = [
                {"$unwind": f"${field}"},
                {"$group": {"_id": f"${field}"}},
                {"$sort": {"_id": 1}},
            ]
            if limit is not None:
                pipeline.append({"$limit": limit})

            cursor = events_collection.aggregate(pipeline)
            async for doc in iter_cursor(cursor):
                if doc.get("_id") is not None:
                    unique_values.append(str(doc["_id"]))
        else:
            # For scalar fields, use distinct (cleaner and safer)
            distinct_result = await maybe_await(events_collection.distinct(field))
            unique_values = [
                str(v) for v in distinct_result 
                if v is not None and not isinstance(v, datetime)
            ]
            if limit is not None:
                unique_values = unique_values[:limit]
        
        return {
            "field": field,
            "values": unique_values,
            "count": len(unique_values)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch values for field '{field}': {e}")


@router.get("/list")
async def list_events(
    limit: int = Query(1000, ge=0, le=5000),
    offset: int = Query(0, ge=0),
    filters: str | None = None,
    q: str | None = Query(None, max_length=200),
    id: str | None = Query(None, description="Filter by MongoDB _id")
):
    """
    Get events list from MongoDB (integration_test database)
    Supports progressive filtering via 'filters' parameter
    """
    events_collection = client[MONGO_DB][EVENTS_COLLECTION]

    # Shortcut: if a specific _id is requested, bypass the schema/filter machinery
    if id:
        try:
            object_id = ObjectId(id)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid event ID format: {id}")
        event = await maybe_await(events_collection.find_one({'_id': object_id}))
        if not event:
            return {'events': [], 'total': 0, 'limit': limit, 'offset': offset}
        return {'events': [serialize_event(event)], 'total': 1, 'limit': limit, 'offset': offset}

    schema = await get_collection_schema(events_collection)

    mongo_query = {}
    if filters:
        try:
            raw_filters = json.loads(filters)
            if not isinstance(raw_filters, list):
                raise ValueError("filters must be a list")

            parsed_filters = [EventFilter.model_validate(item) for item in raw_filters]
            mongo_query = build_mongo_query(parsed_filters, schema, q)
        except (json.JSONDecodeError, ValidationError, ValueError, TypeError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid filters: {exc}")
    elif q:
        mongo_query = build_mongo_query([], schema, q)

    # Get total count with filters applied
    total_count = await maybe_await(events_collection.count_documents(mongo_query))
    
    # Get events with pagination
    if limit == 0:
        return {
            'events': [],
            'total': total_count,
            'limit': limit,
            'offset': offset
        }

    # Deterministic sort: timestamp desc, then _id asc
    cursor = events_collection.find(mongo_query).skip(offset).limit(limit).sort([('timestamp', -1), ('_id', 1)])
    events = []

    async for event in iter_cursor(cursor):
        events.append(serialize_event(event))
    

    return {
        'events': events,
        'total': total_count,
        'limit': limit,
        'offset': offset
    }


@router.get("/{event_id}/playback")
async def get_event_playback(event_id: str, request: Request) -> Dict:
    """
    Get event playback data
    Returns: event details + vessel trajectories
    """
    try:
        # 1. Get event from MongoDB using _id (events_v2 has no event_id field)
        events_collection = client[MONGO_DB][EVENTS_COLLECTION]
        try:
            object_id = ObjectId(event_id)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid event ID format: {event_id}")
        event = await maybe_await(events_collection.find_one({'_id': object_id}))
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event['_id'] = str(event['_id'])

        # Stash raw datetime objects BEFORE serialising — they are needed for
        # ClickHouse timestamp arithmetic further below.
        raw_start_time = event.get('start_time')
        raw_end_time   = event.get('end_time')

        # Convert all naive UTC datetimes in the document to 'Z'-suffixed ISO strings.
        # FastAPI serialises naive datetimes without a timezone suffix, causing JS to
        # interpret them as local time.  deep_serialize_datetimes walks the whole document
        # so every nested datetime (e.g. inside information {}) is also covered.
        event = deep_serialize_datetimes(event)

        # 2. Get vessel trajectories from ClickHouse
        vessel_ids = event.get('vessels_involved', [])
        start_time = raw_start_time  # original datetime (or None)
        end_time   = raw_end_time    # original datetime (or None)

        trajectories = {}
        
        # 3. If geofence intrusion, fetch polygon details
        if event.get('type') == 'geofence_intrusion':
            try:
                # Check for geofence_id in information field
                geofence_id = event.get('information', {}).get('geofence_id')

                if geofence_id:
                    polygons_collection = client[MONGO_DB]['polygons']
                    # Try to convert to ObjectId, otherwise query as string
                    query_id = geofence_id
                    try:
                        query_id = ObjectId(geofence_id)
                    except Exception:
                        pass

                    polygon = await maybe_await(polygons_collection.find_one({'_id': query_id}))

                    if polygon:
                        # Convert ObjectId to string
                        polygon['_id'] = str(polygon['_id'])
                        # Add polygon to event details
                        event['geofence_polygon'] = polygon
            except Exception:
                pass

        # 4. If port intrusion, fetch port details
        if event.get('type') == 'port_intrusion':
            try:
                port_id = event.get('information', {}).get('port_id')
                if port_id:
                    ports_collection = client[MONGO_DB]['ports']
                    query_id = port_id
                    try:
                        query_id = ObjectId(port_id)
                    except Exception:
                        pass
                    port = await maybe_await(ports_collection.find_one({'_id': query_id}))
                    if port:
                        port['_id'] = str(port['_id'])
                        event['port_data'] = port
            except Exception:
                pass

        if vessel_ids and start_time:
            # 🔒 SECURITY: Normalize vessel IDs to integers only to prevent SQL injection
            vessel_ids_list = []
            for vid in vessel_ids:
                try:
                    vessel_ids_list.append(int(vid))
                except (ValueError, TypeError):
                    continue  # Skip invalid vessel IDs
            
            if not vessel_ids_list:
                raise ValueError("No valid vessel IDs found for playback")
            
            vessel_ids_str = ','.join(map(str, vessel_ids_list))
            
            # Convert datetime to Unix timestamp (milliseconds)
            # Use .replace(tzinfo=timezone.utc) to treat naive datetimes from MongoDB as UTC,
            # preventing Python from assuming local time (e.g. IST +05:30) which shifts the window.
            if isinstance(start_time, datetime):
                utc_dt = start_time.replace(tzinfo=timezone.utc)
                start_time_ms = int(utc_dt.timestamp() * 1000)
            elif isinstance(start_time, str):
                utc_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                start_time_ms = int(utc_dt.timestamp() * 1000)
            else:
                start_time_ms = int(start_time)

            # Handle end_time - if null, fetch all trajectories from start_time onwards
            if end_time:
                if isinstance(end_time, datetime):
                    utc_dt = end_time.replace(tzinfo=timezone.utc)
                    end_time_ms = int(utc_dt.timestamp() * 1000)
                elif isinstance(end_time, str):
                    utc_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    end_time_ms = int(utc_dt.timestamp() * 1000)
                else:
                    end_time_ms = int(end_time)
                
                # Expand time window: -3 hours before start, +3 hours after end
                THREE_HOURS_MS = 3 * 60 * 60 * 1000  # 3 hours in milliseconds
                query_start_time_ms = start_time_ms - THREE_HOURS_MS
                query_end_time_ms = end_time_ms + THREE_HOURS_MS
            else:
                # No end_time: fetch all trajectories from start_time onwards
                # Only need lower bound, SQL will handle the rest
                THREE_HOURS_MS = 3 * 60 * 60 * 1000  # 3 hours in milliseconds
                query_start_time_ms = start_time_ms - THREE_HOURS_MS
                query_end_time_ms = None  # No upper bound
            
            # Convert to seconds for ClickHouse (enforce type as int)
            query_start_time_sec = int(query_start_time_ms // 1000)
            query_end_time_sec = int(query_end_time_ms // 1000) if query_end_time_ms else None
            
            # Build query with conditional upper bound
            if query_end_time_sec:
                query = f"""
                SELECT 
                    metadata_timestamp as timestamp,
                    groupArray((toString(vessel_id), lat, lon, processing_kinematics_speed_mps, course, processing_kinematics_heading_deg)) as vessel_data
                FROM integration_test.ais_processed_flat
                WHERE vessel_id IN ({vessel_ids_str})
                  AND metadata_timestamp >= {query_start_time_sec}
                  AND metadata_timestamp <= {query_end_time_sec}
                  AND lat IS NOT NULL
                  AND lon IS NOT NULL
                GROUP BY metadata_timestamp
                ORDER BY metadata_timestamp ASC
                """
            else:
                # No upper bound - fetch all data from start_time onwards
                query = f"""
                SELECT 
                    metadata_timestamp as timestamp,
                    groupArray((toString(vessel_id), lat, lon, processing_kinematics_speed_mps, course, processing_kinematics_heading_deg)) as vessel_data
                FROM integration_test.ais_processed_flat
                WHERE vessel_id IN ({vessel_ids_str})
                  AND metadata_timestamp >= {query_start_time_sec}
                  AND lat IS NOT NULL
                  AND lon IS NOT NULL
                GROUP BY metadata_timestamp
                ORDER BY metadata_timestamp ASC
                """
            
            # Note: ClickHouse JSONEachRow might return tuples as lists
            clickhouse_client = getattr(request.app.state, "clickhouse_client", None)
            if clickhouse_client is None:
                raise HTTPException(status_code=500, detail="ClickHouse client not initialized")

            rows = await query_clickhouse(query, clickhouse_client)
            
            # Build trajectories dict: {timestamp: {vessel_id: position}}
            # Convert ClickHouse timestamps (seconds) back to milliseconds for frontend
            for row in rows:
                ts_seconds = row['timestamp']
                ts_ms = ts_seconds * 1000  # Convert back to milliseconds
                ts = str(ts_ms)
                
                if ts not in trajectories:
                    trajectories[ts] = {}
                
                # Iterate over grouped data for this timestamp
                # Each item in vessel_data is (vessel_id, lat, lon, speed, course, heading)
                for v_data in row['vessel_data']:
                    # v_data is likely a list or tuple
                    v_id = str(v_data[0])
                    trajectories[ts][v_id] = {
                        'latitude': v_data[1],
                        'longitude': v_data[2],
                        'speed_mps': v_data[3],
                        'course': v_data[4],
                        'heading': v_data[5]
                    }
        
        # Normalise vessel IDs to strings — Python ints serialise as JSON numbers,
        # which JS silently corrupts for values above Number.MAX_SAFE_INTEGER.
        # Trajectory keys are already strings (ClickHouse toString(vessel_id)),
        # so this keeps both sides of the PluginRegistry comparison consistent.
        event['vessels_involved'] = [str(v) for v in event.get('vessels_involved', [])]

        for profile in event.get('information', {}).get('vessel_profiles', []):
            if 'vessel_id' in profile:
                profile['vessel_id'] = str(profile['vessel_id'])

        return {
            'event_details': event,
            'trajectories': trajectories,
            'time_window': {
                # Return query window if we have valid start_time (end_time is optional)
                'query_start': query_start_time_ms if vessel_ids and start_time else None,
                'query_end': query_end_time_ms if vessel_ids and start_time else None,
                'event_start': start_time_ms if vessel_ids and start_time else None,
                'event_end': end_time_ms if vessel_ids and start_time and end_time else None,
                'buffer_hours': 3  # Updated to 3 hours
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
