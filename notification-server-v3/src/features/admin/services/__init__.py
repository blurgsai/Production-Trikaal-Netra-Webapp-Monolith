from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_known_users(db: AsyncIOMotorDatabase) -> list[dict[str, Any]]:
    """
    Read registered users from the users collection and enrich with
    notification stats from the normalized schema.
    """
    pipeline = [
        {
            "$group": {
                "_id": "$username",
                "total_notifications": {"$sum": 1},
                "last_notification": {"$max": "$created_at"},
            }
        },
    ]
    stats_map: dict[str, Any] = {}
    async for doc in db["notifications"].aggregate(pipeline):
        stats_map[doc["_id"]] = {
            "total_notifications": doc["total_notifications"],
            "last_notification": doc.get("last_notification"),
        }

    result = []
    async for user in db["users"].find({}).sort("created_at", -1):
        uname = user["username"]
        s = stats_map.get(uname, {"total_notifications": 0, "last_notification": None})
        result.append(
            {
                "username": uname,
                "display_name": user.get("display_name"),
                "email": user.get("email"),
                "is_active": user.get("is_active", True),
                "total_notifications": s["total_notifications"],
                "last_notification": s["last_notification"],
                "created_at": user.get("created_at"),
            }
        )
    return result


async def get_all_groups_with_stats(db: AsyncIOMotorDatabase) -> list[dict[str, Any]]:
    cursor = db["groups"].find({}).sort("group_id", 1)
    groups = []
    async for doc in cursor:
        groups.append(
            {
                "id": str(doc["_id"]),
                "group_id": doc["group_id"],
                "usernames": doc.get("usernames", []),
                "member_count": len(doc.get("usernames", [])),
                "metadata": doc.get("metadata", {}),
                "created_at": doc.get("created_at"),
                "updated_at": doc.get("updated_at"),
            }
        )
    return groups


async def get_group_detail(db: AsyncIOMotorDatabase, group_id: str) -> dict[str, Any] | None:
    doc = await db["groups"].find_one({"group_id": group_id})
    if doc is None:
        return None
    return {
        "id": str(doc["_id"]),
        "group_id": doc["group_id"],
        "usernames": doc.get("usernames", []),
        "member_count": len(doc.get("usernames", [])),
        "metadata": doc.get("metadata", {}),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


async def get_dashboard_stats(db: AsyncIOMotorDatabase) -> dict[str, Any]:
    total_notification_data = await db["notification_data"].count_documents({})
    total_user_notifications = await db["notifications"].count_documents({})
    total_groups = await db["groups"].count_documents({})
    total_topics = await db["topic_configs"].count_documents({})

    pipeline = [
        {"$group": {"_id": "$username"}},
        {"$count": "total"},
    ]
    user_count_result = []
    async for doc in db["notifications"].aggregate(pipeline):
        user_count_result.append(doc)
    user_count_result_val = user_count_result[0]["total"] if user_count_result else 0
    total_users = await db["users"].count_documents({}) or user_count_result_val

    return {
        "total_notification_data": total_notification_data,
        "total_user_notifications": total_user_notifications,
        "total_groups": total_groups,
        "total_topics": total_topics,
        "total_users": total_users,
    }
