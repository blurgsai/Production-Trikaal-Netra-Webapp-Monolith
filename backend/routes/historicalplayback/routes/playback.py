from fastapi import APIRouter, HTTPException
from ..database import (
    client, get_client, table_name,
    TIMESTAMP_COLUMN, ID_COLUMN, LAT_COLUMN, LON_COLUMN, HEADING_COLUMN, CLICKHOUSE_DATABASE
)
from ..schemas import PlaybackQuery, MinutePlaybackQuery
from datetime import datetime, timedelta, timezone
from ..models import FILTER_ATTRIBUTE_MAP_CLICKHOUSE
from typing import Dict, List, Set
import logging
import asyncio

# Set up logging to catch tracebacks
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/playback", tags=["Playback"])

NUMERIC_FIELDS = {"metadata_timestamp", "metadata_mmsi", "metadata_imo", "lat", "lon", "speed", "heading"}
# Fields that need toString() conversion for LIKE operations (even if not in NUMERIC_FIELDS)
STRING_LIKE_FIELDS = {"vessel_id"}

@router.get("/attributes")
async def get_playback_attributes():
    try:
        # Query ClickHouse to get all column names from the vessels table
        sql = f"SELECT name FROM system.columns WHERE database = '{CLICKHOUSE_DATABASE}' AND table = '{table_name.split('.')[-1]}' ORDER BY name"
        logger.info(f"Fetching attributes: {sql}")

        result = await asyncio.get_event_loop().run_in_executor(None, client.query, sql)

        # Convert column names to the expected format
        attributes = []
        for row in result.result_rows:
            column_name = row[0]
            # Use column name as both key and path for simplicity
            attributes.append({
                "key": column_name,
                "path": column_name
            })

        logger.info(f"Found {len(attributes)} attributes: {[attr['key'] for attr in attributes]}")

        return {
            "attributes": attributes
        }

    except Exception as e:
        logger.error(f"Error fetching attributes: {str(e)}", exc_info=True)
        # Fallback to hardcoded attributes if dynamic fetch fails
        return {
            "attributes": [
                {"key": key, "path": path}
                for key, path in FILTER_ATTRIBUTE_MAP_CLICKHOUSE.items()
            ]
        }

