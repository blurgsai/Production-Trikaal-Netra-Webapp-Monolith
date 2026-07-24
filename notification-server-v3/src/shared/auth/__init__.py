"""
Admin authentication backed by SQLite.

Tables
------
admin_users(id, username, hashed_password, is_active, created_at, updated_at)

Sessions are stored in signed cookies via itsdangerous (no server-side
session store needed — the cookie itself is the session token).
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import aiosqlite
import jwt
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from passlib.context import CryptContext

from shared.config import get_settings

logger = logging.getLogger(__name__)

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

DDL = """
CREATE TABLE IF NOT EXISTS admin_users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    username         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    hashed_password  TEXT    NOT NULL,
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);
"""


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

async def init_db() -> None:
    settings = get_settings()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(DDL)
        await db.commit()
    logger.info("Auth SQLite DB ready at %s", settings.sqlite_path)


async def _get_user_row(username: str) -> dict[str, Any] | None:
    settings = get_settings()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM admin_users WHERE username = ? COLLATE NOCASE",
            (username,),
        ) as cursor:
            row = await cursor.fetchone()
    return dict(row) if row else None


async def create_admin_user(username: str, password: str) -> dict[str, Any]:
    settings = get_settings()
    hashed = _pwd_ctx.hash(password)
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            "INSERT INTO admin_users (username, hashed_password, is_active, created_at, updated_at) "
            "VALUES (?, ?, 1, ?, ?)",
            (username, hashed, now, now),
        )
        await db.commit()
    logger.info("Admin user created: %s", username)
    return await _get_user_row(username)


async def list_admin_users() -> list[dict[str, Any]]:
    settings = get_settings()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, username, is_active, created_at, updated_at FROM admin_users ORDER BY id"
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def set_user_active(username: str, active: bool) -> None:
    settings = get_settings()
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            "UPDATE admin_users SET is_active = ?, updated_at = ? WHERE username = ? COLLATE NOCASE",
            (1 if active else 0, now, username),
        )
        await db.commit()


async def change_password(username: str, new_password: str) -> None:
    settings = get_settings()
    hashed = _pwd_ctx.hash(new_password)
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            "UPDATE admin_users SET hashed_password = ?, updated_at = ? WHERE username = ? COLLATE NOCASE",
            (hashed, now, username),
        )
        await db.commit()


async def delete_admin_user(username: str) -> None:
    settings = get_settings()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            "DELETE FROM admin_users WHERE username = ? COLLATE NOCASE", (username,)
        )
        await db.commit()


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

async def authenticate(username: str, password: str) -> dict[str, Any] | None:
    row = await _get_user_row(username)
    if row is None or not row["is_active"]:
        return None
    if not _pwd_ctx.verify(password, row["hashed_password"]):
        return None
    return row


# ---------------------------------------------------------------------------
# Signed-cookie session helpers
# ---------------------------------------------------------------------------

def _serializer() -> URLSafeTimedSerializer:
    settings = get_settings()
    return URLSafeTimedSerializer(settings.secret_key, salt="admin-session")


def make_session_token(username: str) -> str:
    return _serializer().dumps({"u": username})


def decode_session_token(token: str) -> str | None:
    settings = get_settings()
    try:
        data = _serializer().loads(token, max_age=settings.session_max_age)
        return data["u"]
    except (SignatureExpired, BadSignature, KeyError):
        return None


# ---------------------------------------------------------------------------
# JWT helpers (for user API authentication)
# ---------------------------------------------------------------------------

_JWT_ALGORITHM = "HS256"
_JWT_EXPIRY_HOURS = 24


def create_jwt_token(user_id: str, username: str, display_name: str | None = None) -> str:
    """Create a JWT token for the given user."""
    settings = get_settings()
    payload = {
        "sub": user_id,
        "username": username,
        "display_name": display_name or username,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=_JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=_JWT_ALGORITHM)


def decode_jwt_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT token. Returns payload dict or None if invalid."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[_JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, jwt.DecodeError):
        return None
