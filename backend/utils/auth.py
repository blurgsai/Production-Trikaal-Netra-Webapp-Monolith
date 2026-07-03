from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from utils.security import decode_token
from db import db
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    username = payload.get("sub")    
    
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

async def get_user_role(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    role = payload.get("role")
    username = payload.get("sub")

    if role is None or username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    # verify user still exists in DB
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return role


def check_admin_role(current_user: dict = Depends(get_current_user)):
    """
    Dependency to check if current user has admin role
    """
    user_role = current_user.get("role")
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin role required."
        )
    return current_user
