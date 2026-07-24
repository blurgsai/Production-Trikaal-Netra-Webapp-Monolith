from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Channel(str, Enum):
    websocket = "websocket"
    email = "email"


class TopicConfig(BaseModel):
    id: str
    topic: str
    channels: list[Channel]
    email_template: str | None = None
    email_subject_template: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    storage_uri: str | None = Field(default=None, description="Override MongoDB connection string for this topic's notifications")
    storage_db: str | None = Field(default=None, description="Override MongoDB database name for this topic's notifications")
    storage_collection: str = Field(default="notifications", description="Collection name for this topic's notifications")
    smtp_host: str | None = Field(default=None, description="Override SMTP host for this topic")
    smtp_port: int | None = Field(default=None, description="Override SMTP port for this topic")
    smtp_user: str | None = Field(default=None, description="Override SMTP username/login for this topic")
    smtp_password: str | None = Field(default=None, description="Override SMTP password for this topic")
    smtp_from: str | None = Field(default=None, description="Override From address for this topic")
    smtp_tls: bool | None = Field(default=None, description="Override SMTP TLS setting for this topic")
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CreateTopicConfigRequest(BaseModel):
    topic: str = Field(..., pattern=r"^[a-z0-9_.\-]+$", description="Snake-case topic identifier")
    channels: list[Channel] = Field(..., min_length=1)
    email_template: str | None = None
    email_subject_template: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    storage_uri: str | None = Field(default=None, description="Override MongoDB connection string for this topic")
    storage_db: str | None = Field(default=None, description="Override MongoDB database name for this topic")
    storage_collection: str = Field(default="notifications", description="Collection name for this topic's notifications")
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_tls: bool | None = None


class UpdateTopicConfigRequest(BaseModel):
    channels: list[Channel] | None = None
    email_template: str | None = None
    email_subject_template: str | None = None
    metadata: dict[str, Any] | None = None
    storage_uri: str | None = None
    storage_db: str | None = None
    storage_collection: str | None = None
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_tls: bool | None = None


from features.topics.clients import TopicConfigDocument


def map_topic_config(doc: TopicConfigDocument) -> TopicConfig:
    return TopicConfig(
        id=doc.id,
        topic=doc.topic,
        channels=[Channel(c) for c in doc.channels],
        email_template=doc.email_template,
        email_subject_template=doc.email_subject_template,
        metadata=doc.metadata,
        storage_uri=doc.storage_uri,
        storage_db=doc.storage_db,
        storage_collection=doc.storage_collection,
        smtp_host=doc.smtp_host,
        smtp_port=doc.smtp_port,
        smtp_user=doc.smtp_user,
        smtp_password=doc.smtp_password,
        smtp_from=doc.smtp_from,
        smtp_tls=doc.smtp_tls,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
