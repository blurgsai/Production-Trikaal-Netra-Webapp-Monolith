"""
compound_events.py

Handles compound event configs and their dynamic instances.

A compound event config is created by the admin and stored in MongoDB.
It defines:
  - type            : display name  (e.g. "dark_ship_signal_lost")
  - constituent_types: list of atomic event types that must co-occur
  - start_time / end_time: the time window to search within

When a user opens a config, the backend computes instances on the fly.
An instance = one vessel that has overlapping events of ALL constituent types
within the config's time window. Nothing is stored — computed on demand.
"""

from fastapi import APIRouter, HTTPException, Query, Request, Depends
from datetime import datetime, timezone
from bson import ObjectId
from pydantic import BaseModel
import asyncio

from db import client
from utils.auth import get_current_user
from .events import (
    serialize_datetime,
    deep_serialize_datetimes,
    query_clickhouse,
    maybe_await,
    iter_cursor,
)

router = APIRouter(prefix="/api/compound-events", tags=["compound-events"])

MONGO_DB            = "dev"
COMPOUND_COLLECTION = "compound_events"
EVENTS_COLLECTION   = "events"
POLYGONS_COLLECTION = "polygons"

# Safety cap: max events fetched per constituent type
MAX_EVENTS_PER_TYPE = 500

# Sentinel used when an event has no end_time (treat as still ongoing)
FAR_FUTURE = datetime(9999, 12, 31, tzinfo=timezone.utc)

# Severity levels — dict gives O(1) rank lookup instead of O(n) list.index()
SEVERITY_RANK = {"info": 0, "low": 1, "warning": 2, "medium": 3, "high": 4, "critical": 5}

# AIS query buffer added around the event window (for trajectory context)
TRAJECTORY_BUFFER_MS = 3 * 60 * 60 * 1000  # 3 hours in milliseconds


# ── Simple helpers ─────────────────────────────────────────────────────────────

def to_utc(dt) -> datetime | None:
    """Normalise a datetime to UTC-aware. Returns None if input is None."""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    return None


def dt_to_ms(dt) -> int | None:
    """Convert a datetime to Unix milliseconds. Returns None if input is None."""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return int(dt.replace(tzinfo=timezone.utc).timestamp() * 1000)
    return None


def highest_severity(events: list[dict]) -> str:
    """Return the highest severity label found across a list of events."""
    return max(
        (ev.get("severity", "info") for ev in events),
        key=lambda s: SEVERITY_RANK.get(s, 0),
        default="info",
    )


def overlap_seconds(ev_a: dict, ev_b: dict) -> float:
    """
    Seconds that two events share in common (unclamped).
      positive → genuine shared window
      0        → point event sitting exactly on a boundary
      negative → events are completely separate
    """
    start_a = to_utc(ev_a.get("start_time"))
    start_b = to_utc(ev_b.get("start_time"))
    end_a   = to_utc(ev_a.get("end_time")) or FAR_FUTURE
    end_b   = to_utc(ev_b.get("end_time")) or FAR_FUTURE
    if start_a is None or start_b is None:
        return -1.0
    return (min(end_a, end_b) - max(start_a, start_b)).total_seconds()


# ── Serializers ────────────────────────────────────────────────────────────────

def serialize_config(doc: dict) -> dict:
    """Serialize a compound event config document for the /list response."""
    return {
        "id":               str(doc["_id"]),
        "type":             doc.get("type"),
        "constituent_types": doc.get("constituent_types", []),
        "description":      doc.get("description"),
        "severity":         doc.get("severity"),
        "start_time":       serialize_datetime(doc.get("start_time")),
        "end_time":         serialize_datetime(doc.get("end_time")),
        "timestamp":        serialize_datetime(doc.get("timestamp")),
        "compound":         True,
    }


