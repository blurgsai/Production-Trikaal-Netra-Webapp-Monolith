from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

COLLECTION = "topic_configs"


class TopicConfigDocument:
    """Raw MongoDB document shape for a topic config."""

    def __init__(self, doc: dict[str, Any]) -> None:
        self.id: str = str(doc["_id"])
        self.topic: str = doc["topic"]
        self.channels: list[str] = doc.get("channels", [])
        self.email_template: str | None = doc.get("email_template")
        self.email_subject_template: str | None = doc.get("email_subject_template")
        self.metadata: dict[str, Any] = doc.get("metadata", {})
        self.storage_uri: str | None = doc.get("storage_uri")
        self.storage_db: str | None = doc.get("storage_db")
        self.storage_collection: str = doc.get("storage_collection", "notifications")
        self.smtp_host: str | None = doc.get("smtp_host")
        self.smtp_port: int | None = doc.get("smtp_port")
        self.smtp_user: str | None = doc.get("smtp_user")
        self.smtp_password: str | None = doc.get("smtp_password")
        self.smtp_from: str | None = doc.get("smtp_from")
        self.smtp_tls: bool | None = doc.get("smtp_tls")
        self.created_at = doc.get("created_at")
        self.updated_at = doc.get("updated_at")


async def fetch_topic_config(db: AsyncIOMotorDatabase, topic: str) -> TopicConfigDocument | None:
    doc = await db[COLLECTION].find_one({"topic": topic})
    if doc is None:
        return None
    return TopicConfigDocument(doc)


async def fetch_all_topic_configs(db: AsyncIOMotorDatabase) -> list[TopicConfigDocument]:
    cursor = db[COLLECTION].find({})
    return [TopicConfigDocument(doc) async for doc in cursor]


async def insert_topic_config(db: AsyncIOMotorDatabase, data: dict[str, Any]) -> TopicConfigDocument:
    result = await db[COLLECTION].insert_one(data)
    doc = await db[COLLECTION].find_one({"_id": result.inserted_id})
    return TopicConfigDocument(doc)


async def update_topic_config(
    db: AsyncIOMotorDatabase, topic: str, updates: dict[str, Any]
) -> TopicConfigDocument | None:
    await db[COLLECTION].update_one({"topic": topic}, {"$set": updates})
    return await fetch_topic_config(db, topic)


async def delete_topic_config(db: AsyncIOMotorDatabase, topic: str) -> bool:
    result = await db[COLLECTION].delete_one({"topic": topic})
    return result.deleted_count > 0
