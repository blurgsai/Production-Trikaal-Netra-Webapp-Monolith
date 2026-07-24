from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from features.users.clients import (
    COLLECTION,
    UserDocument,
    count_users,
    fetch_all_users,
    fetch_user,
    user_exists,
)
from features.users.models import User, map_user
from features.users.services import get_user, get_user_count, list_users
from shared.errors import NotFoundError


# ---------------------------------------------------------------------------
# UserDocument
# ---------------------------------------------------------------------------

class TestUserDocument:
    def test_from_full_doc(self):
        now = datetime.now(timezone.utc)
        doc = {
            "_id": "abc123",
            "username": "user-1",
            "display_name": "Test User",
            "email": "test@example.com",
            "metadata": {"role": "admin"},
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        u = UserDocument(doc)
        assert u.id == "abc123"
        assert u.username == "user-1"
        assert u.display_name == "Test User"
        assert u.email == "test@example.com"
        assert u.metadata == {"role": "admin"}
        assert u.is_active is True

    def test_defaults(self):
        doc = {"_id": "abc", "username": "user-1"}
        u = UserDocument(doc)
        assert u.display_name is None
        assert u.email is None
        assert u.metadata == {}
        assert u.is_active is True


# ---------------------------------------------------------------------------
# map_user
# ---------------------------------------------------------------------------

class TestMapUser:
    def test_maps_correctly(self):
        now = datetime.now(timezone.utc)
        doc = UserDocument({
            "_id": "abc",
            "username": "user-1",
            "display_name": "Test",
            "email": "test@example.com",
            "metadata": {},
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        })
        model = map_user(doc)
        assert isinstance(model, User)
        assert model.id == "abc"
        assert model.username == "user-1"
        assert model.display_name == "Test"
        assert model.email == "test@example.com"


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

class TestFetchUser:
    @pytest.mark.asyncio
    async def test_returns_document_when_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value={"_id": "abc", "username": "u1", "is_active": True})
        result = await fetch_user(mock_db, "u1")
        assert result is not None
        assert result.username == "u1"

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value=None)
        result = await fetch_user(mock_db, "missing")
        assert result is None


class TestFetchAllUsers:
    @pytest.mark.asyncio
    async def test_returns_all(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("users", data=[
            {"_id": "a", "username": "u1", "is_active": True},
            {"_id": "b", "username": "u2", "is_active": True},
        ])
        result = await fetch_all_users(mock_db)
        assert len(result) == 2
        assert result[0].username == "u1"
        assert result[1].username == "u2"

    @pytest.mark.asyncio
    async def test_respects_active_only(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("users", data=[
            {"_id": "a", "username": "u1", "is_active": True},
            {"_id": "b", "username": "u2", "is_active": False},
        ])
        result = await fetch_all_users(mock_db, active_only=True)
        assert len(result) == 1
        assert result[0].username == "u1"


class TestUserExists:
    @pytest.mark.asyncio
    async def test_true_when_user_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value={"_id": "abc"})
        assert await user_exists(mock_db, "u1") is True

    @pytest.mark.asyncio
    async def test_false_when_not_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value=None)
        assert await user_exists(mock_db, "missing") is False


class TestCountUsers:
    @pytest.mark.asyncio
    async def test_returns_count(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.count_documents = AsyncMock(return_value=5)
        assert await count_users(mock_db) == 5


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

class TestGetUser:
    @pytest.mark.asyncio
    async def test_returns_user(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value={"_id": "abc", "username": "u1"})
        result = await get_user(mock_db, "u1")
        assert result.username == "u1"

    @pytest.mark.asyncio
    async def test_raises_when_not_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError):
            await get_user(mock_db, "missing")


class TestListUsers:
    @pytest.mark.asyncio
    async def test_returns_list(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("users", data=[
            {"_id": "a", "username": "u1", "is_active": True},
            {"_id": "b", "username": "u2", "is_active": True},
        ])
        result = await list_users(mock_db)
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_active_only_filter(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("users", data=[
            {"_id": "a", "username": "u1", "is_active": True},
            {"_id": "b", "username": "u2", "is_active": False},
        ])
        result = await list_users(mock_db, active_only=True)
        assert len(result) == 1
        assert result[0].username == "u1"


class TestGetUserCount:
    @pytest.mark.asyncio
    async def test_returns_count(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.count_documents = AsyncMock(return_value=10)
        assert await get_user_count(mock_db) == 10

    @pytest.mark.asyncio
    async def test_returns_zero_when_empty(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.count_documents = AsyncMock(return_value=0)
        assert await get_user_count(mock_db) == 0


# ---------------------------------------------------------------------------
# Missing edge cases
# ---------------------------------------------------------------------------

class TestFetchAllUsersEmpty:
    @pytest.mark.asyncio
    async def test_returns_empty_list(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("users", data=[])
        result = await fetch_all_users(mock_db)
        assert result == []


class TestUserExistsInactive:
    @pytest.mark.asyncio
    async def test_returns_true_for_inactive_user(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value={"_id": "abc", "username": "u1", "is_active": False})
        assert await user_exists(mock_db, "u1") is True


class TestFetchUserNoEmail:
    @pytest.mark.asyncio
    async def test_handles_none_email(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value={"_id": "abc", "username": "u1", "email": None})
        result = await fetch_user(mock_db, "u1")
        assert result is not None
        assert result.email is None


class TestGetUserInactive:
    @pytest.mark.asyncio
    async def test_returns_inactive_user(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value={"_id": "abc", "username": "u1", "is_active": False})
        result = await get_user(mock_db, "u1")
        assert result.username == "u1"
        assert result.is_active is False


class TestListUsersEmpty:
    @pytest.mark.asyncio
    async def test_returns_empty_list(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("users", data=[])
        result = await list_users(mock_db)
        assert result == []
