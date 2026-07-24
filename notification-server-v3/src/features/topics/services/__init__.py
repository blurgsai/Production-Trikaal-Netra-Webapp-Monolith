from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from features.topics.clients import (
    delete_topic_config,
    fetch_all_topic_configs,
    fetch_topic_config,
    insert_topic_config,
    update_topic_config,
)
from features.topics.models import (
    CreateTopicConfigRequest,
    TopicConfig,
    UpdateTopicConfigRequest,
    map_topic_config,
)
from shared.errors import ConflictError, NotFoundError


async def get_topic_config(db: AsyncIOMotorDatabase, topic: str) -> TopicConfig:
    doc = await fetch_topic_config(db, topic)
    if doc is None:
        raise NotFoundError("TopicConfig", topic)
    return map_topic_config(doc)


async def list_topic_configs(db: AsyncIOMotorDatabase) -> list[TopicConfig]:
    docs = await fetch_all_topic_configs(db)
    return [map_topic_config(d) for d in docs]


async def create_topic_config(db: AsyncIOMotorDatabase, req: CreateTopicConfigRequest) -> TopicConfig:
    existing = await fetch_topic_config(db, req.topic)
    if existing is not None:
        raise ConflictError("TopicConfig", req.topic)

    now = datetime.now(timezone.utc)
    data = req.model_dump()
    data["channels"] = [c.value for c in req.channels]
    data["created_at"] = now
    data["updated_at"] = now

    doc = await insert_topic_config(db, data)
    return map_topic_config(doc)


async def update_topic_config_service(
    db: AsyncIOMotorDatabase, topic: str, req: UpdateTopicConfigRequest
) -> TopicConfig:
    existing = await fetch_topic_config(db, topic)
    if existing is None:
        raise NotFoundError("TopicConfig", topic)

    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if req.channels is not None:
        updates["channels"] = [c.value for c in req.channels]
    if req.email_template is not None:
        updates["email_template"] = req.email_template
    if req.email_subject_template is not None:
        updates["email_subject_template"] = req.email_subject_template
    if req.metadata is not None:
        updates["metadata"] = req.metadata
    if req.storage_uri is not None:
        updates["storage_uri"] = req.storage_uri
    if req.storage_db is not None:
        updates["storage_db"] = req.storage_db
    if req.storage_collection is not None:
        updates["storage_collection"] = req.storage_collection
    if req.smtp_host is not None:
        updates["smtp_host"] = req.smtp_host
    if req.smtp_port is not None:
        updates["smtp_port"] = req.smtp_port
    if req.smtp_user is not None:
        updates["smtp_user"] = req.smtp_user
    if req.smtp_password is not None:
        updates["smtp_password"] = req.smtp_password
    if req.smtp_from is not None:
        updates["smtp_from"] = req.smtp_from
    if req.smtp_tls is not None:
        updates["smtp_tls"] = req.smtp_tls

    doc = await update_topic_config(db, topic, updates)
    return map_topic_config(doc)


async def delete_topic_config_service(db: AsyncIOMotorDatabase, topic: str) -> None:
    ok = await delete_topic_config(db, topic)
    if not ok:
        raise NotFoundError("TopicConfig", topic)
