"""Datetime (de)serialization helpers shared across features.

MongoDB stores datetimes as naive UTC. FastAPI serializes naive datetimes
without a timezone suffix, which JavaScript then mis-parses as local time.
These helpers force a 'Z' suffix on the way out and normalize timezone-aware
values on the way in. Both the events and compound_events features depend on
identical behavior, so it lives here rather than inside either feature.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


def serialize_datetime(value: Any) -> str | None:
    """Serialize a naive-UTC datetime to an ISO 8601 string with a 'Z' suffix.

    Non-datetime values pass through unchanged (already a string, or None).
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        millis = value.microsecond // 1000
        return value.strftime("%Y-%m-%dT%H:%M:%S.") + f"{millis:03d}Z"
    return value


def deep_serialize_datetimes(obj: Any) -> Any:
    """Recursively replace every datetime in a dict/list with a 'Z'-suffixed string."""
    if isinstance(obj, datetime):
        return serialize_datetime(obj)
    if isinstance(obj, dict):
        return {key: deep_serialize_datetimes(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [deep_serialize_datetimes(item) for item in obj]
    return obj


def parse_iso_datetime(value: Any) -> datetime | None:
    """Parse an ISO 8601 string (or pass through a datetime) to a UTC-aware datetime."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    return None


def to_utc(value: Any) -> datetime | None:
    """Normalize a datetime to UTC-aware. Naive datetimes are assumed to be UTC."""
    if isinstance(value, datetime):
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value
    return None


def dt_to_ms(value: Any) -> int | None:
    """Convert a datetime to Unix milliseconds (treating naive datetimes as UTC)."""
    dt = to_utc(value)
    if dt is None:
        return None
    return int(dt.timestamp() * 1000)
