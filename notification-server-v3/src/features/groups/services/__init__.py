from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from features.groups.clients import (
    add_members_to_group,
    delete_group,
    fetch_all_groups,
    fetch_group,
    remove_members_from_group,
    upsert_group,
)
from features.groups.models import Group, MembersRequest, UpsertGroupRequest, map_group
from shared.errors import NotFoundError


async def upsert_group_service(db: AsyncIOMotorDatabase, req: UpsertGroupRequest) -> Group:
    now = datetime.now(timezone.utc)
    data = {
        "group_id": req.group_id,
        "usernames": req.usernames,
        "metadata": req.metadata,
        "updated_at": now,
    }
    existing = await fetch_group(db, req.group_id)
    if existing is None:
        data["created_at"] = now
    doc = await upsert_group(db, data)
    return map_group(doc)


async def list_groups(db: AsyncIOMotorDatabase) -> list[Group]:
    docs = await fetch_all_groups(db)
    return [map_group(d) for d in docs]


async def get_group(db: AsyncIOMotorDatabase, group_id: str) -> Group:
    doc = await fetch_group(db, group_id)
    if doc is None:
        raise NotFoundError("Group", group_id)
    return map_group(doc)


async def add_members(db: AsyncIOMotorDatabase, group_id: str, req: MembersRequest) -> Group:
    doc = await add_members_to_group(db, group_id, req.usernames)
    if doc is None:
        raise NotFoundError("Group", group_id)
    return map_group(doc)


async def remove_members(db: AsyncIOMotorDatabase, group_id: str, req: MembersRequest) -> Group:
    doc = await remove_members_from_group(db, group_id, req.usernames)
    if doc is None:
        raise NotFoundError("Group", group_id)
    return map_group(doc)


async def delete_group_service(db: AsyncIOMotorDatabase, group_id: str) -> None:
    ok = await delete_group(db, group_id)
    if not ok:
        raise NotFoundError("Group", group_id)
