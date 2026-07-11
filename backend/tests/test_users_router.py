"""Integration tests for src.features.users.router — FastAPI endpoint tests.

These tests use TestClient(app) to exercise the full HTTP stack:
  router → service → security (with mocked MongoDB).

They are marked with @pytest.mark.integration so they can be selected
or deselected independently from pure unit tests.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db
from src.shared.security import create_access_token, hash_password

pytestmark = pytest.mark.integration


def _mock_current_user():
    return {"username": "testuser", "role": "user"}


@pytest.fixture
def mock_users_db():
    """A mocked Motor MongoDB database with a users collection."""
    db = MagicMock()
    users_collection = MagicMock()
    users_collection.find_one = AsyncMock()
    db.users = users_collection
    return db


@pytest.fixture
def client(mock_users_db):
    def override_get_db():
        yield mock_users_db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = _mock_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestLoginEndpoint:
    def test_valid_credentials(self, client, mock_users_db):
        hashed = hash_password("testpass123")
        mock_users_db.users.find_one.return_value = {
            "_id": "507f1f77bcf86cd799439011",
            "username": "testuser",
            "password": hashed,
            "role": "admin",
        }

        resp = client.post(
            "/users/login",
            data={"username": "testuser", "password": "testpass123"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert "token" in body
        assert body["role"] == "admin"
        assert body["username"] == "testuser"
        assert body["user_id"] == "507f1f77bcf86cd799439011"

    def test_wrong_password_returns_401(self, client, mock_users_db):
        hashed = hash_password("correctpass")
        mock_users_db.users.find_one.return_value = {
            "_id": "507f1f77bcf86cd799439011",
            "username": "testuser",
            "password": hashed,
            "role": "user",
        }

        resp = client.post(
            "/users/login",
            data={"username": "testuser", "password": "wrongpass"},
        )

        assert resp.status_code == 401
        assert "Invalid username or password" in resp.json()["detail"]

    def test_nonexistent_user_returns_401(self, client, mock_users_db):
        mock_users_db.users.find_one.return_value = None

        resp = client.post(
            "/users/login",
            data={"username": "ghost", "password": "anypass"},
        )

        assert resp.status_code == 401
        assert "Invalid username or password" in resp.json()["detail"]

    def test_missing_username_returns_422(self, client):
        resp = client.post(
            "/users/login",
            data={"password": "testpass"},
        )
        assert resp.status_code == 422

    def test_missing_password_returns_422(self, client):
        resp = client.post(
            "/users/login",
            data={"username": "testuser"},
        )
        assert resp.status_code == 422

    def test_response_schema(self, client, mock_users_db):
        hashed = hash_password("testpass123")
        mock_users_db.users.find_one.return_value = {
            "_id": "507f1f77bcf86cd799439011",
            "username": "testuser",
            "password": hashed,
            "role": "admin",
        }

        resp = client.post(
            "/users/login",
            data={"username": "testuser", "password": "testpass123"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body["token"], str)
        assert isinstance(body["role"], str)
        assert isinstance(body["user_id"], str)
        assert isinstance(body["username"], str)

    def test_default_role_is_user(self, client, mock_users_db):
        hashed = hash_password("testpass123")
        mock_users_db.users.find_one.return_value = {
            "_id": "507f1f77bcf86cd799439011",
            "username": "testuser",
            "password": hashed,
        }

        resp = client.post(
            "/users/login",
            data={"username": "testuser", "password": "testpass123"},
        )

        assert resp.status_code == 200
        assert resp.json()["role"] == "user"


class TestAuthCheckEndpoint:
    def test_returns_user_info_with_mock(self, client):
        resp = client.get("/users/auth")

        assert resp.status_code == 200
        body = resp.json()
        assert body["username"] == "testuser"
        assert body["role"] == "user"

    def test_auth_required_without_token(self, client):
        app.dependency_overrides.pop(get_current_user, None)
        resp = client.get("/users/auth")
        assert resp.status_code == 401
        app.dependency_overrides[get_current_user] = _mock_current_user

    def test_returns_admin_role(self, client):
        def _mock_admin_user():
            return {"username": "admin", "role": "admin"}

        app.dependency_overrides[get_current_user] = _mock_admin_user
        resp = client.get("/users/auth")

        assert resp.status_code == 200
        body = resp.json()
        assert body["username"] == "admin"
        assert body["role"] == "admin"
        app.dependency_overrides[get_current_user] = _mock_current_user
