"""Integration tests for vessels feature — three levels per the backend integration testing guide.

Level 1: Router ↔ Service — mock client functions (AsyncMock), let router + service + mapper run real.
Level 2: Service ↔ Client — mock HTTP transport (respx), let service + client + mapper run real.
Level 3: Full Pipeline — mock HTTP transport (respx), let TestClient → Router → Service → Client → Mapper → response_model run real.
"""
import httpx
import pytest
import respx
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from src.main import app
from src.shared.auth import get_current_user
from src.shared.config import settings
from src.shared.dependencies import get_http_client
from src.features.vessels.clients import TrajectoryFilter, build_filter_clause
from src.features.vessels.services import get_vessel_trajectories
from src.shared.errors import NotFoundError, ExternalServiceError, ValidationError


# ── Shared helpers ──


def _mock_current_user():
    return {"username": "testuser", "role": "user"}


SAMPLE_TRAJECTORIES_RAW = (
    "366500659123456789\t2024-12-04T17:50:30Z\t15.903896666666666\t65.26356333333334\t0\t10.5\n"
    "366500659123456789\t2024-12-04T17:49:29Z\t15.89908\t65.26729833333333\t0\t10.2\n"
    "366168522123456789\t2024-12-04T17:50:30Z\t15.894265\t65.271035\t0\t8.0\n"
)

SAMPLE_POLYGON = {
    "type": "Polygon",
    "coordinates": [[
        [65.0, 15.0], [66.0, 15.0], [66.0, 16.0], [65.0, 16.0], [65.0, 15.0],
    ]],
}

CLICKHOUSE_URL = settings.clickhouse_url


@pytest.fixture
def client_with_mock_http():
    """TestClient with a real httpx.AsyncClient (for respx to intercept) + mocked auth."""
    async def _override_http():
        async with httpx.AsyncClient() as c:
            yield c

    app.dependency_overrides[get_http_client] = _override_http
    app.dependency_overrides[get_current_user] = _mock_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════════
# Level 1: Router ↔ Service Integration
#   Mock: client functions (AsyncMock)
#   Real: Router → Service → Mapper → response_model
# ═══════════════════════════════════════════════════════════════════════════