def serialize_instance(
    events: list[dict],
    overlap_start: datetime,
    overlap_end: datetime | None,
    config_id: str,
    constituent_types: list[str],
    compound_type: str,
) -> dict:
    """
    Serialize one compound event instance.

    The virtual ID joins the ObjectIds of each constituent event with '__'.
    This ID is passed back to the /playback endpoint to reconstruct the instance.
    The overlap_start / overlap_end are the period where ALL events are simultaneously active.
    """
    virtual_id = "__".join(str(ev["_id"]) for ev in events)

    # Collect all unique vessel IDs across all constituent events.
    # Normalise to str — vessels_involved may contain integers.
    seen = set()
    all_vessels = []
    for ev in events:
        for vessel_id in ev.get("vessels_involved", []):
            vid = str(vessel_id)
            if vid not in seen:
                seen.add(vid)
                all_vessels.append(vid)

    # Don't expose FAR_FUTURE to the client — use None to mean "still ongoing"
    end_to_return = None if overlap_end == FAR_FUTURE else overlap_end

    return {
        "id":               virtual_id,
        "config_id":        config_id,
        "type":             compound_type,
        "constituent_types": constituent_types,
        "vessels_involved": all_vessels,
        "start_time":       serialize_datetime(overlap_start),
        "end_time":         serialize_datetime(end_to_return),
        "severity":         highest_severity(events),
        "compound":         True,
    }


# ── DB helpers ─────────────────────────────────────────────────────────────────

async def fetch_events_in_window(
    collection,
    event_type: str,
    window_start: datetime,
    window_end: datetime,
) -> list[dict]:
    """
    Fetch events of a given type whose start_time falls within [window_start, window_end].
    Returns at most MAX_EVENTS_PER_TYPE documents.
    """
    projection = {
        "_id": 1, "type": 1,
        "start_time": 1, "end_time": 1,
        "vessels_involved": 1, "severity": 1,
    }
    cursor = (
        collection
        .find(
            {"type": event_type, "start_time": {"$gte": window_start, "$lte": window_end}},
            projection,
        )
        .sort("start_time", 1)
        .limit(MAX_EVENTS_PER_TYPE)
    )
    return [doc async for doc in iter_cursor(cursor)]


async def enrich_geofence_polygon(event: dict) -> None:
    """For geofence_intrusion events, attach the polygon geometry from MongoDB."""
    if event.get("type") != "geofence_intrusion":
        return
    geofence_id = event.get("information", {}).get("geofence_id")
    if not geofence_id:
        return
    try:
        col = client[MONGO_DB][POLYGONS_COLLECTION]
        # geofence_id may be a plain string or an ObjectId string
        try:
            query_id = ObjectId(geofence_id)
        except Exception:
            query_id = geofence_id
        polygon = await maybe_await(col.find_one({"_id": query_id}))
        if polygon:
            polygon["_id"] = str(polygon["_id"])
            event["geofence_polygon"] = polygon
    except Exception:
        pass


# ── ClickHouse (AIS trajectories) ──────────────────────────────────────────────

async def fetch_trajectories(
    vessels: list[str],
    start_ms: int | None,
    end_ms: int | None,
    ch_client,
) -> dict:
    """
    Query ClickHouse for AIS position data for all vessels over the given time range.

    Returns a dict shaped as:
        { str(timestamp_ms): { str(vessel_id): { lat, lon, speed_mps, course, heading } } }
    """
    if not vessels or start_ms is None:
        return {}

    # Validate vessel IDs — must be integers (prevents SQL injection)
    vessel_ids = []
    for v in vessels:
        try:
            vessel_ids.append(int(v))
        except (ValueError, TypeError):
            continue
    if not vessel_ids:
        raise HTTPException(status_code=422, detail="No valid vessel IDs found")

    ids_str   = ",".join(map(str, vessel_ids))
    start_sec = start_ms // 1000
    end_clause = f"AND metadata_timestamp <= {end_ms // 1000}" if end_ms else ""

    sql = f"""
        SELECT
            metadata_timestamp AS timestamp,
            groupArray((toString(vessel_id), lat, lon,
                        processing_kinematics_speed_mps, course, heading)) AS vessel_data
        FROM integration_test.ais_processed_flat
        WHERE vessel_id IN ({ids_str})
          AND metadata_timestamp >= {start_sec}
          {end_clause}
          AND lat IS NOT NULL
          AND lon IS NOT NULL
        GROUP BY metadata_timestamp
        ORDER BY metadata_timestamp ASC
    """
    rows = await query_clickhouse(sql, ch_client)

    trajectories: dict = {}
    for row in rows:
        ts = str(row["timestamp"] * 1000)
        trajectories.setdefault(ts, {})
        for v_data in row["vessel_data"]:
            trajectories[ts][str(v_data[0])] = {
                "latitude":  v_data[1],
                "longitude": v_data[2],
                "speed_mps": v_data[3],
                "course":    v_data[4],
                "heading":   v_data[5],
            }
    return trajectories


