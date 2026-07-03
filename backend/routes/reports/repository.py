import asyncio
import json
import httpx
import logging
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from bson import ObjectId

from .constants import (
    EVENT_LABEL_MAP      as _LABEL_MAP,
    EVENT_SEVERITY_FALLBACK as _SEVERITY_MAP,
)

# How often the on-demand vessel position sync may run.
# Prevents N concurrent AOI-based requests from all issuing update_many simultaneously.
_VESSEL_SYNC_TTL_SECS = 60

logger = logging.getLogger(__name__)

# ClickHouse connection — read from environment (same source as the rest of the app).
_CH_HOST     = os.getenv("CLICKHOUSE_HOST", "34.14.212.228")
_CH_PORT     = os.getenv("CLICKHOUSE_PORT", "8123")
_CH_URL      = f"http://{_CH_HOST}:{_CH_PORT}"
_CH_USER     = os.getenv("CLICKHOUSE_USER", "default")
_CH_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "")


class _JSONEncoder(json.JSONEncoder):
    """Handles ObjectId and datetime JSON serialization."""
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


class ReportRepository:
    def __init__(self, db: Any):
        self.db = db

        # Shared persistent HTTP client for all ClickHouse calls.
        # Created once per singleton instance (see router.py @lru_cache).
        # Eliminates per-query TCP connection setup/teardown overhead.
        # Call _http.aclose() at application shutdown (see main.py lifespan).
        self._http: httpx.AsyncClient = httpx.AsyncClient(
            auth=(_CH_USER, _CH_PASSWORD),
            timeout=30.0,
        )

        # Limits total concurrent ClickHouse queries across all simultaneous
        # report requests.  Each _build_profile issues one query, so an AOI
        # report with 50 vessels would otherwise fire 50 at once.
        self._ch_semaphore: asyncio.Semaphore = asyncio.Semaphore(10)

        # Rate-limits the vessel position sync inside get_vessel_ids_in_aoi.
        # asyncio.Lock() is loop-agnostic from Python 3.10+; safe to create in __init__.
        self._vessel_sync_lock: asyncio.Lock  = asyncio.Lock()
        self._vessel_last_sync: Optional[datetime] = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _sync_vessel_geojson(self, col) -> None:
        """
        Rate-limited sync of location.geojson from location.current.lon/lat.

        Runs at most once per _VESSEL_SYNC_TTL_SECS seconds so that concurrent
        AOI-based report requests don't all fire competing update_many calls
        against vessel_state.  The double-checked locking pattern ensures only
        one coroutine actually performs the write even under high concurrency.

        Failures are non-fatal — the $geoWithin query still runs against
        whatever location.geojson was written by the last successful sync or
        by the migration script (sync_vessel_geojson.py).
        """
        now = datetime.utcnow()
        # Fast path: skip acquiring lock if TTL has not expired
        if (
            self._vessel_last_sync is not None
            and (now - self._vessel_last_sync).total_seconds() < _VESSEL_SYNC_TTL_SECS
        ):
            return

        async with self._vessel_sync_lock:
            # Re-check inside lock — another coroutine may have just synced
            if (
                self._vessel_last_sync is not None
                and (now - self._vessel_last_sync).total_seconds() < _VESSEL_SYNC_TTL_SECS
            ):
                return
            try:
                await col.update_many(
                    {
                        "location.current.lon": {"$type": "double"},
                        "location.current.lat": {"$type": "double"},
                    },
                    [
                        {
                            "$set": {
                                "location.geojson": {
                                    "type": "Point",
                                    "coordinates": [
                                        "$location.current.lon",
                                        "$location.current.lat",
                                    ],
                                }
                            }
                        }
                    ],
                )
                self._vessel_last_sync = datetime.utcnow()
                logger.debug("[ReportRepository] vessel location.geojson sync completed")
            except Exception as exc:
                logger.warning(
                    "[ReportRepository] location.geojson sync failed — "
                    "spatial query may use stale positions: %s", exc,
                )

    def _sanitize_ids(self, vessel_ids: List[str]) -> List[Any]:
        """Return both int and string variants of each ID for flexible querying."""
        if not vessel_ids:
            return []
        result = []
        for vid in vessel_ids:
            try:
                result.append(int(vid))
            except ValueError:
                pass
            result.append(vid)
        return result

    async def _drain_cursor(self, cursor) -> list:
        """Drain a MongoDB cursor (sync or async motor) into a plain list."""
        docs = []
        if hasattr(cursor, "__aiter__"):
            async for doc in cursor:
                docs.append(doc)
        else:
            for doc in cursor:
                docs.append(doc)
        return docs

    def _serialize(self, docs):
        """
        Recursively normalize MongoDB-specific types to JSON-safe Python primitives.

        Replaces the previous json.dumps+json.loads round-trip which allocated a
        full JSON string for every report.  For large track reports (50 vessels ×
        many events) the savings are measurable.

        Handled types:
          ObjectId  → str
          datetime  → ISO-8601 str
          dict      → dict (keys and values recursively normalized)
          list      → list (items recursively normalized)
          Everything else passes through unchanged (int, float, str, None, bool).
        """
        if isinstance(docs, dict):
            # Unwrap BSON extended JSON numeric types (e.g. NumberLong stored as {"$numberLong": "..."})
            if "$numberLong" in docs:
                return int(docs["$numberLong"])
            if "$numberInt" in docs:
                return int(docs["$numberInt"])
            if "$numberDouble" in docs:
                return float(docs["$numberDouble"])
            return {k: self._serialize(v) for k, v in docs.items()}
        if isinstance(docs, list):
            return [self._serialize(v) for v in docs]
        if isinstance(docs, ObjectId):
            return str(docs)
        if isinstance(docs, datetime):
            return docs.isoformat()
        return docs

    # ------------------------------------------------------------------
    # MongoDB — vessel state
    # ------------------------------------------------------------------

    async def get_tracks_for_vessels(
        self,
        vessel_ids: List[str] = None,
        start_time: datetime = None,
        end_time: datetime = None,
        aoi: Dict[str, Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch vessel identity and current-state documents from vessel_state.

        Intentionally does NOT filter by time range here — vessel_state only
        stores the *current* position (location.current.timestamp = today).
        Filtering by location.current.timestamp against a historical window
        would return zero results for any non-live report.

        Time-bounded data comes from ClickHouse via get_trajectory_points(),
        which applies the start_time/end_time filter on metadata_timestamp.
        start_time and end_time are accepted but unused — kept in the
        signature so callers don't need to know this distinction.
        """
        query_ids  = self._sanitize_ids(vessel_ids)
        collection = self.db.get_database("integration_test").get_collection("vessel_state")

        query: Dict[str, Any] = {}
        if query_ids:
            query["vesselId"] = {"$in": query_ids}

        try:
            raw_docs = await self._drain_cursor(collection.find(query))
            return self._serialize(raw_docs)
        except Exception as e:
            logger.error("[ReportRepository] Failed to fetch vessel tracks: %s", e, exc_info=True)
            raise

    async def get_vessel_ids_in_aoi(
        self,
        aoi: Dict[str, Any],
        limit: int = 50,
    ) -> List[str]:
        """
        Return vessel IDs (as strings) for vessels whose current position
        falls inside the given AOI polygon.

        Flow:
          1. Sync location.geojson from location.current via an aggregation
             pipeline update_many so positions are fresh for this request.
             Failures here are non-fatal — the query still runs against
             whatever location.geojson exists from the last sync.
          2. Query vessel_state with $geoWithin on location.geojson using
             the 2dsphere index created by sync_vessel_geojson.py / startup.
          3. Return at most `limit` vessel IDs as strings (ClickHouse expects
             strings; _sanitize_ids handles both int+str for MongoDB).

        Prerequisites:
          - Run sync_vessel_geojson.py once to backfill existing documents.
          - 2dsphere index on location.geojson (ensured at app startup).
        """
        col          = self.db.get_database("integration_test").get_collection("vessel_state")
        polygon_geom = self._aoi_to_polygon_geom(aoi)

        await self._sync_vessel_geojson(col)

        # ── Spatial query ─────────────────────────────────────────────────────
        try:
            docs = await self._drain_cursor(
                col.find(
                    {"location.geojson": {"$geoWithin": {"$geometry": polygon_geom}}},
                    {"vesselId": 1, "_id": 0},
                ).limit(limit)
            )
        except Exception as exc:
            logger.error("[ReportRepository] AOI vessel query failed: %s", exc, exc_info=True)
            raise

        return [str(doc["vesselId"]) for doc in docs if doc.get("vesselId") is not None]

    # ------------------------------------------------------------------
    # MongoDB — events
    # ------------------------------------------------------------------

    async def get_events_for_vessels(
        self,
        vessel_ids: List[str] = None,
        start_time: datetime = None,
        end_time: datetime = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch events from MongoDB where any vessel_id is in vessels_involved.
        Time fields in the events collection store native MongoDB Date objects,
        so we pass datetime objects directly (no int conversion).
        """
        if not vessel_ids:
            return []

        collection = self.db.get_database("dev").get_collection("events")
        query_ids = self._sanitize_ids(vessel_ids)
        query: Dict[str, Any] = {"vessels_involved": {"$in": query_ids}}

        time_query: Dict[str, Any] = {}
        if start_time:
            time_query["$gte"] = start_time
        if end_time:
            time_query["$lte"] = end_time
        if time_query:
            query["start_time"] = time_query

        try:
            raw_docs = await self._drain_cursor(
                collection.find(query).sort([("start_time", -1)]).limit(500)
            )
            return self._serialize(raw_docs)
        except Exception as e:
            logger.error("[ReportRepository] Failed to fetch vessel events: %s", e, exc_info=True)
            raise

    # ------------------------------------------------------------------
    # ClickHouse — trajectory
    # ------------------------------------------------------------------

    async def get_trajectory_points(
        self,
        vessel_id: str,
        start_time: datetime = None,
        end_time: datetime = None,
    ) -> List[Tuple[float, float, int]]:
        """
        Fetch chronological (lon, lat, unix_timestamp) tuples for a vessel.

        Returning the timestamp enables callers to slice event windows
        client-side from a single query, avoiding N+1 ClickHouse round-trips.
        Uses parameterised queries to prevent SQL injection.
        """
        if not vessel_id:
            return []

        url_params: Dict[str, Any] = {
            "default_format": "JSONEachRow",
            "param_vid": vessel_id,
        }

        query = """
            SELECT lon, lat, metadata_timestamp
            FROM integration_test.ais_processed_flat
            WHERE vessel_id = {vid:String}
              AND lat IS NOT NULL
              AND lon IS NOT NULL
        """

        if start_time:
            query += "  AND metadata_timestamp >= {ts_start:Int64}\n"
            url_params["param_ts_start"] = int(start_time.timestamp())

        if end_time:
            query += "  AND metadata_timestamp <= {ts_end:Int64}\n"
            url_params["param_ts_end"] = int(end_time.timestamp())

        query += "ORDER BY metadata_timestamp ASC"

        points: List[Tuple[float, float, int]] = []
        try:
            async with self._ch_semaphore:
                response = await self._http.post(
                    _CH_URL + "/",
                    params=url_params,
                    content=query.encode(),
                    timeout=10.0,
                )
            response.raise_for_status()

            if not response.text.strip():
                return []

            for line in response.text.strip().split("\n"):
                if line.strip():
                    row = json.loads(line)
                    lon = row.get("lon")
                    lat = row.get("lat")
                    ts  = row.get("metadata_timestamp")
                    if lon is not None and lat is not None and ts is not None:
                        points.append((float(lon), float(lat), int(ts)))

        except Exception as e:
            logger.error(
                "[ReportRepository] Failed to fetch ClickHouse trajectory for vessel %s: %s",
                vessel_id, e, exc_info=True,
            )
            raise

        return points

    # ------------------------------------------------------------------
    # ClickHouse — AOI speed profiles (Phase 2 of Generic Report)
    # ------------------------------------------------------------------

    @staticmethod
    def _aoi_bbox(aoi: Dict[str, Any]) -> Tuple[float, float, float, float]:
        """Return (min_lon, min_lat, max_lon, max_lat) from any GeoJSON geometry."""
        geom_type = aoi.get("type", "")
        if geom_type == "Feature":
            return ReportRepository._aoi_bbox(aoi["geometry"])
        if geom_type == "Polygon":
            coords = aoi["coordinates"][0]
        elif geom_type == "MultiPolygon":
            coords = [pt for poly in aoi["coordinates"] for pt in poly[0]]
        else:
            coords = aoi.get("coordinates", [[]])[0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        return min(lons), min(lats), max(lons), max(lats)

    async def get_speed_profiles_in_aoi(
        self,
        aoi: Dict[str, Any],
        start_time: datetime,
        end_time: datetime,
    ) -> Dict[str, Any]:
        """
        Aggregate AIS speed data for every vessel observed inside the AOI
        bounding box within the requested time window.

        Returns a dict ready for the speed_profiles report section:
          total_vessels         — distinct vessel count
          total_observations    — total AIS rows matched
          overall_avg_speed_kn  — fleet-wide average speed in knots
          vessel_table          — list of per-vessel stats (top 100 by activity)
          distribution          — list of {speed_bucket_kn, count} for bar chart
        """
        min_lon, min_lat, max_lon, max_lat = self._aoi_bbox(aoi)
        ts_start = int(start_time.timestamp())
        ts_end   = int(end_time.timestamp())

        base_where = """
            lat  BETWEEN {min_lat:Float64}  AND {max_lat:Float64}
            AND lon  BETWEEN {min_lon:Float64}  AND {max_lon:Float64}
            AND metadata_timestamp BETWEEN {ts_start:Int64} AND {ts_end:Int64}
            AND lat  IS NOT NULL
            AND lon  IS NOT NULL
            AND processing_kinematics_speed_mps IS NOT NULL
            AND processing_kinematics_speed_mps >= 0
        """

        shared_params = {
            "default_format": "JSONEachRow",
            "param_min_lat":  min_lat,
            "param_max_lat":  max_lat,
            "param_min_lon":  min_lon,
            "param_max_lon":  max_lon,
            "param_ts_start": ts_start,
            "param_ts_end":   ts_end,
        }

        # --- Query 1: per-vessel aggregation ---
        vessel_query = f"""
            SELECT
                toString(vessel_id) AS metadata_mmsi,
                round(avg(processing_kinematics_speed_mps) * 1.94384, 2) AS avg_speed_kn,
                round(max(processing_kinematics_speed_mps) * 1.94384, 2) AS max_speed_kn,
                round(min(processing_kinematics_speed_mps) * 1.94384, 2) AS min_speed_kn,
                count() AS observations
            FROM integration_test.ais_processed_flat
            WHERE {base_where}
            GROUP BY vessel_id
            ORDER BY observations DESC
            LIMIT 100
        """

        # --- Query 2: speed distribution (2-knot buckets) ---
        dist_query = f"""
            SELECT
                floor(processing_kinematics_speed_mps * 1.94384 / 2) * 2 AS speed_bucket_kn,
                count() AS count
            FROM integration_test.ais_processed_flat
            WHERE {base_where}
            GROUP BY speed_bucket_kn
            ORDER BY speed_bucket_kn ASC
        """

        vessel_table: List[Dict[str, Any]] = []
        distribution: List[Dict[str, Any]] = []

        try:
            async with self._ch_semaphore:
                r1, r2 = await asyncio.gather(
                    self._http.post(
                        _CH_URL + "/",
                        params=shared_params,
                        content=vessel_query.encode(),
                        timeout=30.0,
                    ),
                    self._http.post(
                        _CH_URL + "/",
                        params=shared_params,
                        content=dist_query.encode(),
                        timeout=30.0,
                    ),
                )
                r1.raise_for_status()
                r2.raise_for_status()

                for line in r1.text.strip().split("\n"):
                    if line.strip():
                        vessel_table.append(json.loads(line))

                for line in r2.text.strip().split("\n"):
                    if line.strip():
                        row = json.loads(line)
                        distribution.append({
                            "speed_bucket_kn": float(row.get("speed_bucket_kn", 0)),
                            "count": int(row.get("count", 0)),
                        })

        except Exception as exc:
            logger.error(
                "[ReportRepository] Speed profiles query failed: %s", exc, exc_info=True
            )
            return {}

        if not vessel_table and not distribution:
            return {}

        total_obs = sum(int(v.get("observations", 0)) for v in vessel_table)
        overall_avg = (
            round(
                sum(float(v.get("avg_speed_kn", 0)) * int(v.get("observations", 0))
                    for v in vessel_table)
                / total_obs,
                2,
            )
            if total_obs > 0
            else 0.0
        )

        return {
            "total_vessels":        len(vessel_table),
            "total_observations":   total_obs,
            "overall_avg_speed_kn": overall_avg,
            "vessel_table":         vessel_table,
            "distribution":         distribution,
        }

    # ------------------------------------------------------------------
    # ClickHouse — AOI speed grid (for speed zone heatmap)
    # ------------------------------------------------------------------

    async def get_speed_grid_in_aoi(
        self,
        aoi: Dict[str, Any],
        start_time: datetime,
        end_time: datetime,
        grid_deg: float = 0.05,
    ) -> List[Dict[str, Any]]:
        """
        Aggregate AIS data into a spatial grid of average speed values.

        Each returned cell represents a ~(grid_deg°)² area within the AOI
        bounding box and carries the mean vessel speed observed there, plus
        the raw observation count used to scale marker size on the map.

        Uses the *same* fields as get_speed_profiles_in_aoi:
          lat, lon, metadata_timestamp, processing_kinematics_speed_mps
        — no new ClickHouse columns required.

        Returns:
          List of {"lat": float, "lon": float, "avg_speed_kn": float, "count": int}
          Empty list on failure (non-fatal — map section is omitted gracefully).
        """
        min_lon, min_lat, max_lon, max_lat = self._aoi_bbox(aoi)
        ts_start = int(start_time.timestamp())
        ts_end   = int(end_time.timestamp())

        query = """
            SELECT
                round(lat  / {gd:Float64}) * {gd:Float64} AS lat_cell,
                round(lon  / {gd:Float64}) * {gd:Float64} AS lon_cell,
                round(avg(processing_kinematics_speed_mps) * 1.94384, 2) AS avg_speed_kn,
                count() AS count
            FROM integration_test.ais_processed_flat
            WHERE lat  BETWEEN {min_lat:Float64}  AND {max_lat:Float64}
              AND lon  BETWEEN {min_lon:Float64}  AND {max_lon:Float64}
              AND metadata_timestamp BETWEEN {ts_start:Int64} AND {ts_end:Int64}
              AND lat  IS NOT NULL
              AND lon  IS NOT NULL
              AND processing_kinematics_speed_mps IS NOT NULL
              AND processing_kinematics_speed_mps >= 0
            GROUP BY lat_cell, lon_cell
            ORDER BY count DESC
            LIMIT 3000
        """
        params = {
            "default_format": "JSONEachRow",
            "param_gd":       grid_deg,
            "param_min_lat":  min_lat,
            "param_max_lat":  max_lat,
            "param_min_lon":  min_lon,
            "param_max_lon":  max_lon,
            "param_ts_start": ts_start,
            "param_ts_end":   ts_end,
        }

        cells: List[Dict[str, Any]] = []
        try:
            async with self._ch_semaphore:
                response = await self._http.post(
                    _CH_URL + "/",
                    params=params,
                    content=query.encode(),
                    timeout=30.0,
                )
            response.raise_for_status()
            for line in response.text.strip().split("\n"):
                if line.strip():
                    row = json.loads(line)
                    lat = row.get("lat_cell")
                    lon = row.get("lon_cell")
                    spd = row.get("avg_speed_kn")
                    cnt = row.get("count")
                    if lat is not None and lon is not None and spd is not None:
                        cells.append({
                            "lat":          float(lat),
                            "lon":          float(lon),
                            "avg_speed_kn": float(spd),
                            "count":        int(cnt) if cnt is not None else 1,
                        })
        except Exception as exc:
            logger.error(
                "[ReportRepository] Speed grid query failed (non-fatal): %s", exc, exc_info=True
            )
            return []

        return cells

    # ------------------------------------------------------------------
    # MongoDB — AOI event clusters (Phase 3 of Generic Report)
    # ------------------------------------------------------------------

    @staticmethod
    def _aoi_to_polygon_geom(aoi: Dict[str, Any]) -> Dict[str, Any]:
        """Unwrap a GeoJSON Feature/Polygon/MultiPolygon into a bare geometry dict."""
        if aoi.get("type") == "Feature":
            return aoi["geometry"]
        return aoi  # already Polygon or MultiPolygon

    @staticmethod
    def _fmt_duration_ms(ms) -> str:
        """Convert milliseconds to a human-readable duration string."""
        if ms is None:
            return "—"
        if isinstance(ms, dict):
            ms = ms.get("$numberLong") or ms.get("$numberInt") or ms.get("$numberDouble") or 0
        total_s = int(ms) // 1000
        m, s = divmod(total_s, 60)
        h, m = divmod(m, 60)
        if h:
            return f"{h}h {m}m" if m else f"{h}h"
        if m:
            return f"{m}m"
        return f"{s}s"

    async def get_event_clusters_in_aoi(
        self,
        aoi: Dict[str, Any],
        start_time: datetime,
        end_time: datetime,
    ) -> Dict[str, Any]:
        """
        Fetch events from MongoDB `dev.events` that fall within the drawn AOI
        polygon and the requested time window.

        Schema notes (from actual collection):
          - `type`              string  — event type (not `event_type`)
          - `severity`          string  — "high" | "warning" | "info"
          - `start_time`        Date    — MongoDB native Date
          - `duration`          int     — milliseconds
          - `location`          GeoJSON Point {type, coordinates: [lon, lat]}
          - `vessels_involved`  [str]   — list of vessel ID strings
          - `information`       dict    — event-specific payload

        Spatial filtering uses MongoDB's native $geoWithin + $geometry
        (no 2dsphere index required, though one would speed things up).

        Returns:
          total_events    — count of matched events
          severity_counts — {"high": n, "warning": n, "info": n}
          type_summary    — per-event-type list sorted by count desc
          recent_events   — up to 30 latest events with human-readable fields
        """
        collection = self.db.get_database("dev").get_collection("events")
        polygon_geom = self._aoi_to_polygon_geom(aoi)

        mongo_query: Dict[str, Any] = {
            "start_time": {"$gte": start_time, "$lte": end_time},
            "location": {
                "$geoWithin": {
                    "$geometry": polygon_geom,
                }
            },
        }

        try:
            raw_docs = await self._drain_cursor(
                collection.find(mongo_query).sort([("start_time", -1)]).limit(2000)
            )
        except Exception as e:
            logger.error("[ReportRepository] Event cluster fetch failed: %s", e, exc_info=True)
            return {}

        if not raw_docs:
            return {}

        # Aggregate by type and severity
        type_counts: Dict[str, int] = {}
        severity_counts: Dict[str, int] = {"high": 0, "warning": 0, "info": 0}

        for doc in raw_docs:
            ev_type = doc.get("type", "unknown")
            sev = doc.get("severity") or _SEVERITY_MAP.get(ev_type, "info")
            type_counts[ev_type] = type_counts.get(ev_type, 0) + 1
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        total_events = len(raw_docs)
        type_summary = [
            {
                "event_type": ev_type,
                "label":    _LABEL_MAP.get(ev_type, ev_type.replace("_", " ").title()),
                "severity": _SEVERITY_MAP.get(ev_type, "info"),
                "count":    count,
                "pct":      round(count / total_events * 100) if total_events else 0,
            }
            for ev_type, count in sorted(type_counts.items(), key=lambda x: -x[1])
        ]

        # Recent events — already sorted newest-first by cursor sort
        recent_events: List[Dict[str, Any]] = []
        for doc in raw_docs[:30]:
            ev_type = doc.get("type", "unknown")
            sev = doc.get("severity") or _SEVERITY_MAP.get(ev_type, "info")

            vessels = doc.get("vessels_involved", [])
            vessel_str = ", ".join(str(v) for v in vessels[:3])
            if len(vessels) > 3:
                vessel_str += f" +{len(vessels) - 3}"

            start_ts = doc.get("start_time")
            if isinstance(start_ts, datetime):
                ts_str = start_ts.strftime("%Y-%m-%d %H:%M")
            elif isinstance(start_ts, (int, float)):
                ts_str = datetime.fromtimestamp(start_ts).strftime("%Y-%m-%d %H:%M")
            else:
                ts_str = str(start_ts) if start_ts else "N/A"

            recent_events.append({
                "event_type": ev_type,
                "label":      _LABEL_MAP.get(ev_type, ev_type.replace("_", " ").title()),
                "severity":   sev,
                "timestamp":  ts_str,
                "vessels":    vessel_str or "—",
                "duration":   self._fmt_duration_ms(doc.get("duration")),
            })

        # Event locations for the combined heatmap — cap at 500 for performance.
        # Also group by event type for per-type spatial maps.
        # coordinates from MongoDB GeoJSON are [lon, lat].
        event_locations: List[Dict[str, Any]] = []
        event_locations_by_type: Dict[str, List[Dict[str, Any]]] = {}

        for doc in raw_docs[:500]:
            coords = (doc.get("location") or {}).get("coordinates") or []
            if len(coords) == 2:
                ev_type = doc.get("type", "unknown")
                sev = doc.get("severity") or _SEVERITY_MAP.get(ev_type, "info")
                point = {
                    "lat": float(coords[1]),
                    "lon": float(coords[0]),
                    "severity": sev,
                }
                event_locations.append(point)
                if ev_type not in event_locations_by_type:
                    event_locations_by_type[ev_type] = []
                event_locations_by_type[ev_type].append(point)

        return {
            "total_events":            total_events,
            "severity_counts":         severity_counts,
            "type_summary":            type_summary,
            "recent_events":           recent_events,
            "event_locations":         event_locations,
            "event_locations_by_type": event_locations_by_type,
        }

    # ------------------------------------------------------------------
    # MongoDB — Insight Report snapshot
    # ------------------------------------------------------------------

    async def _get_vessel_state_intelligence(
        self, event_vessel_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Aggregate fleet-health indicators from integration_test.vessel_state.

        Runs concurrently:
          - nav_status_breakdown  — group-by status.navStatusParsed
          - flag_distribution     — top-5 flag states by vessel count
          - suspicious_count      — vessels flagged status.suspicious
          - spoofing_count        — vessels with spoof.status == True
          - high_risk_vessels     — vessels that appear in recent events
                                    AND are currently marked suspicious
                                    (cross-source join)

        Returns {} on any failure so the report section is silently omitted.
        """
        vessel_col = self.db.get_database("integration_test").get_collection("vessel_state")

        nav_pipeline = [
            {"$group": {"_id": "$status.navStatusParsed", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        flag_pipeline = [
            {"$group": {"_id": "$identification.flag", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 7},
        ]

        try:
            nav_docs, flag_docs, suspicious_count, spoofing_count = await asyncio.gather(
                self._drain_cursor(vessel_col.aggregate(nav_pipeline)),
                self._drain_cursor(vessel_col.aggregate(flag_pipeline)),
                vessel_col.count_documents({"status.suspicious": True}),
                vessel_col.count_documents({"spoof.status": True}),
            )
        except Exception as exc:
            logger.warning("[ReportRepository] vessel_state intelligence failed: %s", exc)
            return {}

        nav_status_breakdown = [
            {
                "status": (doc.get("_id") or "Unknown").strip() or "Unknown",
                "count":  int(doc["count"]),
            }
            for doc in nav_docs
            if doc.get("count", 0) > 0
        ]

        flag_distribution = [
            {
                "flag":  (doc.get("_id") or "Unknown").strip() or "Unknown",
                "count": int(doc["count"]),
            }
            for doc in flag_docs
            if doc.get("count", 0) > 0 and doc.get("_id")
        ]

        # Cross-source: vessels in recent events that are also currently suspicious
        high_risk_vessels: List[Dict[str, Any]] = []
        if event_vessel_ids:
            sanitized = self._sanitize_ids(event_vessel_ids[:50])
            try:
                hr_docs = await self._drain_cursor(
                    vessel_col.find(
                        {"vesselId": {"$in": sanitized}, "status.suspicious": True},
                        {"vesselId": 1, "identification": 1, "_id": 0},
                    ).limit(10)
                )
                for doc in hr_docs:
                    ident = doc.get("identification") or {}
                    high_risk_vessels.append({
                        "vessel_id": str(doc.get("vesselId", "—")),
                        "name":      ident.get("shipName") or "Unknown Vessel",
                        "mmsi":      str(ident.get("mmsi", "—")),
                        "flag":      ident.get("flag") or "—",
                    })
            except Exception as exc:
                logger.warning("[ReportRepository] High-risk vessel lookup failed: %s", exc)

        return {
            "nav_status_breakdown": nav_status_breakdown,
            "suspicious_count":     int(suspicious_count),
            "spoofing_count":       int(spoofing_count),
            "flag_distribution":    flag_distribution,
            "high_risk_vessels":    high_risk_vessels,
        }

    async def _get_fleet_speed_snapshot(self) -> Dict[str, Any]:
        """
        Fleet-wide speed distribution from ClickHouse for the last 2 hours.

        Buckets speed into 2-knot bands and also returns the fleet average.
        Returns {} on any failure — the report section is silently omitted.
        """
        now      = datetime.utcnow()
        ts_end   = int(now.timestamp())
        ts_start = ts_end - 7200  # 2 hours

        dist_sql = (
            "SELECT toInt32(floor(processing_kinematics_speed_mps * 1.94384 / 2) * 2)"
            " AS speed_bucket_kn, count() AS cnt"
            " FROM integration_test.ais_processed_flat"
            " WHERE metadata_timestamp BETWEEN {ts_start:Int64} AND {ts_end:Int64}"
            "   AND processing_kinematics_speed_mps IS NOT NULL"
            "   AND processing_kinematics_speed_mps >= 0"
            " GROUP BY speed_bucket_kn ORDER BY speed_bucket_kn ASC"
            " FORMAT JSONEachRow"
        )
        summary_sql = (
            "SELECT count(DISTINCT vessel_id) AS unique_vessels,"
            " round(avg(processing_kinematics_speed_mps) * 1.94384, 2) AS avg_speed_kn"
            " FROM integration_test.ais_processed_flat"
            " WHERE metadata_timestamp BETWEEN {ts_start:Int64} AND {ts_end:Int64}"
            "   AND processing_kinematics_speed_mps IS NOT NULL"
            "   AND processing_kinematics_speed_mps >= 0"
            " FORMAT JSONEachRow"
        )
        params = {"param_ts_start": ts_start, "param_ts_end": ts_end}

        try:
            async with self._ch_semaphore:
                r1, r2 = await asyncio.gather(
                    self._http.post(
                        _CH_URL + "/",
                        params=params, content=dist_sql.encode(), timeout=15.0,
                    ),
                    self._http.post(
                        _CH_URL + "/",
                        params=params, content=summary_sql.encode(), timeout=15.0,
                    ),
                )
            r1.raise_for_status()
            r2.raise_for_status()

            distribution: List[Dict[str, Any]] = []
            for line in r1.text.strip().split("\n"):
                if line.strip():
                    row = json.loads(line)
                    distribution.append({
                        "speed_bucket_kn": int(row.get("speed_bucket_kn", 0)),
                        "count":           int(row.get("cnt", 0)),
                    })

            summary_row: Dict[str, Any] = {}
            for line in r2.text.strip().split("\n"):
                if line.strip():
                    summary_row = json.loads(line)
                    break

            if not distribution and not summary_row:
                return {}

            return {
                "unique_vessels": int(summary_row.get("unique_vessels", 0)),
                "avg_speed_kn":   float(summary_row.get("avg_speed_kn", 0)),
                "distribution":   distribution,
                "window_hours":   2,
            }
        except Exception as exc:
            logger.warning(
                "[ReportRepository] Fleet speed snapshot failed (non-critical): %s", exc
            )
            return {}

    async def get_insight_data(self, limit: int = 50) -> Dict[str, Any]:
        """
        Fetch a comprehensive point-in-time snapshot for the Insight Report.

        Phase 1 (concurrent)  — vessel count + latest `limit` events.
        Derived (no extra DB) — active events, repeat offenders, event velocity,
                                duration analysis, critical event list.
        Phase 2 (concurrent)  — vessel_state intelligence + ClickHouse fleet speed.

        Returns a flat dict consumed by InsightReport.generate().
        """
        _EMPTY_RESPONSE: Dict[str, Any] = {
            "total_vessels":         0,
            "total_events":          0,
            "severity_counts":       {"high": 0, "warning": 0, "info": 0},
            "type_summary":          [],
            "recent_events":         [],
            "event_locations":       [],
            "active_events":         [],
            "active_events_count":   0,
            "critical_events":       [],
            "repeat_offenders":      [],
            "event_velocity":        None,
            "event_time_span_hours": None,
            "duration_stats":        [],
            "vessel_intel":          {},
            "fleet_speed":           {},
        }

        vessel_col = self.db.get_database("integration_test").get_collection("vessel_state")
        events_col = self.db.get_database("dev").get_collection("events")

        # ── Phase 1: base queries ────────────────────────────────────────────
        # open_events_count queries the FULL collection — not bounded by `limit` —
        # so the KPI card shows the true fleet-wide count.
        # An event is "open" when its end_time field is null or missing, meaning
        # the situation is still ongoing regardless of what the status field says.
        try:
            total_vessels, open_events_count, raw_docs = await asyncio.gather(
                vessel_col.count_documents({}),
                events_col.count_documents({"end_time": None}),
                self._drain_cursor(
                    events_col.find({}).sort([("start_time", -1)]).limit(limit)
                ),
            )
        except Exception as e:
            logger.error("[ReportRepository] Insight data fetch failed: %s", e, exc_info=True)
            raise

        if not raw_docs:
            result = dict(_EMPTY_RESPONSE)
            result["total_vessels"]       = total_vessels
            result["active_events_count"] = open_events_count
            return result

        # ── Derived from fetched events (zero extra DB calls) ────────────────
        type_counts:     Dict[str, int]  = {}
        severity_counts: Dict[str, int]  = {"high": 0, "warning": 0, "info": 0}
        duration_by_type: Dict[str, Dict] = {}
        vessel_counter:  Dict[str, int]  = {}
        event_vessel_ids: List[str]      = []
        active_events_raw: List[Dict]    = []

        for doc in raw_docs:
            ev_type = doc.get("type", "unknown")
            sev     = doc.get("severity") or _SEVERITY_MAP.get(ev_type, "info")
            status  = doc.get("status", "")

            type_counts[ev_type]          = type_counts.get(ev_type, 0) + 1
            severity_counts[sev]          = severity_counts.get(sev, 0) + 1

            # Collect sample of open events from the fetched window for the detail list.
            # end_time being None/missing means the event is still ongoing.
            if doc.get("end_time") is None:
                active_events_raw.append(doc)

            for v in doc.get("vessels_involved", []):
                vid = str(v)
                vessel_counter[vid] = vessel_counter.get(vid, 0) + 1
                if vid not in event_vessel_ids:
                    event_vessel_ids.append(vid)

            dur = doc.get("duration")
            if isinstance(dur, dict):
                dur = dur.get("$numberLong") or dur.get("$numberInt") or dur.get("$numberDouble")
            if dur is not None:
                if ev_type not in duration_by_type:
                    duration_by_type[ev_type] = {"total": 0, "count": 0, "max": 0}
                d = int(dur)
                duration_by_type[ev_type]["total"] += d
                duration_by_type[ev_type]["count"] += 1
                duration_by_type[ev_type]["max"]    = max(duration_by_type[ev_type]["max"], d)

        total_events = len(raw_docs)
        type_summary = [
            {
                "event_type": ev_type,
                "label":    _LABEL_MAP.get(ev_type, ev_type.replace("_", " ").title()),
                "severity": _SEVERITY_MAP.get(ev_type, "info"),
                "count":    count,
                "pct":      round(count / total_events * 100) if total_events else 0,
            }
            for ev_type, count in sorted(type_counts.items(), key=lambda x: -x[1])
        ]

        def _fmt_ev(doc: Dict[str, Any]) -> Dict[str, Any]:
            ev_type = doc.get("type", "unknown")
            sev     = doc.get("severity") or _SEVERITY_MAP.get(ev_type, "info")
            vessels = doc.get("vessels_involved", [])
            v_str   = ", ".join(str(v) for v in vessels[:3])
            if len(vessels) > 3:
                v_str += f" +{len(vessels) - 3}"
            start_ts = doc.get("start_time")
            if isinstance(start_ts, datetime):
                ts_str = start_ts.strftime("%Y-%m-%d %H:%M")
            elif isinstance(start_ts, (int, float)):
                ts_str = datetime.fromtimestamp(start_ts).strftime("%Y-%m-%d %H:%M")
            else:
                ts_str = str(start_ts) if start_ts else "N/A"
            return {
                "event_type": ev_type,
                "label":      _LABEL_MAP.get(ev_type, ev_type.replace("_", " ").title()),
                "severity":   sev,
                "timestamp":  ts_str,
                "vessels":    v_str or "—",
                "duration":   self._fmt_duration_ms(doc.get("duration")),
                "status":     doc.get("status", "—"),
            }

        recent_events  = [_fmt_ev(d) for d in raw_docs[:30]]
        active_events  = [_fmt_ev(d) for d in active_events_raw[:10]]
        critical_events = [_fmt_ev(d) for d in raw_docs if d.get("severity") == "high"][:5]

        repeat_offenders = [
            {"vessel_id": vid, "event_count": cnt}
            for vid, cnt in sorted(vessel_counter.items(), key=lambda x: -x[1])
            if cnt > 1
        ][:5]

        # Event velocity — events per hour across the sampled window
        event_velocity:        Any = None
        event_time_span_hours: Any = None
        if len(raw_docs) >= 2:
            ts_oldest = raw_docs[-1].get("start_time")
            ts_newest = raw_docs[0].get("start_time")
            if isinstance(ts_oldest, datetime) and isinstance(ts_newest, datetime):
                span_h = (ts_newest - ts_oldest).total_seconds() / 3600
                if span_h > 0:
                    event_velocity        = round(total_events / span_h, 2)
                    event_time_span_hours = round(span_h, 1)

        duration_stats = [
            {
                "event_type":   ev_type,
                "label":        _LABEL_MAP.get(ev_type, ev_type.replace("_", " ").title()),
                "avg_duration": self._fmt_duration_ms(stats["total"] // stats["count"]),
                "max_duration": self._fmt_duration_ms(stats["max"]),
                "count":        stats["count"],
            }
            for ev_type, stats in sorted(
                duration_by_type.items(),
                key=lambda x: -(x[1]["total"] // x[1]["count"]),
            )
            if stats["count"] > 0
        ]

        event_locations: List[Dict[str, Any]] = []
        for doc in raw_docs:
            coords = (doc.get("location") or {}).get("coordinates") or []
            if len(coords) == 2:
                sev = doc.get("severity") or _SEVERITY_MAP.get(doc.get("type", ""), "info")
                event_locations.append({
                    "lat": float(coords[1]),
                    "lon": float(coords[0]),
                    "severity": sev,
                })

        # ── Phase 2: vessel intelligence + fleet speed (concurrent) ─────────
        vessel_intel, fleet_speed = await asyncio.gather(
            self._get_vessel_state_intelligence(event_vessel_ids),
            self._get_fleet_speed_snapshot(),
        )

        return self._serialize({
            "total_vessels":         total_vessels,
            "total_events":          total_events,
            "severity_counts":       severity_counts,
            "type_summary":          type_summary,
            "recent_events":         recent_events,
            "event_locations":       event_locations,
            "active_events":         active_events,
            "active_events_count":   open_events_count,  # real full-collection count
            "critical_events":       critical_events,
            "repeat_offenders":      repeat_offenders,
            "event_velocity":        event_velocity,
            "event_time_span_hours": event_time_span_hours,
            "duration_stats":        duration_stats,
            "vessel_intel":          vessel_intel,
            "fleet_speed":           fleet_speed,
        })
