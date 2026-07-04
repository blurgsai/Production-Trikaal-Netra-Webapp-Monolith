from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from src.features.users.models import LoginResponse
from src.features.users.services import authenticate_user
from src.shared.auth import get_current_user
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
    return {"username": current_user["username"], "role": current_user.get("role", "user")}
