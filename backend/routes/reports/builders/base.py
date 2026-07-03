"""
builders/base.py — Shared building blocks for all report builders.

Every report inherits BaseReport and implements generate().
Helpers here are used by all report builders.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def fmt_ts(ts) -> str:
    """Safely convert any timestamp/string/dict to a readable string."""
    if not ts:
        return "N/A"
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(ts, datetime):
        return ts.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(ts, dict) and "$date" in ts:
        return ts["$date"]
    return str(ts)


def parse_dt(val) -> datetime | None:
    """Parse any date representation into a native datetime, or None."""
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, (int, float)):
        if val > 1e11:
            val /= 1000.0
        return datetime.fromtimestamp(val)
    if isinstance(val, dict) and "$date" in val:
        val = val["$date"]
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def get_dim(dims: dict, key: str):
    """Extract lastObservedValue from a nested dimension dict."""
    entry = dims.get(key) or {}
    return entry.get("lastObservedValue", "N/A")


def safe_int(val) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def fmt_event_info(info: dict) -> str:
    if not info or not isinstance(info, dict):
        return ""
    return "  |  ".join(
        f"{k.replace('_', ' ').title()}: {round(v, 4) if isinstance(v, float) else v}"
        for k, v in info.items()
    )


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class BaseReport(ABC):
    """
    Contract: subclasses must define TEMPLATE_KEY and implement generate().

    generate() must return a standard dict:
    {
        "report_key":   str,   # matches a key in renderers._TEMPLATE_MAP
        "report_type":  str,   # human-readable display name
        "generated_at": str,
        "metadata":     dict,
        "data":         list
    }
    """
    TEMPLATE_KEY: str  # each subclass declares which Jinja2 template to use

    def __init__(self, repo):
        self.repo = repo

    @abstractmethod
    async def generate(self) -> Dict[str, Any]:
        ...

    def _envelope(self, report_type: str, data: list, **meta) -> Dict[str, Any]:
        now = datetime.now()
        return {
            "report_key":   self.TEMPLATE_KEY,
            "report_type":  report_type,
            "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
            "metadata":     meta,
            "data":         data,
        }
