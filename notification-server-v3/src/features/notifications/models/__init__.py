from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

class Notification(BaseModel):
    id: str
    topic: str
    username: str
    group_id: str | None = None
    title: str
    body: str
    data: dict[str, Any] = Field(default_factory=dict)
    channels_attempted: list[str] = Field(default_factory=list)
    channels_delivered: list[str] = Field(default_factory=list)
    source_system: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SendNotificationRequest(BaseModel):
    """
    Open-ended schema: any producer can attach arbitrary key-value pairs
    under `data`. The core fields (topic, body, targets) stay typed.
    """

    topic: str = Field(..., description="Must match a registered TopicConfig topic")
    usernames: list[str] | None = Field(
        default=None, description="Direct delivery to specific usernames"
    )
    group_id: str | None = Field(
        default=None, description="Deliver to all members of a group"
    )
    title: str = ""
    body: str = Field(..., min_length=1)
    data: dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary producer-defined payload — no schema enforced",
    )
    source_system: str | None = Field(
        default=None, description="Identifier of the calling system"
    )


class DeliveryResult(BaseModel):
    notification_id: str
    topic: str
    channels_attempted: list[str]
    channels_delivered: list[str]
    ws_delivered_to: list[str]
    ws_published: bool = False
    email_sent_to: list[str]


def map_notification(doc: dict[str, Any]) -> Notification:
    """Map a joined document (from aggregation pipeline) to Notification model."""
    return Notification(
        id=str(doc.get("user_notif_id", doc.get("_id", ""))),
        topic=doc["topic"],
        username=doc.get("username", ""),
        group_id=doc.get("group_id"),
        title=doc.get("title", ""),
        body=doc["body"],
        data=doc.get("data", {}),
        channels_attempted=doc.get("channels_attempted", []),
        channels_delivered=doc.get("channels_delivered", []),
        source_system=doc.get("source_system"),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )
