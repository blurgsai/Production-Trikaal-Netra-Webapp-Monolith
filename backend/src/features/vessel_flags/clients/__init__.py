from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


async def insert_flag(db, vessel_id: str, user_id: str, flag: str, comment: str) -> dict[str, Any]:
    collection = db.get_collection("vessel_flags")
    doc = {
        "vessel_id": vessel_id,
        "user_id": user_id,
        "flag": flag,
        "comment": comment,
        "created_at": datetime.now(timezone.utc),
    }
    result = await collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def fetch_flags_by_vessel(db, vessel_id: str) -> list[dict[str, Any]]:
    collection = db.get_collection("vessel_flags")
    cursor = collection.find({"vessel_id": vessel_id}).sort("created_at", -1)
    return await cursor.to_list(length=None)


async def delete_flag_by_id(db, flag_id: str) -> bool:
    from bson import ObjectId

    if not ObjectId.is_valid(flag_id):
        return False
    collection = db.get_collection("vessel_flags")
    result = await collection.delete_one({"_id": ObjectId(flag_id)})
    return result.deleted_count > 0
