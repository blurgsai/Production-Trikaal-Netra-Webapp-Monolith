import os
from unittest.mock import patch

import pytest
import pytest_asyncio

from shared.auth import (
    authenticate,
    change_password,
    create_admin_user,
    decode_session_token,
    delete_admin_user,
    init_db,
    list_admin_users,
    make_session_token,
    set_user_active,
)
from shared.config import get_settings


@pytest_asyncio.fixture
async def fresh_db(test_env):
    """Yield a fresh SQLite DB with the schema created."""
    get_settings.cache_clear()
    db_path = get_settings().sqlite_path
    if os.path.exists(db_path):
        os.remove(db_path)
    await init_db()
    yield
    if os.path.exists(db_path):
        os.remove(db_path)


class TestInitDb:
    @pytest.mark.asyncio
    async def test_creates_table(self, test_env):
        get_settings.cache_clear()
        await init_db()


class TestCreateAdminUser:
    @pytest.mark.asyncio
    async def test_creates_user(self, fresh_db):
        user = await create_admin_user("alice", "password123")
        assert user["username"] == "alice"
        assert user["is_active"] == 1
        assert "hashed_password" in user

    @pytest.mark.asyncio
    async def test_duplicate_username_raises(self, fresh_db):
        await create_admin_user("alice", "password123")
        with pytest.raises(Exception):
            await create_admin_user("alice", "other")


class TestAuthenticate:
    @pytest.mark.asyncio
    async def test_valid_credentials(self, fresh_db):
        await create_admin_user("bob", "secret")
        row = await authenticate("bob", "secret")
        assert row is not None
        assert row["username"] == "bob"

    @pytest.mark.asyncio
    async def test_invalid_password(self, fresh_db):
        await create_admin_user("bob", "secret")
        row = await authenticate("bob", "wrong")
        assert row is None

    @pytest.mark.asyncio
    async def test_unknown_user(self, fresh_db):
        row = await authenticate("nobody", "secret")
        assert row is None

    @pytest.mark.asyncio
    async def test_inactive_user(self, fresh_db):
        await create_admin_user("charlie", "secret")
        await set_user_active("charlie", False)
        row = await authenticate("charlie", "secret")
        assert row is None


class TestListAdminUsers:
    @pytest.mark.asyncio
    async def test_lists_users(self, fresh_db):
        await create_admin_user("a1", "p1")
        await create_admin_user("a2", "p2")
        users = await list_admin_users()
        assert len(users) >= 2
        usernames = {u["username"] for u in users}
        assert "a1" in usernames
        assert "a2" in usernames
        assert "hashed_password" not in users[0]


class TestSetUserActive:
    @pytest.mark.asyncio
    async def test_deactivates_and_reactivates(self, fresh_db):
        await create_admin_user("dave", "secret")
        await set_user_active("dave", False)
        row = await authenticate("dave", "secret")
        assert row is None
        await set_user_active("dave", True)
        row = await authenticate("dave", "secret")
        assert row is not None


class TestChangePassword:
    @pytest.mark.asyncio
    async def test_changes_password(self, fresh_db):
        await create_admin_user("eve", "oldpass")
        await change_password("eve", "newpass")
        assert await authenticate("eve", "oldpass") is None
        assert await authenticate("eve", "newpass") is not None


class TestDeleteAdminUser:
    @pytest.mark.asyncio
    async def test_deletes_user(self, fresh_db):
        await create_admin_user("frank", "secret")
        await delete_admin_user("frank")
        row = await authenticate("frank", "secret")
        assert row is None


class TestSessionToken:
    def test_encode_decode_roundtrip(self, test_env):
        token = make_session_token("admin")
        assert decode_session_token(token) == "admin"

    def test_decode_invalid_token_returns_none(self, test_env):
        assert decode_session_token("totally-invalid-token") is None

    def test_decode_tampered_token_returns_none(self, test_env):
        token = make_session_token("admin")
        tampered = token[:-5] + "xxxxx"
        assert decode_session_token(tampered) is None

    def test_decode_expired_token_returns_none(self, test_env):
        token = make_session_token("admin")
        with patch("shared.auth.get_settings") as mock_settings:
            s = get_settings()
            s.session_max_age = -1  # Already expired
            mock_settings.return_value = s
            assert decode_session_token(token) is None


class TestChangePasswordNonExistent:
    @pytest.mark.asyncio
    async def test_noop_for_missing_user(self, fresh_db):
        await change_password("nobody", "newpass")
        assert await authenticate("nobody", "newpass") is None


class TestDeleteAdminUserNonExistent:
    @pytest.mark.asyncio
    async def test_noop_for_missing_user(self, fresh_db):
        await delete_admin_user("nobody")


class TestSetUserActiveNonExistent:
    @pytest.mark.asyncio
    async def test_noop_for_missing_user(self, fresh_db):
        await set_user_active("nobody", False)


class TestInitDbIdempotent:
    @pytest.mark.asyncio
    async def test_called_twice_no_error(self, test_env):
        get_settings.cache_clear()
        await init_db()
        await init_db()
