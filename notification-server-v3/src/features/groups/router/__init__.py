from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from features.groups.models import Group, MembersRequest, UpsertGroupRequest
from features.groups.services import (
    add_members,
    delete_group_service,
    get_group,
    list_groups,
    remove_members,
    upsert_group_service,
)
from shared.dependencies import api_key_guard, get_db

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.get("", response_model=list[Group])
async def list_all_groups(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await list_groups(db)


@router.get("/{group_id}", response_model=Group)
async def get_group_endpoint(
    group_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await get_group(db, group_id)


@router.put("/{group_id}", response_model=Group)
async def upsert_group_endpoint(
    group_id: str,
    req: UpsertGroupRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    req.group_id = group_id
    return await upsert_group_service(db, req)


@router.post("/{group_id}/members", response_model=Group)
async def add_group_members(
    group_id: str,
    req: MembersRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await add_members(db, group_id, req)


@router.delete("/{group_id}/members", response_model=Group)
async def remove_group_members(
    group_id: str,
    req: MembersRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await remove_members(db, group_id, req)


@router.delete("/{group_id}", status_code=204)
async def delete_group_endpoint(
    group_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    await delete_group_service(db, group_id)