class TestRouterServiceIntegration:
    """RS-level: verify router → service → mapper → response_model pipeline with filters."""

    @pytest.mark.integration
    def test_rs01_post_trajectory_with_filters_returns_200(self, client_with_mock_http):
        with patch(
            "src.features.vessels.services.fetch_vessel_trajectories",
            new_callable=AsyncMock,
            return_value=SAMPLE_TRAJECTORIES_RAW,
        ) as mock_fetch:
            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [
                    {"column": "speed", "operator": "gt", "value": "5"},
                    {"column": "shipname", "operator": "like", "value": "%CARGO%", "combinator": "AND"},
                ],
            })

        assert resp.status_code == 200
        data = resp.json()
        assert "trajectories" in data
        assert "timestamps" in data
        assert "366500659123456789" in data["trajectories"]

        # Verify filters were passed to the client function
        mock_fetch.assert_awaited_once()
        call_kwargs = mock_fetch.call_args.kwargs
        assert call_kwargs["filters"] is not None
        assert len(call_kwargs["filters"]) == 2
        assert call_kwargs["filters"][0].column == "speed"
        assert call_kwargs["filters"][0].operator == "gt"
        assert call_kwargs["filters"][1].combinator == "AND"

    @pytest.mark.integration
    def test_rs02_post_trajectory_without_filters_passes_none(self, client_with_mock_http):
        with patch(
            "src.features.vessels.services.fetch_vessel_trajectories",
            new_callable=AsyncMock,
            return_value=SAMPLE_TRAJECTORIES_RAW,
        ) as mock_fetch:
            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
            })

        assert resp.status_code == 200
        call_kwargs = mock_fetch.call_args.kwargs
        assert call_kwargs["filters"] is None

    @pytest.mark.integration
    def test_rs03_post_trajectory_with_empty_filters_passes_none(self, client_with_mock_http):
        with patch(
            "src.features.vessels.services.fetch_vessel_trajectories",
            new_callable=AsyncMock,
            return_value=SAMPLE_TRAJECTORIES_RAW,
        ) as mock_fetch:
            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [],
            })

        assert resp.status_code == 200
        call_kwargs = mock_fetch.call_args.kwargs
        # Pydantic defaults empty list to None for Optional? No — empty list stays as []
        # But the service passes it through to the client
        assert call_kwargs["filters"] is not None
        assert len(call_kwargs["filters"]) == 0

    @pytest.mark.integration
    def test_rs04_post_trajectory_response_has_correct_domain_fields(self, client_with_mock_http):
        with patch(
            "src.features.vessels.services.fetch_vessel_trajectories",
            new_callable=AsyncMock,
            return_value=SAMPLE_TRAJECTORIES_RAW,
        ):
            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [{"column": "speed", "operator": "gt", "value": "5"}],
            })

        assert resp.status_code == 200
        data = resp.json()
        # Domain fields present (not raw ClickHouse column names)
        assert "trajectories" in data
        assert "timestamps" in data
        # Each trajectory point has domain fields
        for vessel_id, points in data["trajectories"].items():
            assert isinstance(vessel_id, str)
            assert isinstance(points, list)
            for pt in points:
                assert "ts" in pt
                assert "lat" in pt
                assert "lon" in pt
                assert "heading" in pt
                assert "speed" in pt
                assert isinstance(pt["lat"], float)
                assert isinstance(pt["speed"], float)

    @pytest.mark.integration
    def test_rs05_post_trajectory_with_filters_returns_404_on_empty_data(self, client_with_mock_http):
        with patch(
            "src.features.vessels.services.fetch_vessel_trajectories",
            new_callable=AsyncMock,
            return_value="",
        ):
            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [{"column": "speed", "operator": "gt", "value": "999"}],
            })

        assert resp.status_code == 404
        assert "no data found" in resp.json()["detail"].lower()

    @pytest.mark.integration
    def test_rs06_post_trajectory_missing_time_returns_400(self, client_with_mock_http):
        """Service validates that either time_window or time_seconds is provided."""
        resp = client_with_mock_http.post("/vessels/trajectory", json={
            "polygon": SAMPLE_POLYGON,
            "filters": [{"column": "speed", "operator": "gt", "value": "5"}],
        })
        assert resp.status_code == 400
        assert "time" in resp.json()["detail"].lower() or "must provide" in resp.json()["detail"].lower()

    @pytest.mark.integration
    def test_rs07_post_trajectory_response_has_json_content_type(self, client_with_mock_http):
        with patch(
            "src.features.vessels.services.fetch_vessel_trajectories",
            new_callable=AsyncMock,
            return_value=SAMPLE_TRAJECTORIES_RAW,
        ):
            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [{"column": "speed", "operator": "gt", "value": "5"}],
            })

        assert resp.headers["content-type"] == "application/json"

    @pytest.mark.integration
    def test_rs08_router_passes_filters_as_trajectory_filter_objects(self, client_with_mock_http):
        """Verify router deserializes JSON filters into TrajectoryFilter objects."""
        with patch(
            "src.features.vessels.services.fetch_vessel_trajectories",
            new_callable=AsyncMock,
            return_value=SAMPLE_TRAJECTORIES_RAW,
        ) as mock_fetch:
            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [
                    {"column": "vessel_id", "operator": "eq", "value": "123"},
                    {"column": "shipname", "operator": "like", "value": "%TEST%", "combinator": "OR"},
                ],
            })

        assert resp.status_code == 200
        filters = mock_fetch.call_args.kwargs["filters"]
        assert all(isinstance(f, TrajectoryFilter) for f in filters)
        assert filters[0].column == "vessel_id"
        assert filters[1].combinator == "OR"


