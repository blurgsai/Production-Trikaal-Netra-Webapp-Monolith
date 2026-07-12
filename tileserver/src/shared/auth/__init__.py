import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from src.shared.config import settings
from src.shared.errors import AuthenticationError, AuthorizationError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except Exception:
        return {}


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_token(token)
    username = payload.get("sub")
    role = payload.get("role")

    if username is None:
        raise AuthenticationError()

    return {"username": username, "role": role}


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise AuthorizationError()
    return current_user
