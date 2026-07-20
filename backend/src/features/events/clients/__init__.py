"""Events feature — Layer 1 (clients).

Talks to the MongoDB `events` collection: dynamic schema discovery, progressive
filter -> Mongo query translation, and raw document fetches. Knows nothing about
FastAPI or the domain models. Returns raw Mongo documents / primitives only.

Ported from the legacy standalone routes/events.py, cleaned up for the monolith's
pure-async Motor driver (no PyMongo compatibility shims).
"""
from __future__ import annotations

import contextlib
import re
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from bson import ObjectId
from pydantic import BaseModel, model_validator

from src.shared.config import settings

EVENTS_COLLECTION = settings.EVENTS_COLLECTION

Operator = Literal[
    "eq", "ne", "gt", "gte", "lt", "lte",
    "between", "contains", "startsWith", "endsWith",
]

# Date/time precision detection for range-based equality on timestamp fields.
DATE_ONLY_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MINUTE_ONLY_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")


# ── Schema discovery ────────────────────────────────────────────────────────────

def is_supported_field(field: str) -> bool:
    """The nested `information` blob is event-type-specific and intentionally
    excluded from table schema/filtering."""
    return field != "information" and not field.startswith("information.")


def infer_scalar_type(value: Any) -> str:
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, datetime):
        return "timestamp"
    return "string"


def infer_list_type(values: list[Any]) -> str:
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
    """Collect a flat field -> type map from one document via iterative traversal."""
    schema: dict[str, str] = {}
    stack: list[tuple[Any, str]] = [(doc, "")]

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


async def get_collection_schema(db) -> dict[str, str]:
    """Full-scan schema discovery: merge the field->type map across every document.

    NOTE: intentionally scans the whole collection for behavioral parity with the
    legacy backend. Cost grows with collection size — a candidate for sampling/caching
    once seeded data volume is known.
    """
    collection = db.get_collection(EVENTS_COLLECTION)
    combined: dict[str, str] = {}
    async for doc in collection.find({}, {"_id": 0}):
        combined.update(collect_schema(doc))
    return combined


def is_array_type(field_type: str) -> bool:
    return field_type.endswith("[]")


# ── Filter model + query building ────────────────────────────────────────────────

class EventFilter(BaseModel):
    field: str
    operator: Operator
    value: Any
    value2: Any | None = None

    @model_validator(mode="after")
    def validate_values(self) -> EventFilter:
        if self.value is None:
            raise ValueError("value is required")
        if self.operator == "between" and self.value2 is None:
            raise ValueError("value2 is required for between operator")
        return self


def _to_datetime(value: Any) -> Any:
    """Coerce a timestamp value to a naive-UTC datetime for MongoDB comparison.

    Accepts ISO 8601 strings (primary) or millisecond integers (legacy). Returns the
    input unchanged if it cannot be interpreted as a timestamp.
    """
    if value is None or isinstance(value, datetime):
        if isinstance(value, datetime) and value.tzinfo:
            return value.astimezone(UTC).replace(tzinfo=None)
        return value

    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo:
                dt = dt.astimezone(UTC).replace(tzinfo=None)
            return dt
        except ValueError:
            pass

    try:
        return datetime.fromtimestamp(int(value) / 1000, tz=UTC).replace(tzinfo=None)
    except (ValueError, TypeError, OSError):
        return value


def get_time_window(raw_value: str, dt: datetime) -> tuple[datetime, datetime]:
    """Range boundaries for equality on a timestamp field, based on input precision."""
    if DATE_ONLY_PATTERN.match(raw_value):
        return dt, dt + timedelta(days=1)
    if MINUTE_ONLY_PATTERN.match(raw_value):
        return dt, dt + timedelta(minutes=1)
    # DateTimePicker emits e.g. 2024-12-04T10:35:00.000Z even when the user only
    # picked minute precision — treat a zero-seconds value as a whole-minute window.
    if isinstance(dt, datetime) and dt.second == 0 and dt.microsecond == 0:
        return dt, dt + timedelta(minutes=1)
    return dt, dt + timedelta(seconds=1)


def normalize_value_by_type(value: Any, field_type: str) -> Any:
    """Coerce an incoming filter value to the Python type implied by the schema."""
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
    """Case-insensitive regex condition for contains/startsWith/endsWith."""
    escaped = re.escape(str(value))
    if operator == "startsWith":
        pattern = f"^{escaped}"
    elif operator == "endsWith":
        pattern = f"{escaped}$"
    else:
        pattern = escaped
    return {field: {"$regex": pattern, "$options": "i"}}


