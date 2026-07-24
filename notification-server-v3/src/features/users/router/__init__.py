from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from features.users.models import LoginRequest, LoginResponse, User
from features.users.services import get_user, list_users, login
from shared.dependencies import api_key_guard, get_db

router = APIRouter(tags=["Users"])


@router.post("/login", response_model=LoginResponse)
async def user_login(
    req: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Authenticate user with username and password."""
    return await login(db, req)


@router.get("/users", response_model=list[User])
async def read_users(
    active_only: bool = Query(False),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await list_users(db, active_only=active_only)


@router.get("/users/{username}", response_model=User)
async def read_user(
    username: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await get_user(db, username)
