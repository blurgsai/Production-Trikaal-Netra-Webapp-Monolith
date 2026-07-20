"""Events feature — Layer 3 (services).

Business logic and orchestration: parse progressive filters, discover schema,
build the Mongo query, fetch, and map to domain models. Independent of FastAPI
request/response objects; surfaces validation problems via shared error types.
"""
from __future__ import annotations

import json

from bson import ObjectId
from pydantic import ValidationError as PydanticValidationError

from src.features.events.clients import (
    EventFilter,
    aggregate_array_values,
    build_mongo_query,
    count_events,
    distinct_scalar_values,
    fetch_event_by_object_id,
    fetch_events,
    field_exists,
    get_collection_schema,
    is_array_type,
    is_supported_field,
)
from src.features.events.models import (
    EventListItem,
    EventListResponse,
    EventMetadataResponse,
    MetadataValueResponse,
    map_event_from_doc,
    map_metadata_columns,
)
from src.shared.errors import ValidationError


def _parse_filters(filters: str | None) -> list[EventFilter]:
    if not filters:
        return []
    try:
        raw = json.loads(filters)
        if not isinstance(raw, list):
            raise ValueError("filters must be a list")
        return [EventFilter.model_validate(item) for item in raw]
    except (json.JSONDecodeError, PydanticValidationError, ValueError, TypeError) as exc:
        raise ValidationError(f"Invalid filters: {exc}") from exc


async def get_event_list(
    db,
    *,
    limit: int,
    offset: int,
    filters: str | None = None,
    q: str | None = None,
    id: str | None = None,
) -> EventListResponse:
    # Direct-ID navigation bypasses the schema/filter machinery entirely.
    if id:
        if not ObjectId.is_valid(id):
            raise ValidationError(f"Invalid event ID format: {id}")
        doc = await fetch_event_by_object_id(db, id)
        if not doc:
            return EventListResponse(events=[], total=0, limit=limit, offset=offset)
        return EventListResponse(
            events=[map_event_from_doc(doc)], total=1, limit=limit, offset=offset
        )

    schema = await get_collection_schema(db)
    parsed = _parse_filters(filters)
    query = build_mongo_query(parsed, schema, q) if (parsed or q) else {}

    total = await count_events(db, query)
    if limit == 0:
        return EventListResponse(events=[], total=total, limit=limit, offset=offset)

    docs = await fetch_events(db, query, limit=limit, offset=offset)
    events: list[EventListItem] = [map_event_from_doc(doc) for doc in docs]
    return EventListResponse(events=events, total=total, limit=limit, offset=offset)


async def get_metadata(db) -> EventMetadataResponse:
    schema = await get_collection_schema(db)
    return EventMetadataResponse(columns=map_metadata_columns(schema))


async def get_field_values(db, field: str, limit: int | None) -> MetadataValueResponse:
    if not is_supported_field(field):
        raise ValidationError(f"Field '{field}' is not allowed")

    exists = await field_exists(db, field)
    schema = await get_collection_schema(db)
    field_type = schema.get(field)

    if not field_type:
        raise ValidationError(f"Field '{field}' not found in schema")
    if not exists:
        raise ValidationError(f"Field '{field}' not found")

    if is_array_type(field_type):
        values = await aggregate_array_values(db, field, limit)
    else:
        values = await distinct_scalar_values(db, field, limit)

    return MetadataValueResponse(field=field, values=values, count=len(values))
