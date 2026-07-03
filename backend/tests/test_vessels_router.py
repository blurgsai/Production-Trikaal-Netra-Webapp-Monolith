"""Unit tests for routes.vessels.router — FastAPI endpoint tests."""
import httpx
import pytest
from fastapi.testclient import TestClient

from main import app
from shared.dependencies import get_http_client


def _mock_response(status_code=200, text=""):
    """Create an httpx.Response with a request attached (needed for raise_for_status)."""
    req = httpx.Request("GET", "http://test")
    return httpx.Response(status_code, text=text, request=req)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def override_http_client(mock_http_client):
    """Override the get_http_client dependency with a mock."""
    async def _override():
        yield mock_http_client
    app.dependency_overrides[get_http_client] = _override
    yield mock_http_client
    app.dependency_overrides.clear()


class TestGetTrajectoryEndpoint:
    def test_valid_request(self, client, override_http_client, sample_trajectory_raw):
        override_http_client.get.return_value = _mock_response(200, sample_trajectory_raw)
        resp = client.get("/vessels/trajectory/366500659123456789?time=3600")

        assert resp.status_code == 200
        data = resp.json()
        assert data["vessel_id"] == "366500659123456789"
        assert len(data["trajectory"]) == 3
        assert data["trajectory"][0]["lat"] == 15.903896666666666
        assert data["trajectory"][0]["lng"] == 65.26356333333334
        assert data["trajectory"][0]["timestamp"] == "2024-12-04 17:50:30"

    def test_default_time_param(self, client, override_http_client, sample_trajectory_raw):
        override_http_client.get.return_value = _mock_response(200, sample_trajectory_raw)
        resp = client.get("/vessels/trajectory/123")

        assert resp.status_code == 200
        assert len(resp.json()["trajectory"]) == 3

    def test_non_numeric_vessel_id_returns_400(self, client, override_http_client):
        resp = client.get("/vessels/trajectory/abc")
        assert resp.status_code == 400
        assert "Invalid vessel_id" in resp.json()["detail"]

    def test_zero_time_returns_400(self, client, override_http_client):
        resp = client.get("/vessels/trajectory/123?time=0")
        assert resp.status_code == 400
        assert "time must be a positive integer" in resp.json()["detail"]

    def test_negative_time_returns_400(self, client, override_http_client):
        resp = client.get("/vessels/trajectory/123?time=-5")
        assert resp.status_code == 400
        assert "time must be a positive integer" in resp.json()["detail"]

    def test_empty_trajectory_returns_404(self, client, override_http_client):
        override_http_client.get.return_value = _mock_response(200, "")
        resp = client.get("/vessels/trajectory/123")
        assert resp.status_code == 404
        assert "Vessel trajectory" in resp.json()["detail"]

    def test_clickhouse_error_returns_502(self, client, override_http_client):
        override_http_client.get.return_value = _mock_response(500, "Internal Error")
        resp = client.get("/vessels/trajectory/123")
        assert resp.status_code == 502
        assert "ClickHouse" in resp.json()["detail"]

    def test_no_auth_required(self, client, override_http_client, sample_trajectory_raw):
        """Vessels endpoints don't require authentication."""
        override_http_client.get.return_value = _mock_response(200, sample_trajectory_raw)
        resp = client.get("/vessels/trajectory/123")
        assert resp.status_code == 200

    def test_time_capped_at_max(self, client, override_http_client, sample_trajectory_raw):
        override_http_client.get.return_value = _mock_response(200, sample_trajectory_raw)
        resp = client.get("/vessels/trajectory/123?time=9999999")
        assert resp.status_code == 200
        call_args = override_http_client.get.call_args
        assert call_args.kwargs["params"]["time_seconds"] == "2592000"

    def test_response_schema(self, client, override_http_client, sample_trajectory_raw):
        override_http_client.get.return_value = _mock_response(200, sample_trajectory_raw)
        resp = client.get("/vessels/trajectory/123")
        data = resp.json()
        assert "vessel_id" in data
        assert "trajectory" in data
        assert isinstance(data["trajectory"], list)
        for pt in data["trajectory"]:
            assert "lat" in pt
            assert "lng" in pt
            assert "timestamp" in pt


