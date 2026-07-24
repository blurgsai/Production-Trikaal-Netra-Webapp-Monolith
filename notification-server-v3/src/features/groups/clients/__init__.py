from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

COLLECTION = "groups"


class GroupDocument:
    def __init__(self, doc: dict[str, Any]) -> None:
        self.id: str = str(doc["_id"])
        self.group_id: str = doc["group_id"]
        self.usernames: list[str] = doc.get("usernames", [])
        self.metadata: dict[str, Any] = doc.get("metadata", {})
        self.created_at = doc.get("created_at")
        self.updated_at = doc.get("updated_at")


async def fetch_group(db: AsyncIOMotorDatabase, group_id: str) -> GroupDocument | None:
    doc = await db[COLLECTION].find_one({"group_id": group_id})
    return GroupDocument(doc) if doc else None


async def fetch_all_groups(db: AsyncIOMotorDatabase) -> list[GroupDocument]:
    return [GroupDocument(doc) async for doc in db[COLLECTION].find({})]


async def upsert_group(db: AsyncIOMotorDatabase, data: dict[str, Any]) -> GroupDocument:
    await db[COLLECTION].update_one(
        {"group_id": data["group_id"]},
        {"$set": data},
        upsert=True,
    )
    doc = await db[COLLECTION].find_one({"group_id": data["group_id"]})
    return GroupDocument(doc)


async def add_members_to_group(
    db: AsyncIOMotorDatabase, group_id: str, usernames: list[str]
) -> GroupDocument | None:
    await db[COLLECTION].update_one(
        {"group_id": group_id},
        {"$addToSet": {"usernames": {"$each": usernames}}},
    )
    return await fetch_group(db, group_id)


async def remove_members_from_group(
    db: AsyncIOMotorDatabase, group_id: str, usernames: list[str]
) -> GroupDocument | None:
    await db[COLLECTION].update_one(
        {"group_id": group_id},
        {"$pull": {"usernames": {"$in": usernames}}},
    )
    return await fetch_group(db, group_id)


async def delete_group(db: AsyncIOMotorDatabase, group_id: str) -> bool:
    result = await db[COLLECTION].delete_one({"group_id": group_id})
    return result.deleted_count > 0
