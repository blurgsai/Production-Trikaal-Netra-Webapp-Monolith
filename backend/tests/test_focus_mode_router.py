"""Integration tests for src.features.focus_mode.router — FastAPI endpoints.

Uses TestClient(app) with mocked services, matching the pattern in
test_vessel_flags_router.py. Marked with @pytest.mark.integration.
"""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from src.features.focus_mode.models import (
    VesselsByMmsiResponse,
    VesselSummary,
    VesselTrajectoryResponse,
    TrajectoryPoint,
)
from src.main import app
from src.shared.auth import get_current_user
from src.shared.dependencies import get_clickhouse_client, get_db

pytestmark = pytest.mark.integration


def _mock_current_user():
    return {"username": "testuser", "role": "user"}


@pytest.fixture
def client():
    def override_get_db():
        yield None

    async def override_get_clickhouse_client():
        yield None

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_clickhouse_client] = override_get_clickhouse_client
    app.dependency_overrides[get_current_user] = _mock_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestVesselsByMmsiEndpoint:
    def test_returns_matching_vessels(self, client):
        mocked = VesselsByMmsiResponse(
            mmsi=366168522,
            vessels=[VesselSummary(vessel_id=1, ship_name="MV Test")],
            count=1,
        )
        with patch(
            "src.features.focus_mode.router.get_vessels_by_mmsi",
            new_callable=AsyncMock,
            return_value=mocked,
        ):
            resp = client.get("/api/focus-mode/vessel/by-mmsi/366168522")
            assert resp.status_code == 200
            body = resp.json()
            assert body["mmsi"] == 366168522
            assert body["count"] == 1
            assert body["vessels"][0]["ship_name"] == "MV Test"

    def test_non_numeric_mmsi_returns_422(self, client):
        resp = client.get("/api/focus-mode/vessel/by-mmsi/not-a-number")
        assert resp.status_code == 422

    def test_no_match_returns_empty_list(self, client):
        mocked = VesselsByMmsiResponse(mmsi=1, vessels=[], count=0)
        with patch(
            "src.features.focus_mode.router.get_vessels_by_mmsi",
            new_callable=AsyncMock,
            return_value=mocked,
        ):
            resp = client.get("/api/focus-mode/vessel/by-mmsi/1")
            assert resp.status_code == 200
            assert resp.json()["vessels"] == []

    def test_requires_auth(self, client):
        app.dependency_overrides.pop(get_current_user, None)
        resp = client.get("/api/focus-mode/vessel/by-mmsi/1")
        assert resp.status_code in (401, 403)


class TestVesselTrajectoryEndpoint:
    def test_returns_trajectory(self, client):
        mocked = VesselTrajectoryResponse(
            vessel_id=123,
            mmsi=366168522,
            trajectory=[TrajectoryPoint(timestamp=1717000000, lat=15.9, lon=65.3)],
            count=1,
        )
        with patch(
            "src.features.focus_mode.router.get_vessel_trajectory",
            new_callable=AsyncMock,
            return_value=mocked,
        ):
            resp = client.get("/api/focus-mode/vessel/123/trajectory")
            assert resp.status_code == 200
            body = resp.json()
            assert body["vessel_id"] == 123
            assert body["mmsi"] == 366168522
            assert body["trajectory"][0]["timestamp"] == 1717000000

    def test_passes_start_and_end_time_query_params(self, client):
        mocked = VesselTrajectoryResponse(vessel_id=123, mmsi=None, trajectory=[], count=0)
        with patch(
            "src.features.focus_mode.router.get_vessel_trajectory",
            new_callable=AsyncMock,
            return_value=mocked,
        ) as mock_service:
            resp = client.get(
                "/api/focus-mode/vessel/123/trajectory",
                params={"start_time": 1717000000, "end_time": 1717003600},
            )
            assert resp.status_code == 200
            call_args = mock_service.call_args[0]
            assert call_args[2] == 123
            assert call_args[3] == 1717000000
            assert call_args[4] == 1717003600

    def test_non_numeric_vessel_id_returns_422(self, client):
        resp = client.get("/api/focus-mode/vessel/not-a-number/trajectory")
        assert resp.status_code == 422