class TestGetPlaybackEndpoint:
    def test_valid_request(self, client, override_http_client, sample_playback_raw, sample_polygon_geojson):
        override_http_client.get.return_value = _mock_response(200, sample_playback_raw)
        resp = client.post("/vessels/playback", json={
            "polygon": sample_polygon_geojson,
            "start": "2024-12-04 17:00:00",
            "end": "2024-12-04 18:00:00",
        })

        assert resp.status_code == 200
        data = resp.json()
        assert "timestamps" in data
        assert "vessels" in data
        assert "366500659123456789" in data["vessels"]
        assert "366168522123456789" in data["vessels"]
        assert len(data["vessels"]["366500659123456789"]) == 2

    def test_missing_body_returns_422(self, client, override_http_client):
        resp = client.post("/vessels/playback", json={})
        assert resp.status_code == 422

    def test_missing_polygon_returns_422(self, client, override_http_client):
        resp = client.post("/vessels/playback", json={
            "start": "2024-12-04 17:00:00",
            "end": "2024-12-04 18:00:00",
        })
        assert resp.status_code == 422

    def test_missing_start_returns_422(self, client, override_http_client, sample_polygon_geojson):
        resp = client.post("/vessels/playback", json={
            "polygon": sample_polygon_geojson,
            "end": "2024-12-04 18:00:00",
        })
        assert resp.status_code == 422

    def test_missing_end_returns_422(self, client, override_http_client, sample_polygon_geojson):
        resp = client.post("/vessels/playback", json={
            "polygon": sample_polygon_geojson,
            "start": "2024-12-04 17:00:00",
        })
        assert resp.status_code == 422

    def test_invalid_polygon_returns_400(self, client, override_http_client):
        resp = client.post("/vessels/playback", json={
            "polygon": {"type": "NotAPolygon"},
            "start": "2024-12-04 17:00:00",
            "end": "2024-12-04 18:00:00",
        })
        assert resp.status_code == 400
        assert "Invalid polygon GeoJSON" in resp.json()["detail"]

    def test_invalid_date_format_returns_400(self, client, override_http_client, sample_polygon_geojson):
        resp = client.post("/vessels/playback", json={
            "polygon": sample_polygon_geojson,
            "start": "invalid-date",
            "end": "2024-12-04 18:00:00",
        })
        assert resp.status_code == 400
        assert "Invalid date format" in resp.json()["detail"]

    def test_empty_playback_returns_404(self, client, override_http_client, sample_polygon_geojson):
        override_http_client.get.return_value = _mock_response(200, "")
        resp = client.post("/vessels/playback", json={
            "polygon": sample_polygon_geojson,
            "start": "2024-12-04 17:00:00",
            "end": "2024-12-04 18:00:00",
        })
        assert resp.status_code == 404
        assert "no data in window" in resp.json()["detail"]

    def test_clickhouse_error_returns_502(self, client, override_http_client, sample_polygon_geojson):
        override_http_client.get.return_value = _mock_response(500, "Internal Error")
        resp = client.post("/vessels/playback", json={
            "polygon": sample_polygon_geojson,
            "start": "2024-12-04 17:00:00",
            "end": "2024-12-04 18:00:00",
        })
        assert resp.status_code == 502
        assert "ClickHouse" in resp.json()["detail"]

    def test_no_auth_required(self, client, override_http_client, sample_playback_raw, sample_polygon_geojson):
        override_http_client.get.return_value = _mock_response(200, sample_playback_raw)
        resp = client.post("/vessels/playback", json={
            "polygon": sample_polygon_geojson,
            "start": "2024-12-04 17:00:00",
            "end": "2024-12-04 18:00:00",
        })
        assert resp.status_code == 200

    def test_response_schema(self, client, override_http_client, sample_playback_raw, sample_polygon_geojson):
        override_http_client.get.return_value = _mock_response(200, sample_playback_raw)
        resp = client.post("/vessels/playback", json={
            "polygon": sample_polygon_geojson,
            "start": "2024-12-04 17:00:00",
            "end": "2024-12-04 18:00:00",
        })
        data = resp.json()
        assert "timestamps" in data
        assert "vessels" in data
        assert isinstance(data["timestamps"], list)
        assert isinstance(data["vessels"], dict)
        for vessel_id, points in data["vessels"].items():
            assert isinstance(vessel_id, str)
            assert isinstance(points, list)
            for pt in points:
                assert "ts" in pt
                assert "lat" in pt
                assert "lon" in pt
                assert "heading" in pt

    def test_points_outside_polygon_excluded(self, client, override_http_client, sample_polygon_geojson):
        raw = (
            "366500659123456789\t2024-12-04 17:50:30\t15.903896666666666\t65.26356333333334\t0\n"
            "366168522123456789\t2024-12-04 17:50:30\t18.98\t72.78\t0\n"
        )
        override_http_client.get.return_value = _mock_response(200, raw)
        resp = client.post("/vessels/playback", json={
            "polygon": sample_polygon_geojson,
            "start": "2024-12-04 17:00:00",
            "end": "2024-12-04 18:00:00",
        })
        data = resp.json()
        assert "366500659123456789" in data["vessels"]
        assert "366168522123456789" not in data["vessels"]
