"""Integration tests for src.features.vessel_flags.router — FastAPI endpoints.

Uses TestClient(app) to exercise the full HTTP stack with mocked services.
Marked with @pytest.mark.integration for selective execution.
"""
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from src.main import app
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db

pytestmark = pytest.mark.integration


def _mock_current_user():
    return {"_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"), "username": "testuser", "role": "user"}


@pytest.fixture
def client():
    def override_get_db():
        yield None

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = _mock_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestAddVesselFlag:
    def test_creates_flag_returns_201(self, client):
        mapped = {
            "id": str(ObjectId()),
            "vessel_id": "v1",
            "user_id": str(_mock_current_user()["_id"]),
            "flag": "suspicious",
            "comment": "Off course",
            "created_at": "2024-01-15T10:30:00Z",
        }
        with patch(
            "src.features.vessel_flags.router.create_flag",
            new_callable=AsyncMock,
            return_value=mapped,
        ) as mock_service:
            resp = client.post(
                "/vessel-flags",
                json={"vessel_id": "v1", "flag": "suspicious", "comment": "Off course"},
            )
            assert resp.status_code == 201
            body = resp.json()
            assert body["vessel_id"] == "v1"
            assert body["flag"] == "suspicious"
            assert body["comment"] == "Off course"
            mock_service.assert_called_once()

    def test_invalid_flag_returns_400(self, client):
        with patch(
            "src.features.vessel_flags.router.create_flag",
            new_callable=AsyncMock,
            side_effect=ValueError("Invalid flag 'bad'. Must be one of: safe, unsafe, suspicious, neutral, unknown"),
        ):
            resp = client.post(
                "/vessel-flags",
                json={"vessel_id": "v1", "flag": "bad", "comment": ""},
            )
            assert resp.status_code == 400
            assert "Invalid flag" in resp.json()["detail"]

    def test_missing_vessel_id_returns_422(self, client):
        resp = client.post(
            "/vessel-flags",
            json={"flag": "safe", "comment": ""},
        )
        assert resp.status_code == 422

    def test_missing_flag_returns_422(self, client):
        resp = client.post(
            "/vessel-flags",
            json={"vessel_id": "v1", "comment": ""},
        )
        assert resp.status_code == 422


class TestGetVesselFlags:
    def test_returns_flag_list(self, client):
        mapped = [
            {
                "id": str(ObjectId()),
                "vessel_id": "v1",
                "user_id": "u1",
                "flag": "safe",
                "comment": "ok",
                "created_at": "2024-01-15T10:00:00Z",
            }
        ]
        with patch(
            "src.features.vessel_flags.router.list_flags",
            new_callable=AsyncMock,
            return_value=mapped,
        ):
            resp = client.get("/vessel-flags/v1")
            assert resp.status_code == 200
            body = resp.json()
            assert body["success"] is True
            assert body["total"] == 1
            assert body["data"][0]["flag"] == "safe"

    def test_returns_empty_list(self, client):
        with patch(
            "src.features.vessel_flags.router.list_flags",
            new_callable=AsyncMock,
            return_value=[],
        ):
            resp = client.get("/vessel-flags/nonexistent")
            assert resp.status_code == 200
            body = resp.json()
            assert body["total"] == 0
            assert body["data"] == []


class TestDeleteVesselFlag:
    def test_deletes_returns_204(self, client):
        with patch(
            "src.features.vessel_flags.router.remove_flag",
            new_callable=AsyncMock,
            return_value=True,
        ):
            resp = client.delete(f"/vessel-flags/{ObjectId()}")
            assert resp.status_code == 204

    def test_not_found_returns_404(self, client):
        with patch(
            "src.features.vessel_flags.router.remove_flag",
            new_callable=AsyncMock,
            return_value=False,
        ):
            resp = client.delete(f"/vessel-flags/{ObjectId()}")
            assert resp.status_code == 404


class TestGetFlagOptions:
    def test_returns_flag_options(self, client):
        resp = client.get("/vessel-flags/meta/options")
        assert resp.status_code == 200
        body = resp.json()
        assert "safe" in body["flags"]
        assert "unsafe" in body["flags"]
        assert "suspicious" in body["flags"]
        assert "neutral" in body["flags"]
        assert "unknown" in body["flags"]