# ── Admin: request body + auth ─────────────────────────────────────────────────

class CompoundConfigBody(BaseModel):
    type: str
    constituent_types: list[str]
    description: str | None = None
    severity: str = "medium"
    start_time: datetime
    end_time: datetime


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return current_user


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/event-types")
async def list_event_types():
    """Return distinct event types available in the events collection."""
    col = client[MONGO_DB][EVENTS_COLLECTION]
    types = await maybe_await(col.distinct("type"))
    return sorted(types)


@router.post("")
async def create_compound_config(
    body: CompoundConfigBody,
    _: dict = Depends(require_admin),
):
    """Create a new compound event config."""
    if len(body.constituent_types) < 2:
        raise HTTPException(status_code=422, detail="At least 2 constituent types required")
    if body.start_time >= body.end_time:
        raise HTTPException(status_code=422, detail="start_time must be before end_time")

    doc = body.model_dump()
    doc["timestamp"] = datetime.now(timezone.utc)

    col = client[MONGO_DB][COMPOUND_COLLECTION]
    result = await maybe_await(col.insert_one(doc))
    return {"id": str(result.inserted_id)}


@router.put("/{config_id}")
async def update_compound_config(
    config_id: str,
    body: CompoundConfigBody,
    _: dict = Depends(require_admin),
):
    """Update an existing compound event config."""
    try:
        oid = ObjectId(config_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid config ID")

    if len(body.constituent_types) < 2:
        raise HTTPException(status_code=422, detail="At least 2 constituent types required")
    if body.start_time >= body.end_time:
        raise HTTPException(status_code=422, detail="start_time must be before end_time")

    col = client[MONGO_DB][COMPOUND_COLLECTION]
    result = await maybe_await(col.update_one({"_id": oid}, {"$set": body.model_dump()}))
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Config not found")
    return {"ok": True}


@router.delete("/{config_id}")
async def delete_compound_config(
    config_id: str,
    _: dict = Depends(require_admin),
):
    """Delete a compound event config."""
    try:
        oid = ObjectId(config_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid config ID")

    col = client[MONGO_DB][COMPOUND_COLLECTION]
    result = await maybe_await(col.delete_one({"_id": oid}))
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Config not found")
    return {"ok": True}


@router.get("/list")
async def list_compound_configs(
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    q: str | None = Query(None),
):
    """Return a paginated list of compound event configs created by the admin."""
    col   = client[MONGO_DB][COMPOUND_COLLECTION]
    query = {"type": {"$regex": q, "$options": "i"}} if q else {}

    total  = await maybe_await(col.count_documents(query))
    cursor = col.find(query).skip(offset).limit(limit).sort([("timestamp", -1)])
    events = [serialize_config(doc) async for doc in iter_cursor(cursor)]

    return {"events": events, "total": total, "limit": limit, "offset": offset}


@router.get("/{config_id}/instances")
async def list_compound_instances(
    config_id: str,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    q: str | None = Query(None),
):
    """
    Compute compound event instances for a given config.

    How it works:
      1. Load the config — get constituent_types and the search time window.
      2. Fetch all events of each type that started within that time window.
      3. Group fetched events by vessel.
      4. A vessel "qualifies" if it has at least one event of EVERY constituent type.
      5. For each qualifying vessel, compute the overlap window:
            overlap_start = latest  start_time across all selected events
            overlap_end   = earliest end_time   across all selected events
         (This is the period when ALL event types are simultaneously active.)
      6. Each qualifying vessel = one compound event instance.
    """
    try:
        # ── Load config ────────────────────────────────────────────────────────
        compound_col = client[MONGO_DB][COMPOUND_COLLECTION]
        try:
            oid = ObjectId(config_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid config ID")

        config = await maybe_await(compound_col.find_one({"_id": oid}))
        if not config:
            raise HTTPException(status_code=404, detail="Config not found")

        constituent_types = config.get("constituent_types", [])
        if len(constituent_types) < 2:
            raise HTTPException(status_code=422, detail="Config must have at least 2 constituent_types")

        compound_type = config.get("type") or "+".join(constituent_types)

        window_start = to_utc(config.get("start_time"))
        window_end   = to_utc(config.get("end_time"))
        if window_start is None or window_end is None:
            raise HTTPException(status_code=422, detail="Config is missing start_time or end_time")

        # ── Fetch events for all types concurrently ────────────────────────────
        events_col = client[MONGO_DB][EVENTS_COLLECTION]
        results = await asyncio.gather(*[
            fetch_events_in_window(events_col, t, window_start, window_end)
            for t in constituent_types
        ])
        events_by_type = dict(zip(constituent_types, results))

        # ── Group events by vessel ─────────────────────────────────────────────
        # vessel_map shape: { vessel_id -> { event_type -> [event, ...] } }
        # Note: vessels_involved may contain integers — normalise to str for consistent keys.
        vessel_map: dict[str, dict[str, list]] = {}
        for ev_type, events in events_by_type.items():
            for ev in events:
                for vessel_id in ev.get("vessels_involved", []):
                    vessel_map.setdefault(str(vessel_id), {}).setdefault(ev_type, []).append(ev)

        # ── Build instances ────────────────────────────────────────────────────
        #
        # For each vessel that has events of every constituent type:
        #   Try each event of type[0] as an "anchor".
        #   For every other type, pick the event that overlaps best with the anchor.
        #   Keep the combination with the longest total shared overlap.
        #
        # Result: at most ONE instance per vessel (the best-overlapping combination).

        instances = []

        for vessel_id, type_map in vessel_map.items():

            # Vessel must have at least one event of every constituent type
            if not all(t in type_map for t in constituent_types):
                continue

            # Optional vessel-ID search filter
            if q and q.lower() not in vessel_id.lower():  # vessel_id is already str
                continue

            best_instance = None  # tracks (selected_events, overlap_start, overlap_end, duration)

            # Try every event of the first type as the anchor
            for anchor in type_map[constituent_types[0]]:
                selected = [anchor]
                valid = True

                for other_type in constituent_types[1:]:
                    # Score each candidate once, then pick the best.
                    # >= 0 includes point events (0 sec overlap = co-occurrence at a point in time).
                    scored = [
                        (overlap_seconds(anchor, ev), ev)
                        for ev in type_map[other_type]
                    ]
                    qualifying = [(score, ev) for score, ev in scored if score >= 0]

                    if not qualifying:
                        valid = False
                        break

                    _, best_ev = max(qualifying, key=lambda x: x[0])
                    selected.append(best_ev)

                if not valid:
                    continue

                # Compound window = period when ALL selected events are simultaneously active
                #   overlap_start = latest  start (all events have started by this point)
                #   overlap_end   = earliest end  (the first event to finish)
                overlap_start = max(to_utc(ev["start_time"]) for ev in selected if ev.get("start_time"))
                overlap_end   = min(to_utc(ev.get("end_time")) or FAR_FUTURE for ev in selected)
                total_duration = (overlap_end - overlap_start).total_seconds()

                # Only keep this combo if all N events actually share a common window.
                # A negative duration means some events don't overlap each other even
                # though each individually overlapped with the anchor — discard it.
                if total_duration >= 0 and (best_instance is None or total_duration > best_instance[3]):
                    best_instance = (selected, overlap_start, overlap_end, total_duration)

            if best_instance is None:
                continue

            selected, overlap_start, overlap_end, _ = best_instance
            instances.append(serialize_instance(
                events            = selected,
                overlap_start     = overlap_start,
                overlap_end       = overlap_end,
                config_id         = config_id,
                constituent_types = constituent_types,
                compound_type     = compound_type,
            ))

        # Sort newest-first by overlap start time
        instances.sort(key=lambda x: x.get("start_time") or "", reverse=True)

        total = len(instances)
        page  = instances[offset: offset + limit]

        return {"instances": page, "total": total, "limit": limit, "offset": offset}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/playback")
async def get_compound_playback(
    id: str = Query(..., description="Virtual compound ID: eventId1__eventId2[__eventId3...]"),
    request: Request = None,
) -> dict:
    """
    Build the playback response for a compound event instance.

    The virtual ID is the '__'-joined ObjectIds of the constituent atomic events,
    produced by the /instances endpoint. It is never stored in MongoDB.

    Steps:
      1. Split the virtual ID to get each constituent event's ObjectId.
      2. Fetch each atomic event from events.
      3. Compute the merged time window (earliest start → latest end + buffer).
      4. Fetch AIS trajectories from ClickHouse for all vessels involved.
    """
    try:
        # ── Parse virtual ID ───────────────────────────────────────────────────
        parts = [p.strip() for p in id.split("__") if p.strip()]
        if len(parts) < 2:
            raise HTTPException(status_code=400, detail=f"Invalid compound ID format: '{id}'")

        # ── Fetch each constituent atomic event ────────────────────────────────
        events_col = client[MONGO_DB][EVENTS_COLLECTION]
        raw_events: list[dict] = []
        constituent_events: dict[str, dict] = {}

        for eid in parts:
            try:
                oid = ObjectId(eid)
            except Exception:
                raise HTTPException(status_code=422, detail=f"Invalid event ID: {eid}")

            ev = await maybe_await(events_col.find_one({"_id": oid}))
            if not ev:
                raise HTTPException(status_code=404, detail=f"Event {eid} not found")

            ev["_id"] = str(ev["_id"])
            await enrich_geofence_polygon(ev)
            raw_events.append(ev)

            # Use each event's type as the key in constituent_events.
            # If two events share the same type, append the event ID suffix to keep them distinct.
            ev_type = ev.get("type", f"unknown_{eid[:6]}")
            if ev_type in constituent_events:
                ev_type = f"{ev_type}_{eid[:6]}"
            constituent_events[ev_type] = deep_serialize_datetimes(ev)

        # ── Compute time window ────────────────────────────────────────────────
        # Display window: earliest start → latest end across all constituent events
        starts = [to_utc(ev.get("start_time")) for ev in raw_events if ev.get("start_time")]
        ends   = [to_utc(ev.get("end_time"))   for ev in raw_events if ev.get("end_time")]

        event_start = min(starts) if starts else None
        # Only set end_time if ALL events have one (otherwise compound is still ongoing)
        event_end   = max(ends) if ends and len(ends) == len(raw_events) else None

        event_start_ms = dt_to_ms(event_start)
        event_end_ms   = dt_to_ms(event_end)

        # AIS query window includes a 3-hour buffer on each side for context
        query_start_ms = (event_start_ms - TRAJECTORY_BUFFER_MS) if event_start_ms else None
        query_end_ms   = (event_end_ms   + TRAJECTORY_BUFFER_MS) if event_end_ms   else None

        # ── Fetch AIS trajectories ─────────────────────────────────────────────
        all_vessels = list({str(v) for ev in raw_events for v in ev.get("vessels_involved", [])})

        ch_client = getattr(request.app.state, "clickhouse_client", None)
        if ch_client is None:
            raise HTTPException(status_code=500, detail="ClickHouse client not initialized")

        trajectories = await fetch_trajectories(all_vessels, query_start_ms, query_end_ms, ch_client)

        # ── Assemble and return response ───────────────────────────────────────
        constituent_types = [ev.get("type", "unknown") for ev in raw_events]
        compound_type     = "+".join(dict.fromkeys(constituent_types))  # deduplicated, order-preserving
        location          = next((ev.get("location") for ev in raw_events if ev.get("location")), None)

        return {
            "event_details": {
                "_id":               id,
                "type":              compound_type,
                "compound":          True,
                "constituent_types": constituent_types,
                "constituent_events": constituent_events,
                "vessels_involved":  all_vessels,
                "start_time":        serialize_datetime(event_start),
                "end_time":          serialize_datetime(event_end),
                "severity":          highest_severity(raw_events),
                "location":          location,
            },
            "trajectories": trajectories,
            "time_window": {
                "query_start":  query_start_ms,
                "query_end":    query_end_ms,
                "event_start":  event_start_ms,
                "event_end":    event_end_ms,
                "buffer_hours": 3,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
