from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from features.users.clients import UserDocument


class User(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: str | None = None
    username: str
    password_hash: str | None = None
    display_name: str | None = None
    email: str | None = None
    metadata: dict[str, Any] = {}
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    username: str
    display_name: str | None = None
    token: str


def map_user(doc: UserDocument) -> User:
    return User(
        id=doc.id,
        username=doc.username,
        password_hash=doc.password_hash,
        display_name=doc.display_name,
        email=doc.email,
        metadata=doc.metadata,
        is_active=doc.is_active,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
