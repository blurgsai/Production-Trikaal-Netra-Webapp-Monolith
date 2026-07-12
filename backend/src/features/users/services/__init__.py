from bson import ObjectId

from src.shared.errors import AuthenticationError
from src.shared.security import create_access_token, hash_password, verify_password


async def authenticate_user(db, username: str, password: str) -> dict:
    user = await db.users.find_one({"username": username})
    if not user:
        raise AuthenticationError()

    if not verify_password(password, user["password"]):
        raise AuthenticationError()

    token = create_access_token(
        {"sub": user["username"], "role": user.get("role", "user")}
    )

    return {
        "token": token,
        "role": user.get("role", "user"),
        "user_id": str(user.get("_id", "")),
        "username": user["username"],
    }


async def list_users(db) -> list[dict]:
    cursor = db.users.find({}, {"password": 0}).sort("username", 1)
    users = []
    async for user in cursor:
        users.append({
            "id": str(user["_id"]),
            "username": user["username"],
            "role": user.get("role", "user"),
        })
    return users


async def create_user(db, username: str, password: str, role: str = "user") -> dict:
    existing = await db.users.find_one({"username": username})
    if existing:
        raise ValueError(f"Username '{username}' already exists")

    user_doc = {
        "username": username,
        "password": hash_password(password),
        "role": role,
    }
    result = await db.users.insert_one(user_doc)
    return {
        "id": str(result.inserted_id),
        "username": username,
        "role": role,
    }


async def update_user(db, user_id: str, updates: dict) -> dict | None:
    if not ObjectId.is_valid(user_id):
        return None

    set_values: dict = {}
    if "username" in updates and updates["username"] is not None:
        existing = await db.users.find_one({
            "username": updates["username"],
            "_id": {"$ne": ObjectId(user_id)},
        })
        if existing:
            raise ValueError(f"Username '{updates['username']}' already exists")
        set_values["username"] = updates["username"]
    if "password" in updates and updates["password"] is not None:
        set_values["password"] = hash_password(updates["password"])
    if "role" in updates and updates["role"] is not None:
        set_values["role"] = updates["role"]

    if not set_values:
        user = await db.users.find_one(
            {"_id": ObjectId(user_id)}, {"password": 0},
        )
        if not user:
            return None
        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "role": user.get("role", "user"),
        }

    result = await db.users.update_one(
        {"_id": ObjectId(user_id)}, {"$set": set_values},
    )
    if result.matched_count == 0:
        return None

    user = await db.users.find_one(
        {"_id": ObjectId(user_id)}, {"password": 0},
    )
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "role": user.get("role", "user"),
    }


async def delete_user(db, user_id: str) -> bool:
    if not ObjectId.is_valid(user_id):
        return False
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    return result.deleted_count > 0


async def get_map_config(db, user_id: str) -> dict:
    doc = await db.users_config.find_one({"user_id": user_id})
    if not doc:
        return {
            "selected_base_map_id": None,
            "active_layer_ids": None,
            "layer_order": None,
            "vessel_config": None,
            "map_control_settings": None,
        }
    return doc.get("map_config", {
        "selected_base_map_id": None,
        "active_layer_ids": None,
        "layer_order": None,
        "vessel_config": None,
        "map_control_settings": None,
    })


async def save_map_config(db, user_id: str, config: dict) -> dict:
    await db.users_config.update_one(
        {"user_id": user_id},
        {"$set": {"map_config": config}},
        upsert=True,
    )
    return config