def build_mongo_query(
    filters: list[EventFilter],
    schema: dict[str, str],
    search_query: str | None = None,
) -> dict:
    conditions: list[dict] = []

    for filter_item in filters:
        mongo_field = filter_item.field
        if not is_supported_field(mongo_field):
            continue
        field_type = schema.get(mongo_field)
        if not field_type:
            continue

        raw_value = filter_item.value
        value1 = normalize_value_by_type(filter_item.value, field_type)
        value2 = (
            normalize_value_by_type(filter_item.value2, field_type)
            if filter_item.value2 is not None
            else None
        )

        base_type = field_type[:-2] if field_type.endswith("[]") else field_type

        # Timestamp equality/inequality uses range matching based on input precision.
        if base_type == "timestamp":
            dt1 = _to_datetime(value1)
            if (
                filter_item.operator in {"eq", "ne"}
                and isinstance(raw_value, str)
                and isinstance(dt1, datetime)
            ):
                start, end = get_time_window(raw_value, dt1)
                if filter_item.operator == "eq":
                    conditions.append({mongo_field: {"$gte": start, "$lt": end}})
                else:
                    conditions.append(
                        {"$or": [{mongo_field: {"$lt": start}}, {mongo_field: {"$gte": end}}]}
                    )
                continue
            value1 = dt1
            if value2 is not None:
                value2 = _to_datetime(value2)

        # vessels_involved may be stored as int OR string — match either form.
        if mongo_field == "vessels_involved" and filter_item.operator in {"eq", "ne"}:
            try:
                int_val = int(str(value1).strip())
                both = [int_val, str(int_val)]
                key = "$in" if filter_item.operator == "eq" else "$nin"
                conditions.append({"vessels_involved": {key: both}})
                continue
            except (ValueError, TypeError):
                pass  # non-numeric vessel id — fall through to standard handling

        if filter_item.operator in SIMPLE_OPERATORS:
            conditions.append(SIMPLE_OPERATORS[filter_item.operator](mongo_field, value1, value2))
        elif filter_item.operator in {"contains", "startsWith", "endsWith"}:
            if field_type not in {"string", "string[]"}:
                continue
            conditions.append(build_text_condition(mongo_field, filter_item.operator, value1))
        else:
            raise ValueError(f"Unsupported operator: {filter_item.operator}")

    if search_query and search_query.strip():
        escaped_query = re.escape(search_query.strip())
        or_conditions: list[dict] = [
            {"event_id": {"$regex": escaped_query, "$options": "i"}},
            {"type": {"$regex": escaped_query, "$options": "i"}},
            {"severity": {"$regex": escaped_query, "$options": "i"}},
            {"status": {"$regex": escaped_query, "$options": "i"}},
            {"vessels_involved": search_query.strip()},
        ]
        with contextlib.suppress(ValueError):
            or_conditions.append({"vessels_involved": int(search_query.strip())})
        conditions.append({"$or": or_conditions})

    if not conditions:
        return {}
    return {"$and": conditions} if len(conditions) > 1 else conditions[0]


# ── Fetches ──────────────────────────────────────────────────────────────────────

async def count_events(db, query: dict) -> int:
    return await db.get_collection(EVENTS_COLLECTION).count_documents(query)


async def fetch_events(db, query: dict, *, limit: int, offset: int) -> list[dict]:
    """Fetch a page of events. Deterministic sort: timestamp desc, then _id asc."""
    cursor = (
        db.get_collection(EVENTS_COLLECTION)
        .find(query)
        .sort([("timestamp", -1), ("_id", 1)])
        .skip(offset)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def fetch_event_by_object_id(db, event_id: str) -> dict | None:
    """Fetch a single event by its Mongo _id. Returns None for a malformed id."""
    if not ObjectId.is_valid(event_id):
        return None
    return await db.get_collection(EVENTS_COLLECTION).find_one({"_id": ObjectId(event_id)})


async def field_exists(db, field: str) -> bool:
    doc = await db.get_collection(EVENTS_COLLECTION).find_one(
        {field: {"$exists": True}}, {"_id": 1}
    )
    return doc is not None


async def distinct_scalar_values(db, field: str, limit: int | None) -> list[str]:
    values = await db.get_collection(EVENTS_COLLECTION).distinct(field)
    result = [str(v) for v in values if v is not None and not isinstance(v, datetime)]
    return result[:limit] if limit is not None else result


async def aggregate_array_values(db, field: str, limit: int | None) -> list[str]:
    pipeline: list[dict] = [
        {"$unwind": f"${field}"},
        {"$group": {"_id": f"${field}"}},
        {"$sort": {"_id": 1}},
    ]
    if limit is not None:
        pipeline.append({"$limit": limit})

    values: list[str] = []
    async for doc in db.get_collection(EVENTS_COLLECTION).aggregate(pipeline):
        if doc.get("_id") is not None:
            values.append(str(doc["_id"]))
    return values