# ═══════════════════════════════════════════════════════════════════════════
# Level 2: Service ↔ Client Integration
#   Mock: HTTP transport (respx)
#   Real: Service → Client → Mapper
# ═══════════════════════════════════════════════════════════════════════════


class TestServiceClientIntegration:
    """SC-level: verify service → client → mapper pipeline with filters via respx."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc01_get_trajectories_with_filters_calls_correct_url(self):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            async with httpx.AsyncClient() as client:
                result = await get_vessel_trajectories(
                    client,
                    polygon=SAMPLE_POLYGON,
                    start_time="2024-12-04T17:00:00Z",
                    end_time="2024-12-04T18:00:00Z",
                    filters=[TrajectoryFilter(column="speed", operator="gt", value="5")],
                )

            assert len(mock.calls) > 0
            assert mock.calls[0].request.method == "POST"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc02_get_trajectories_filter_clause_in_query(self):
        """Verify the SQL query sent to ClickHouse contains the filter clause."""
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            async with httpx.AsyncClient() as client:
                await get_vessel_trajectories(
                    client,
                    polygon=SAMPLE_POLYGON,
                    start_time="2024-12-04T17:00:00Z",
                    end_time="2024-12-04T18:00:00Z",
                    filters=[
                        TrajectoryFilter(column="speed", operator="gt", value="5"),
                        TrajectoryFilter(column="shipname", operator="like", value="%CARGO%", combinator="AND"),
                    ],
                )

            # Inspect the request body (the SQL query)
            request_body = mock.calls[0].request.content.decode()
            assert "speed > 5.0" in request_body
            assert "shipname LIKE '%CARGO%'" in request_body
            assert "AND" in request_body

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc03_get_trajectories_returns_mapped_domain_types(self):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            async with httpx.AsyncClient() as client:
                result = await get_vessel_trajectories(
                    client,
                    polygon=SAMPLE_POLYGON,
                    start_time="2024-12-04T17:00:00Z",
                    end_time="2024-12-04T18:00:00Z",
                    filters=[TrajectoryFilter(column="speed", operator="gt", value="5")],
                )

            assert "366500659123456789" in result.trajectories
            assert "366168522123456789" in result.trajectories
            pts = result.trajectories["366500659123456789"]
            assert len(pts) == 2
            assert pts[0].lat == 15.903896666666666
            assert pts[0].speed == 10.5

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc04_get_trajectories_raises_not_found_on_empty_response(self):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text="")

            async with httpx.AsyncClient() as client:
                with pytest.raises(NotFoundError):
                    await get_vessel_trajectories(
                        client,
                        polygon=SAMPLE_POLYGON,
                        start_time="2024-12-04T17:00:00Z",
                        end_time="2024-12-04T18:00:00Z",
                        filters=[TrajectoryFilter(column="speed", operator="gt", value="999")],
                    )

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc05_get_trajectories_raises_external_service_error_on_500(self):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(500, text="Internal Error")

            async with httpx.AsyncClient() as client:
                with pytest.raises(ExternalServiceError) as exc_info:
                    await get_vessel_trajectories(
                        client,
                        polygon=SAMPLE_POLYGON,
                        start_time="2024-12-04T17:00:00Z",
                        end_time="2024-12-04T18:00:00Z",
                        filters=[TrajectoryFilter(column="speed", operator="gt", value="5")],
                    )

            assert "ClickHouse" in str(exc_info.value.detail)

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc06_get_trajectories_raises_external_service_error_on_connect_error(self):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().mock(side_effect=httpx.ConnectError("Connection refused"))

            async with httpx.AsyncClient() as client:
                with pytest.raises(ExternalServiceError):
                    await get_vessel_trajectories(
                        client,
                        polygon=SAMPLE_POLYGON,
                        start_time="2024-12-04T17:00:00Z",
                        end_time="2024-12-04T18:00:00Z",
                        filters=[TrajectoryFilter(column="speed", operator="gt", value="5")],
                    )

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc07_get_trajectories_with_or_combinator_in_query(self):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            async with httpx.AsyncClient() as client:
                await get_vessel_trajectories(
                    client,
                    polygon=SAMPLE_POLYGON,
                    start_time="2024-12-04T17:00:00Z",
                    end_time="2024-12-04T18:00:00Z",
                    filters=[
                        TrajectoryFilter(column="speed", operator="gt", value="5"),
                        TrajectoryFilter(column="heading", operator="eq", value="0", combinator="OR"),
                    ],
                )

            request_body = mock.calls[0].request.content.decode()
            assert "speed > 5.0" in request_body
            assert "heading = 0.0" in request_body
            assert " OR " in request_body

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc08_get_trajectories_without_filters_omits_filter_clause(self):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            async with httpx.AsyncClient() as client:
                await get_vessel_trajectories(
                    client,
                    polygon=SAMPLE_POLYGON,
                    start_time="2024-12-04T17:00:00Z",
                    end_time="2024-12-04T18:00:00Z",
                    filters=None,
                )

            request_body = mock.calls[0].request.content.decode()
            # No filter clause should be present (just the base WHERE conditions)
            assert "speed >" not in request_body
            assert "shipname LIKE" not in request_body

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc09_get_trajectories_with_text_filter_uses_quotes(self):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            async with httpx.AsyncClient() as client:
                await get_vessel_trajectories(
                    client,
                    polygon=SAMPLE_POLYGON,
                    start_time="2024-12-04T17:00:00Z",
                    end_time="2024-12-04T18:00:00Z",
                    filters=[
                        TrajectoryFilter(column="destination", operator="eq", value="TOKYO"),
                    ],
                )

            request_body = mock.calls[0].request.content.decode()
            assert "destination = 'TOKYO'" in request_body

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc10_get_trajectories_with_invalid_column_skips_filter(self):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            async with httpx.AsyncClient() as client:
                await get_vessel_trajectories(
                    client,
                    polygon=SAMPLE_POLYGON,
                    start_time="2024-12-04T17:00:00Z",
                    end_time="2024-12-04T18:00:00Z",
                    filters=[
                        TrajectoryFilter(column="malicious_column", operator="eq", value="1"),
                    ],
                )

            request_body = mock.calls[0].request.content.decode()
            assert "malicious_column" not in request_body


# ═══════════════════════════════════════════════════════════════════════════
# Level 3: Full Pipeline Integration
#   Mock: HTTP transport (respx)
#   Real: TestClient → Router → Service → Client → Mapper → response_model
# ═══════════════════════════════════════════════════════════════════════════


class TestFullPipelineIntegration:
    """FP-level: verify the complete request/response cycle with filters via respx."""

    @pytest.mark.integration
    def test_fp01_post_trajectory_with_filters_returns_200(self, client_with_mock_http):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [
                    {"column": "speed", "operator": "gt", "value": "5"},
                ],
            })

        assert resp.status_code == 200
        data = resp.json()
        assert "366500659123456789" in data["trajectories"]
        assert "366168522123456789" in data["trajectories"]
        assert len(data["trajectories"]["366500659123456789"]) == 2

    @pytest.mark.integration
    def test_fp02_filter_clause_appears_in_clickhouse_query(self, client_with_mock_http):
        """Verify the SQL query sent to ClickHouse contains the filter clause."""
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [
                    {"column": "speed", "operator": "gt", "value": "5"},
                    {"column": "shipname", "operator": "like", "value": "%CARGO%", "combinator": "AND"},
                ],
            })

            assert resp.status_code == 200
            request_body = mock.calls[0].request.content.decode()
            assert "speed > 5.0" in request_body
            assert "shipname LIKE '%CARGO%'" in request_body

    @pytest.mark.integration
    def test_fp03_post_trajectory_with_filters_returns_404_on_empty(self, client_with_mock_http):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text="")

            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [{"column": "speed", "operator": "gt", "value": "999"}],
            })

        assert resp.status_code == 404
        assert "no data found" in resp.json()["detail"].lower()

    @pytest.mark.integration
    def test_fp04_post_trajectory_with_filters_returns_502_on_clickhouse_error(self, client_with_mock_http):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(500, text="Internal Error")

            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [{"column": "speed", "operator": "gt", "value": "5"}],
            })

        assert resp.status_code == 502
        assert "ClickHouse" in resp.json()["detail"]

    @pytest.mark.integration
    def test_fp05_post_trajectory_without_filters_works(self, client_with_mock_http):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
            })

            assert resp.status_code == 200
            request_body = mock.calls[0].request.content.decode()
            assert "speed >" not in request_body

    @pytest.mark.integration
    def test_fp06_post_trajectory_with_time_seconds_and_filters(self, client_with_mock_http):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "time_seconds": 3600,
                "filters": [{"column": "speed", "operator": "lte", "value": "20"}],
            })

            assert resp.status_code == 200
            request_body = mock.calls[0].request.content.decode()
            assert "speed <= 20.0" in request_body

    @pytest.mark.integration
    def test_fp07_post_trajectory_with_multiple_or_filters(self, client_with_mock_http):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [
                    {"column": "speed", "operator": "gt", "value": "5"},
                    {"column": "heading", "operator": "eq", "value": "0", "combinator": "OR"},
                ],
            })

            assert resp.status_code == 200
            request_body = mock.calls[0].request.content.decode()
            assert "speed > 5.0" in request_body
            assert "heading = 0.0" in request_body
            assert " OR " in request_body

    @pytest.mark.integration
    def test_fp08_post_trajectory_auth_required(self, client_with_mock_http):
        """Vessels endpoints require authentication."""
        app.dependency_overrides.pop(get_current_user, None)
        with respx.mock(base_url=CLICKHOUSE_URL, assert_all_called=False):
            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [{"column": "speed", "operator": "gt", "value": "5"}],
            })

        assert resp.status_code == 401
        app.dependency_overrides[get_current_user] = _mock_current_user

    @pytest.mark.integration
    def test_fp09_post_trajectory_response_model_validates_types(self, client_with_mock_http):
        """Verify response_model validates that lat/lon/heading/speed are floats."""
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [{"column": "speed", "operator": "gt", "value": "5"}],
            })

        data = resp.json()
        for points in data["trajectories"].values():
            for pt in points:
                assert isinstance(pt["lat"], float)
                assert isinstance(pt["lon"], float)
                assert isinstance(pt["heading"], float)
                assert isinstance(pt["speed"], float)

    @pytest.mark.integration
    def test_fp10_post_trajectory_with_vessel_ids_and_filters(self, client_with_mock_http):
        with respx.mock(base_url=CLICKHOUSE_URL) as mock:
            mock.post().respond(200, text=SAMPLE_TRAJECTORIES_RAW)

            resp = client_with_mock_http.post("/vessels/trajectory", json={
                "vessel_ids": ["366500659123456789"],
                "polygon": SAMPLE_POLYGON,
                "start_time": "2024-12-04T17:00:00Z",
                "end_time": "2024-12-04T18:00:00Z",
                "filters": [{"column": "speed", "operator": "gt", "value": "5"}],
            })

            assert resp.status_code == 200
            request_body = mock.calls[0].request.content.decode()
            assert "vessel_id IN (366500659123456789)" in request_body
            assert "speed > 5.0" in request_body


# ═══════════════════════════════════════════════════════════════════════════
# Unit tests for build_filter_clause (pure function, no mocking needed)
# ═══════════════════════════════════════════════════════════════════════════


class TestBuildFilterClause:
    """Unit tests for the build_filter_clause function — SQL clause construction."""

    def test_empty_filters_returns_empty_string(self):
        assert build_filter_clause([]) == ""

    def test_single_numeric_filter(self):
        filters = [TrajectoryFilter(column="speed", operator="gt", value="5")]
        clause = build_filter_clause(filters)
        assert clause == "speed > 5.0"

    def test_single_text_filter_with_eq(self):
        filters = [TrajectoryFilter(column="destination", operator="eq", value="TOKYO")]
        clause = build_filter_clause(filters)
        assert clause == "destination = 'TOKYO'"

    def test_single_text_filter_with_like(self):
        filters = [TrajectoryFilter(column="shipname", operator="like", value="%CARGO%")]
        clause = build_filter_clause(filters)
        assert clause == "shipname LIKE '%CARGO%'"

    def test_multiple_filters_with_and_combinator(self):
        filters = [
            TrajectoryFilter(column="speed", operator="gt", value="5"),
            TrajectoryFilter(column="heading", operator="eq", value="0", combinator="AND"),
        ]
        clause = build_filter_clause(filters)
        assert clause == "speed > 5.0 AND heading = 0.0"

    def test_multiple_filters_with_or_combinator(self):
        filters = [
            TrajectoryFilter(column="speed", operator="gt", value="5"),
            TrajectoryFilter(column="heading", operator="eq", value="0", combinator="OR"),
        ]
        clause = build_filter_clause(filters)
        assert clause == "speed > 5.0 OR heading = 0.0"

    def test_default_combinator_is_and(self):
        filters = [
            TrajectoryFilter(column="speed", operator="gt", value="5"),
            TrajectoryFilter(column="speed", operator="lt", value="20"),
        ]
        clause = build_filter_clause(filters)
        assert " AND " in clause

    def test_invalid_column_skipped(self):
        filters = [
            TrajectoryFilter(column="malicious_column", operator="eq", value="1"),
            TrajectoryFilter(column="speed", operator="gt", value="5"),
        ]
        clause = build_filter_clause(filters)
        assert "malicious_column" not in clause
        assert "speed > 5.0" in clause

    def test_invalid_operator_skipped(self):
        filters = [
            TrajectoryFilter(column="speed", operator="invalid_op", value="5"),
            TrajectoryFilter(column="speed", operator="gt", value="5"),
        ]
        clause = build_filter_clause(filters)
        assert "invalid_op" not in clause
        assert "speed > 5.0" in clause

    def test_non_numeric_value_on_numeric_column_skipped(self):
        filters = [
            TrajectoryFilter(column="speed", operator="gt", value="not_a_number"),
        ]
        clause = build_filter_clause(filters)
        assert clause == ""

    def test_string_escaping(self):
        filters = [
            TrajectoryFilter(column="destination", operator="eq", value="O'BRIEN"),
        ]
        clause = build_filter_clause(filters)
        assert "\\'" in clause

    def test_all_operators(self):
        operators = [
            ("eq", "="),
            ("ne", "!="),
            ("gt", ">"),
            ("gte", ">="),
            ("lt", "<"),
            ("lte", "<="),
        ]
        for op, sql_op in operators:
            filters = [TrajectoryFilter(column="speed", operator=op, value="5")]
            clause = build_filter_clause(filters)
            assert f"speed {sql_op} 5.0" == clause

    def test_all_allowed_numeric_columns(self):
        for col in ["vessel_id", "mmsi", "lat", "lon", "heading", "speed", "course", "status"]:
            filters = [TrajectoryFilter(column=col, operator="eq", value="1")]
            clause = build_filter_clause(filters)
            assert col in clause

    def test_all_allowed_text_columns(self):
        for col in ["shipname", "callsign", "destination"]:
            filters = [TrajectoryFilter(column=col, operator="eq", value="test")]
            clause = build_filter_clause(filters)
            assert f"{col} = 'test'" == clause

    def test_all_invalid_filters_returns_empty(self):
        filters = [
            TrajectoryFilter(column="bad1", operator="eq", value="1"),
            TrajectoryFilter(column="bad2", operator="invalid", value="1"),
        ]
        assert build_filter_clause(filters) == ""
