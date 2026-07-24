from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

NOTIF_DATA_COLLECTION = "notification_data"
USER_NOTIF_COLLECTION = "notifications"


class NotificationDataDocument:
    """Shared notification content stored once in notification_data collection."""

    def __init__(self, doc: dict[str, Any]) -> None:
        self.id: str = str(doc["_id"])
        self.topic: str = doc["topic"]
        self.group_id: str | None = doc.get("group_id")
        self.title: str = doc.get("title", "")
        self.body: str = doc["body"]
        self.data: dict[str, Any] = doc.get("data", {})
        self.channels_attempted: list[str] = doc.get("channels_attempted", [])
        self.channels_delivered: list[str] = doc.get("channels_delivered", [])
        self.source_system: str | None = doc.get("source_system")
        self.created_at = doc.get("created_at")
        self.updated_at = doc.get("updated_at")


class UserNotificationDocument:
    """Per-user notification record linking to shared notification_data."""

    def __init__(self, doc: dict[str, Any]) -> None:
        self.id: str = str(doc["_id"])
        self.notification_id: str = str(doc["notification_id"])
        self.username: str = doc["username"]
        self.created_at = doc.get("created_at")
        self.updated_at = doc.get("updated_at")


async def insert_notification_data(
    db: AsyncIOMotorDatabase, data: dict[str, Any]
) -> NotificationDataDocument:
    result = await db[NOTIF_DATA_COLLECTION].insert_one(data)
    doc = await db[NOTIF_DATA_COLLECTION].find_one({"_id": result.inserted_id})
    return NotificationDataDocument(doc)


async def insert_user_notifications(
    db: AsyncIOMotorDatabase,
    notification_id: str,
    usernames: list[str],
) -> list[UserNotificationDocument]:
    docs = [
        {
            "notification_id": ObjectId(notification_id),
            "username": username,
        }
        for username in usernames
    ]
    result = await db[USER_NOTIF_COLLECTION].insert_many(docs)
    created = []
    for inserted_id in result.inserted_ids:
        doc = await db[USER_NOTIF_COLLECTION].find_one({"_id": inserted_id})
        if doc:
            created.append(UserNotificationDocument(doc))
    return created


async def fetch_notification_data_by_id(
    db: AsyncIOMotorDatabase, notification_id: str
) -> NotificationDataDocument | None:
    try:
        oid = ObjectId(notification_id)
    except Exception:
        return None
    doc = await db[NOTIF_DATA_COLLECTION].find_one({"_id": oid})
    if doc is None:
        return None
    return NotificationDataDocument(doc)


async def fetch_user_notifications(
    db: AsyncIOMotorDatabase,
    username: str,
    skip: int = 0,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """
    Fetch notifications for a user by joining user_notifications with notification_data.
    Returns list of merged documents.
    """
    pipeline = [
        {"$match": {"username": username}},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$lookup": {
                "from": NOTIF_DATA_COLLECTION,
                "localField": "notification_id",
                "foreignField": "_id",
                "as": "data",
            }
        },
        {"$unwind": "$data"},
        {
            "$replaceRoot": {
                "newRoot": {
                    "$mergeObjects": [
                        "$data",
                        {"_id": "$_id", "username": "$username", "user_notif_id": "$_id"},
                    ]
                }
            }
        },
    ]
    return [doc async for doc in db[USER_NOTIF_COLLECTION].aggregate(pipeline)]


async def update_notification_delivery(
    db: AsyncIOMotorDatabase,
    notification_id: str,
    channels_attempted: list[str],
    channels_delivered: list[str],
) -> None:
    try:
        oid = ObjectId(notification_id)
    except Exception:
        return
    await db[NOTIF_DATA_COLLECTION].update_one(
        {"_id": oid},
        {
            "$set": {
                "channels_attempted": channels_attempted,
                "channels_delivered": channels_delivered,
            }
        },
    )
