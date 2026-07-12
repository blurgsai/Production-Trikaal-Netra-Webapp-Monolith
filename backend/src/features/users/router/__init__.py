from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from src.features.users.models import (
    LoginResponse,
    MapConfigPayload,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
)
from src.features.users.services import (
    authenticate_user,
    create_user,
    delete_user,
    get_map_config,
    list_users,
    save_map_config,
    update_user,
)
from src.shared.auth import check_admin_role, get_current_user
from src.shared.dependencies import get_db

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/login", response_model=LoginResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db=Depends(get_db),
):
    return await authenticate_user(db, form.username, form.password)


@router.get("/auth")
async def auth_check(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"], "role": current_user.get("role", "operator")}


@router.get("/admin/users", response_model=list[UserResponse])
async def admin_list_users(
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    return await list_users(db)


@router.post("/admin/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    request: UserCreateRequest,
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    try:
        return await create_user(db, request.username, request.password, request.role)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None


@router.patch("/admin/users/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: str,
    request: UserUpdateRequest,
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    try:
        user = await update_user(db, user_id, request.model_dump())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: str,
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    deleted = await delete_user(db, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return None


@router.get("/me/map-config")
async def get_my_map_config(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    user_id = str(current_user["_id"])
    return await get_map_config(db, user_id)


@router.put("/me/map-config")
async def save_my_map_config(
    payload: MapConfigPayload,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    user_id = str(current_user["_id"])
    return await save_map_config(db, user_id, payload.model_dump())
