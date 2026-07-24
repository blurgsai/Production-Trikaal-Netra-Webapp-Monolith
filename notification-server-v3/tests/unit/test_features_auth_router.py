from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from features.auth.router import router
from shared.auth.dependencies import SESSION_COOKIE


@pytest.fixture
def auth_app():
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def auth_client(auth_app):
    return TestClient(auth_app)


class TestLoginPage:
    def test_redirects_when_already_logged_in(self, auth_client, admin_user):
        # Create a valid session cookie
        from shared.auth import make_session_token
        token = make_session_token("admin")
        auth_client.cookies.set(SESSION_COOKIE, token)
        response = auth_client.get("/admin/login", follow_redirects=False)
        assert response.status_code == 303

    def test_get_login_renders(self, auth_client):
        response = auth_client.get("/admin/login")
        assert response.status_code == 200


class TestLoginSubmit:
    def test_valid_login_redirects(self, auth_client, admin_user):
        with patch("features.auth.router.authenticate", return_value=admin_user):
            with patch("features.auth.router.make_session_token", return_value="fake-token"):
                response = auth_client.post("/admin/login", data={"username": "admin", "password": "admin123", "next": "/admin"}, follow_redirects=False)
                assert response.status_code == 303
                assert response.headers["location"] == "/admin"
                set_cookie = response.headers.get("set-cookie")
                assert set_cookie is not None
                assert SESSION_COOKIE in set_cookie

    def test_invalid_login_returns_401(self, auth_client):
        with patch("features.auth.router.authenticate", return_value=None):
            response = auth_client.post("/admin/login", data={"username": "bad", "password": "bad", "next": "/admin"})
            assert response.status_code == 401

    def test_safe_next_redirect(self, auth_client, admin_user):
        with patch("features.auth.router.authenticate", return_value=admin_user):
            with patch("features.auth.router.make_session_token", return_value="fake-token"):
                response = auth_client.post("/admin/login", data={"username": "admin", "password": "admin123", "next": "https://evil.com/admin"}, follow_redirects=False)
                assert response.status_code == 303
                assert response.headers["location"] == "/admin"


class TestLogout:
    def test_clears_cookie_and_redirects(self, auth_client):
        response = auth_client.post("/admin/logout", follow_redirects=False)
        assert response.status_code == 303
        assert response.headers["location"] == "/admin/login"
        set_cookie = response.headers.get("set-cookie")
        assert set_cookie is not None
        assert SESSION_COOKIE in set_cookie


class TestLoginEdgeCases:
    def test_empty_credentials_returns_422(self, auth_client):
        response = auth_client.post("/admin/login", data={"username": "", "password": ""})
        assert response.status_code == 422

    def test_valid_next_redirect(self, auth_client, admin_user):
        with patch("features.auth.router.authenticate", return_value=admin_user):
            with patch("features.auth.router.make_session_token", return_value="fake-token"):
                response = auth_client.post("/admin/login", data={"username": "admin", "password": "admin123", "next": "/admin/dashboard"}, follow_redirects=False)
                assert response.status_code == 303
                assert response.headers["location"] == "/admin/dashboard"

    def test_missing_form_body_returns_422(self, auth_client):
        response = auth_client.post("/admin/login", data={})
        assert response.status_code == 422

    def test_expired_session_renders_login(self, auth_client):
        from shared.auth import make_session_token
        with patch("shared.auth.dependencies.decode_session_token", return_value=None):
            token = make_session_token("admin")
            auth_client.cookies.set(SESSION_COOKIE, token)
            response = auth_client.get("/admin/login", follow_redirects=False)
            assert response.status_code == 200
