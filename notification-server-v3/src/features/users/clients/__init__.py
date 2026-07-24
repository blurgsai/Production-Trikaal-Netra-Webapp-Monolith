from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

COLLECTION = "users"


class UserDocument:
    def __init__(self, doc: dict[str, Any]):
        self._doc = doc

    @property
    def id(self) -> str:
        return str(self._doc.get("_id", ""))

    @property
    def username(self) -> str:
        return self._doc.get("username", "")

    @property
    def password_hash(self) -> str | None:
        return self._doc.get("password_hash")

    @property
    def display_name(self) -> str | None:
        return self._doc.get("display_name")

    @property
    def email(self) -> str | None:
        return self._doc.get("email")

    @property
    def metadata(self) -> dict[str, Any]:
        return self._doc.get("metadata", {})

    @property
    def is_active(self) -> bool:
        return self._doc.get("is_active", True)

    @property
    def created_at(self) -> datetime | None:
        return self._doc.get("created_at")

    @property
    def updated_at(self) -> datetime | None:
        return self._doc.get("updated_at")

    def __getitem__(self, key: str) -> Any:
        return self._doc[key]

    def get(self, key: str, default: Any = None) -> Any:
        return self._doc.get(key, default)


async def fetch_user(db: AsyncIOMotorDatabase, username: str) -> UserDocument | None:
    doc = await db[COLLECTION].find_one({"username": username})
    if doc is None:
        return None
    return UserDocument(doc)


async def fetch_all_users(
    db: AsyncIOMotorDatabase, active_only: bool = False
) -> list[UserDocument]:
    query: dict[str, Any] = {}
    if active_only:
        query["is_active"] = True
    cursor = db[COLLECTION].find(query).sort("created_at", -1)
    docs: list[UserDocument] = []
    async for doc in cursor:
        docs.append(UserDocument(doc))
    return docs


async def count_users(db: AsyncIOMotorDatabase) -> int:
    return await db[COLLECTION].count_documents({})


async def user_exists(db: AsyncIOMotorDatabase, username: str) -> bool:
    doc = await db[COLLECTION].find_one({"username": username})
    return doc is not None
