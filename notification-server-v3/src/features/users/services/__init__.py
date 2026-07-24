import bcrypt
from motor.motor_asyncio import AsyncIOMotorDatabase

from features.users.clients import count_users, fetch_all_users, fetch_user
from features.users.models import LoginRequest, LoginResponse, User, map_user
from shared.auth import create_jwt_token
from shared.errors import NotFoundError, UnauthorizedError


async def get_user(db: AsyncIOMotorDatabase, username: str) -> User:
    doc = await fetch_user(db, username)
    if doc is None:
        raise NotFoundError("User", username)
    return map_user(doc)


async def list_users(db: AsyncIOMotorDatabase, active_only: bool = False) -> list[User]:
    docs = await fetch_all_users(db, active_only=active_only)
    return [map_user(d) for d in docs]


async def get_user_count(db: AsyncIOMotorDatabase) -> int:
    return await count_users(db)


async def login(db: AsyncIOMotorDatabase, req: LoginRequest) -> LoginResponse:
    """Authenticate user with username and password."""
    doc = await fetch_user(db, req.username)
    if doc is None:
        raise UnauthorizedError("Invalid username or password")
    
    if not doc.password_hash:
        raise UnauthorizedError("User has no password set")
    
    # Verify password
    password_bytes = req.password.encode('utf-8')
    hash_bytes = doc.password_hash.encode('utf-8') if isinstance(doc.password_hash, str) else doc.password_hash
    
    if not bcrypt.checkpw(password_bytes, hash_bytes):
        raise UnauthorizedError("Invalid username or password")
    
    if not doc.is_active:
        raise UnauthorizedError("User account is inactive")
    
    # Generate JWT token
    token = create_jwt_token(
        user_id=doc.username,
        username=doc.username,
        display_name=doc.display_name,
    )
    
    return LoginResponse(
        username=doc.username,
        display_name=doc.display_name,
        token=token,
    )


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')