@router.post("/query")
async def query_playback_data(payload: PlaybackQuery):
    # ---------- Robust Helper ----------
    def parse_time(ts: str) -> datetime:
        if not ts:
            raise ValueError("Empty timestamp string received")
    
        clean_ts = ts.replace("Z", "").split(".")[0]
        
        #common formats
        formats = [
            "%Y-%m-%dT%H:%M:%S",  # 2024-12-04T11:00:00
            "%Y-%m-%dT%H:%M",     # 2024-12-04T11:00
            "%Y-%m-%d %H:%M:%S",  # 2024-12-04 11:00:00
            "%Y-%m-%d %H:%M",     # 2024-12-04 11:00
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(clean_ts, fmt)
                # Frontend now sends UTC times, so treat them as UTC
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        
        #Final fallback to built-in ISO parser
        try:
            return datetime.fromisoformat(clean_ts).replace(tzinfo=timezone.utc)
        except ValueError as e:
            logger.error(f"Failed to parse timestamp: {ts}")
            raise e

    try:
        # ---------- Time Logic ----------
        global_start = parse_time(payload.start_time)
        global_end = parse_time(payload.end_time)

        # ---------- Build SQL WHERE clauses ----------
        where_clauses = []
        
        # Time filter
        start_ms = int(global_start.timestamp() * 1000)
        end_ms = int(global_end.timestamp() * 1000)
        where_clauses.append(f"{TIMESTAMP_COLUMN} >= {start_ms} AND {TIMESTAMP_COLUMN} <= {end_ms}")
        
        # Spatial filter (bounding box approximation)
        polygon_points = payload.geometry["coordinates"][0]
        if not polygon_points:
            raise HTTPException(400, "Invalid geometry")
        lons = [p[0] for p in polygon_points]
        lats = [p[1] for p in polygon_points]
        if not lons or not lats:
            raise HTTPException(400, "Invalid geometry")
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        where_clauses.append(f"lon >= {min_lon} AND lon <= {max_lon} AND lat >= {min_lat} AND lat <= {max_lat}")
        
        # Additional filters
        def format_sql_value(value):
            if isinstance(value, str):
                return f"'{value}'"
            return str(value)
        
        if payload.filters:
            for key, conditions in payload.filters.items():
                # Use the key directly as the ClickHouse column name
                ch_field = key

                if isinstance(conditions, (str, int, float)):
                    conditions = [{"op": "=", "value": conditions}]

                for cond in conditions:
                    op = cond.get("op", "=")
                    value = cond.get("value")

                    # Handle wildcards (*) in string values
                    has_wildcards = False
                    if isinstance(value, str) and "*" in value:
                        has_wildcards = True
                        # Convert * to SQL % wildcards
                        sql_pattern = value.replace("*", "%")
                    else:
                        sql_pattern = value

                    # Only convert to numeric if no wildcards (wildcards indicate string pattern matching)
                    if key in NUMERIC_FIELDS and not has_wildcards:
                        try:
                            sql_pattern = float(str(sql_pattern).strip())
                        except (ValueError, TypeError):
                            continue

                    if op == "=":
                        # If value has wildcards, use LIKE instead of exact match
                        if has_wildcards and isinstance(value, str):
                            # For numeric fields or fields that need string conversion for LIKE
                            if key in NUMERIC_FIELDS or key in STRING_LIKE_FIELDS:
                                where_clauses.append(f"toString({ch_field}) LIKE '{sql_pattern}'")
                            else:
                                where_clauses.append(f"{ch_field} LIKE '{sql_pattern}'")
                        else:
                            where_clauses.append(f"{ch_field} = {format_sql_value(sql_pattern)}")
                    elif op == ">":
                        where_clauses.append(f"{ch_field} > {format_sql_value(sql_pattern)}")
                    elif op == "<":
                        where_clauses.append(f"{ch_field} < {format_sql_value(sql_pattern)}")
                    elif op == "contains" and isinstance(value, str):
                        where_clauses.append(f"{ch_field} LIKE '%{sql_pattern}%'")

        where_sql = " AND ".join(where_clauses)

        # ---------- Execute SQL ----------
        sql = f"SELECT {ID_COLUMN}, {LON_COLUMN}, {LAT_COLUMN}, {HEADING_COLUMN}, {TIMESTAMP_COLUMN} FROM {table_name} WHERE {where_sql} ORDER BY {TIMESTAMP_COLUMN}, {ID_COLUMN}"
        logger.info(f"Executing SQL: {sql}")
        
        result = await asyncio.get_event_loop().run_in_executor(None, client.query, sql)

        # ---------- Process Results ----------
        vessels: Dict[str, List[dict]] = {}
        timestamps: Set[str] = set()

        for row in result.result_rows:
            vessel_id, lon, lat, heading, ts_ms = row
            if not vessel_id:
                continue

            ts_dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
            ts_str = ts_dt.strftime("%Y-%m-%d %H:%M:%S")
            timestamps.add(ts_str)

            heading = heading or 0

            vessels.setdefault(str(vessel_id), []).append({
                "ts": ts_str,
                "lat": lat,
                "lon": lon,
                "heading": heading,
            })

        return {
            "timestamps": sorted(timestamps),
            "vessels": vessels
        }

    except Exception as e:
        logger.error(f"CRITICAL PLAYBACK ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/query-minute")
async def query_minute_playback_data(payload: MinutePlaybackQuery):
    """
    Query vessel data for a specific minute offset from base time.
    Returns data for exactly one minute duration.
    """
    # ---------- Robust Helper ----------
    def parse_time(ts: str) -> datetime:
        if not ts:
            raise ValueError("Empty timestamp string received")
    
        clean_ts = ts.replace("Z", "").split(".")[0]
        
        #common formats
        formats = [
            "%Y-%m-%dT%H:%M:%S",  # 2024-12-04T11:00:00
            "%Y-%m-%dT%H:%M",     # 2024-12-04T11:00
            "%Y-%m-%d %H:%M:%S",  # 2024-12-04 11:00:00
            "%Y-%m-%d %H:%M",     # 2024-12-04 11:00
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(clean_ts, fmt)
                # Frontend now sends UTC times, so treat them as UTC
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        
        #Final fallback to built-in ISO parser
        try:
            return datetime.fromisoformat(clean_ts).replace(tzinfo=timezone.utc)
        except ValueError as e:
            logger.error(f"Failed to parse timestamp: {ts}")
            raise e

    try:
        # ---------- Time Logic ----------
        base_time = parse_time(payload.base_time)
        minute_start = base_time + timedelta(minutes=payload.minute_offset)
        minute_end = minute_start + timedelta(minutes=1)

        # ---------- Build SQL WHERE clauses ----------
        where_clauses = []
        
        # Time filter - exactly one minute
        start_ms = int(minute_start.timestamp() * 1000)
        end_ms = int(minute_end.timestamp() * 1000)
        where_clauses.append(f"{TIMESTAMP_COLUMN} >= {start_ms} AND {TIMESTAMP_COLUMN} < {end_ms}")
        
        # Spatial filter (bounding box approximation)
        polygon_points = payload.geometry["coordinates"][0]
        if not polygon_points:
            raise HTTPException(400, "Invalid geometry")
        lons = [p[0] for p in polygon_points]
        lats = [p[1] for p in polygon_points]
        if not lons or not lats:
            raise HTTPException(400, "Invalid geometry")
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        where_clauses.append(f"lon >= {min_lon} AND lon <= {max_lon} AND lat >= {min_lat} AND lat <= {max_lat}")
        
        # Additional filters
        def format_sql_value(value):
            if isinstance(value, str):
                return f"'{value}'"
            return str(value)
        
        if payload.filters:
            for key, conditions in payload.filters.items():
                # Use the key directly as the ClickHouse column name
                ch_field = key

                if isinstance(conditions, (str, int, float)):
                    conditions = [{"op": "=", "value": conditions}]

                for cond in conditions:
                    op = cond.get("op", "=")
                    value = cond.get("value")

                    # Handle wildcards (*) in string values
                    has_wildcards = False
                    if isinstance(value, str) and "*" in value:
                        has_wildcards = True
                        # Convert * to SQL % wildcards
                        sql_pattern = value.replace("*", "%")
                    else:
                        sql_pattern = value

                    # Only convert to numeric if no wildcards (wildcards indicate string pattern matching)
                    if key in NUMERIC_FIELDS and not has_wildcards:
                        try:
                            sql_pattern = float(str(sql_pattern).strip())
                        except (ValueError, TypeError):
                            continue

                    if op == "=":
                        # If value has wildcards, use LIKE instead of exact match
                        if has_wildcards and isinstance(value, str):
                            # For numeric fields or fields that need string conversion for LIKE
                            if key in NUMERIC_FIELDS or key in STRING_LIKE_FIELDS:
                                where_clauses.append(f"toString({ch_field}) LIKE '{sql_pattern}'")
                            else:
                                where_clauses.append(f"{ch_field} LIKE '{sql_pattern}'")
                        else:
                            where_clauses.append(f"{ch_field} = {format_sql_value(sql_pattern)}")
                    elif op == ">":
                        where_clauses.append(f"{ch_field} > {format_sql_value(sql_pattern)}")
                    elif op == "<":
                        where_clauses.append(f"{ch_field} < {format_sql_value(sql_pattern)}")
                    elif op == "contains" and isinstance(value, str):
                        where_clauses.append(f"{ch_field} LIKE '%{sql_pattern}%'")

        where_sql = " AND ".join(where_clauses)

        # ---------- Execute SQL ----------
        sql = f"SELECT {ID_COLUMN}, {LON_COLUMN}, {LAT_COLUMN}, {HEADING_COLUMN}, {TIMESTAMP_COLUMN} FROM {table_name} WHERE {where_sql} ORDER BY {TIMESTAMP_COLUMN}, {ID_COLUMN}"
        logger.info(f"Executing minute query SQL: {sql}")
        
        result = await asyncio.get_event_loop().run_in_executor(None, client.query, sql)

        # ---------- Process Results ----------
        vessels: Dict[str, List[dict]] = {}
        timestamps: Set[str] = set()

        for row in result.result_rows:
            vessel_id, lon, lat, heading, ts_ms = row
            if not vessel_id:
                continue

            ts_dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
            ts_str = ts_dt.strftime("%Y-%m-%d %H:%M:%S")
            timestamps.add(ts_str)

            heading = heading or 0

            vessels.setdefault(str(vessel_id), []).append({
                "ts": ts_str,
                "lat": lat,
                "lon": lon,
                "heading": heading,
            })

        return {
            "minute_offset": payload.minute_offset,
            "minute_start": minute_start.isoformat(),
            "minute_end": minute_end.isoformat(),
            "timestamps": sorted(timestamps),
            "vessels": vessels
        }

    except Exception as e:
        logger.error(f"CRITICAL MINUTE PLAYBACK ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")