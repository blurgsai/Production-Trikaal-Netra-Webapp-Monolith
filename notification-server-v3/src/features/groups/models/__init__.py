from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from features.groups.clients import GroupDocument


class Group(BaseModel):
    id: str
    group_id: str
    usernames: list[str]
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UpsertGroupRequest(BaseModel):
    group_id: str = Field(..., pattern=r"^[a-z0-9_.\-]+$")
    usernames: list[str] = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class MembersRequest(BaseModel):
    usernames: list[str] = Field(..., min_length=1)


def map_group(doc: GroupDocument) -> Group:
    return Group(
        id=doc.id,
        group_id=doc.group_id,
        usernames=doc.usernames,
        metadata=doc.metadata,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
