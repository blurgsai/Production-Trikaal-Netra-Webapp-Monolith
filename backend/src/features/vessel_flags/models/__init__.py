from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field

VALID_FLAGS = ["safe", "unsafe", "suspicious", "neutral", "unknown"]


class VesselFlagCreateRequest(BaseModel):
    vessel_id: str
    flag: str = Field(..., description="One of: safe, unsafe, suspicious, neutral, unknown")
    comment: str = Field(default="", description="Optional user comment")


class VesselFlagResponse(BaseModel):
    id: str
    vessel_id: str
    user_id: str
    flag: str
    comment: str
    created_at: str


class VesselFlagListResponse(BaseModel):
    success: bool = True
    data: list[VesselFlagResponse]
    total: int


def map_flag_from_doc(doc: dict[str, Any]) -> dict[str, Any]:
    created = doc.get("created_at")
    if isinstance(created, datetime):
        created_iso = created.isoformat()
    else:
        created_iso = str(created) if created else datetime.now(UTC).isoformat()

    return {
        "id": str(doc["_id"]),
        "vessel_id": doc.get("vessel_id", ""),
        "user_id": str(doc.get("user_id", "")),
        "flag": doc.get("flag", "unknown"),
        "comment": doc.get("comment", ""),
        "created_at": created_iso,
    }
