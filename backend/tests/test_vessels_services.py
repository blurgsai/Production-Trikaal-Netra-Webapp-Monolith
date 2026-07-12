"""Unit tests for src.features.vessels.services — business logic layer."""
import httpx
import pytest

from src.features.vessels.services import get_vessel_trajectory, get_vessel_playback
from src.features.vessels.models import VesselTrajectoryResponse, VesselPlaybackResponse
from src.shared.errors import ExternalServiceError, NotFoundError, ValidationError


class TestGetVesselTrajectory:
    @pytest.mark.asyncio
    async def test_valid_request(self, mock_http_client, sample_trajectory_raw):
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(200, text=sample_trajectory_raw, request=req)
        result = await get_vessel_trajectory(mock_http_client, "366500659123456789", 3600)

        assert isinstance(result, VesselTrajectoryResponse)
        assert result.vessel_id == "366500659123456789"
        assert len(result.trajectory) == 3

    @pytest.mark.asyncio
    async def test_non_numeric_vessel_id_raises_validation_error(self, mock_http_client):
        with pytest.raises(ValidationError) as exc_info:
            await get_vessel_trajectory(mock_http_client, "abc", 3600)
        assert "Invalid vessel_id" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_zero_time_raises_validation_error(self, mock_http_client):
        with pytest.raises(ValidationError) as exc_info:
            await get_vessel_trajectory(mock_http_client, "123", 0)
        assert "time must be a positive integer" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_negative_time_raises_validation_error(self, mock_http_client):
        with pytest.raises(ValidationError) as exc_info:
            await get_vessel_trajectory(mock_http_client, "123", -10)
        assert "time must be a positive integer" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_time_capped_at_max(self, mock_http_client, sample_trajectory_raw):
        """time > 2592000 should be capped to 2592000 (30 days)."""
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(200, text=sample_trajectory_raw, request=req)
        await get_vessel_trajectory(mock_http_client, "123", 9999999)

        call_args = mock_http_client.get.call_args
        assert call_args.kwargs["params"]["time_seconds"] == "2592000"

    @pytest.mark.asyncio
    async def test_empty_trajectory_raises_not_found(self, mock_http_client):
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(200, text="", request=req)
        with pytest.raises(NotFoundError) as exc_info:
            await get_vessel_trajectory(mock_http_client, "123", 3600)
        assert "Vessel trajectory" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_whitespace_only_trajectory_raises_not_found(self, mock_http_client):
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(200, text="   \n  \n", request=req)
        with pytest.raises(NotFoundError):
            await get_vessel_trajectory(mock_http_client, "123", 3600)

    @pytest.mark.asyncio
    async def test_clickhouse_http_error_raises_external_service_error(self, mock_http_client):
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(500, text="Internal Error", request=req)
        with pytest.raises(ExternalServiceError) as exc_info:
            await get_vessel_trajectory(mock_http_client, "123", 3600)
        assert "ClickHouse" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_clickhouse_connection_error_raises_external_service_error(self, mock_http_client):
        mock_http_client.get.side_effect = httpx.ConnectError("Connection refused")
        with pytest.raises(ExternalServiceError) as exc_info:
            await get_vessel_trajectory(mock_http_client, "123", 3600)
        assert "ClickHouse" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_default_time_param(self, mock_http_client, sample_trajectory_raw):
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(200, text=sample_trajectory_raw, request=req)
        result = await get_vessel_trajectory(mock_http_client, "123")
        assert len(result.trajectory) == 3
        call_args = mock_http_client.get.call_args
        assert call_args.kwargs["params"]["time_seconds"] == "3600"

    @pytest.mark.asyncio
    async def test_vessel_id_passed_as_string_in_response(self, mock_http_client, sample_trajectory_raw):
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(200, text=sample_trajectory_raw, request=req)
        result = await get_vessel_trajectory(mock_http_client, "366500659123456789", 3600)
        assert result.vessel_id == "366500659123456789"

    @pytest.mark.asyncio
    async def test_trajectory_points_have_correct_fields(self, mock_http_client, sample_trajectory_raw):
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(200, text=sample_trajectory_raw, request=req)
        result = await get_vessel_trajectory(mock_http_client, "123", 3600)
        pt = result.trajectory[0]
        assert hasattr(pt, "lat")
        assert hasattr(pt, "lng")
        assert hasattr(pt, "timestamp")
        assert pt.lat == 15.903896666666666
        assert pt.lng == 65.26356333333334
        assert pt.timestamp == "2024-12-04 17:50:30"


class TestGetVesselPlayback:
    @pytest.mark.asyncio
    async def test_valid_request(self, mock_http_client, sample_playback_raw, sample_polygon_geojson):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text=sample_playback_raw, request=req)
        result = await get_vessel_playback(
            mock_http_client,
            polygon=sample_polygon_geojson,
            start="2024-12-04 17:00:00",
            end="2024-12-04 18:00:00",
        )

        assert isinstance(result, VesselPlaybackResponse)
        assert len(result.vessels) == 2
        assert "366500659123456789" in result.vessels
        assert "366168522123456789" in result.vessels

    @pytest.mark.asyncio
    async def test_invalid_polygon_raises_validation_error(self, mock_http_client):
        with pytest.raises(ValidationError) as exc_info:
            await get_vessel_playback(
                mock_http_client,
                polygon={"type": "NotAPolygon"},
                start="2024-12-04 17:00:00",
                end="2024-12-04 18:00:00",
            )
        assert "Invalid polygon GeoJSON" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_invalid_date_format_raises_validation_error(self, mock_http_client, sample_polygon_geojson):
        with pytest.raises(ValidationError) as exc_info:
            await get_vessel_playback(
                mock_http_client,
                polygon=sample_polygon_geojson,
                start="invalid-date",
                end="2024-12-04 18:00:00",
            )
        assert "Invalid date format" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_invalid_end_date_raises_validation_error(self, mock_http_client, sample_polygon_geojson):
        with pytest.raises(ValidationError) as exc_info:
            await get_vessel_playback(
                mock_http_client,
                polygon=sample_polygon_geojson,
                start="2024-12-04 17:00:00",
                end="not-a-date",
            )
        assert "Invalid date format" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_empty_playback_raises_not_found(self, mock_http_client, sample_polygon_geojson):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text="", request=req)
        with pytest.raises(NotFoundError) as exc_info:
            await get_vessel_playback(
                mock_http_client,
                polygon=sample_polygon_geojson,
                start="2024-12-04 17:00:00",
                end="2024-12-04 18:00:00",
            )
        assert "no data in window" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_whitespace_only_playback_raises_not_found(self, mock_http_client, sample_polygon_geojson):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text="   \n  \n", request=req)
        with pytest.raises(NotFoundError):
            await get_vessel_playback(
                mock_http_client,
                polygon=sample_polygon_geojson,
                start="2024-12-04 17:00:00",
                end="2024-12-04 18:00:00",
            )

    @pytest.mark.asyncio
    async def test_clickhouse_http_error_raises_external_service_error(self, mock_http_client, sample_polygon_geojson):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(500, text="Internal Error", request=req)
        with pytest.raises(ExternalServiceError) as exc_info:
            await get_vessel_playback(
                mock_http_client,
                polygon=sample_polygon_geojson,
                start="2024-12-04 17:00:00",
                end="2024-12-04 18:00:00",
            )
        assert "ClickHouse" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_clickhouse_connection_error_raises_external_service_error(self, mock_http_client, sample_polygon_geojson):
        mock_http_client.post.side_effect = httpx.ConnectError("Connection refused")
        with pytest.raises(ExternalServiceError):
            await get_vessel_playback(
                mock_http_client,
                polygon=sample_polygon_geojson,
                start="2024-12-04 17:00:00",
                end="2024-12-04 18:00:00",
            )

    @pytest.mark.asyncio
    async def test_points_outside_polygon_filtered(self, mock_http_client, sample_polygon_geojson):
        """Points outside the polygon bounding box should be excluded."""
        raw = (
            "366500659123456789\t2024-12-04 17:50:30\t15.903896666666666\t65.26356333333334\t0\n"
            "366500659123456789\t2024-12-04 17:49:29\t15.89908\t65.26729833333333\t0\n"
            "366168522123456789\t2024-12-04 17:50:30\t18.98\t72.78\t0\n"
        )
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text=raw, request=req)
        result = await get_vessel_playback(
            mock_http_client,
            polygon=sample_polygon_geojson,
            start="2024-12-04 17:00:00",
            end="2024-12-04 18:00:00",
        )

        assert "366500659123456789" in result.vessels
        assert "366168522123456789" not in result.vessels

    @pytest.mark.asyncio
    async def test_all_points_outside_polygon_raises_not_found(self, mock_http_client, sample_polygon_geojson):
        raw = "366500659123456789\t2024-12-04 17:50:30\t18.98\t72.78\t0\n"
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text=raw, request=req)
        with pytest.raises(NotFoundError) as exc_info:
            await get_vessel_playback(
                mock_http_client,
                polygon=sample_polygon_geojson,
                start="2024-12-04 17:00:00",
                end="2024-12-04 18:00:00",
            )
        assert "no data points inside polygon" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_timestamps_sorted(self, mock_http_client, sample_playback_raw, sample_polygon_geojson):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text=sample_playback_raw, request=req)
        result = await get_vessel_playback(
            mock_http_client,
            polygon=sample_polygon_geojson,
            start="2024-12-04 17:00:00",
            end="2024-12-04 18:00:00",
        )
        assert result.timestamps == sorted(result.timestamps)

    @pytest.mark.asyncio
    async def test_playback_points_have_correct_fields(self, mock_http_client, sample_playback_raw, sample_polygon_geojson):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text=sample_playback_raw, request=req)
        result = await get_vessel_playback(
            mock_http_client,
            polygon=sample_polygon_geojson,
            start="2024-12-04 17:00:00",
            end="2024-12-04 18:00:00",
        )
        pt = result.vessels["366500659123456789"][0]
        assert hasattr(pt, "ts")
        assert hasattr(pt, "lat")
        assert hasattr(pt, "lon")
        assert hasattr(pt, "heading")
        assert pt.lat == 15.903896666666666
        assert pt.lon == 65.26356333333334
        assert pt.heading == 0.0

    @pytest.mark.asyncio
    async def test_date_reformatting(self, mock_http_client, sample_playback_raw, sample_polygon_geojson):
        """Dates should be parsed and reformatted to YYYY-MM-DD HH:MM:SS."""
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text=sample_playback_raw, request=req)
        await get_vessel_playback(
            mock_http_client,
            polygon=sample_polygon_geojson,
            start="2024-12-04 17:00:00",
            end="2024-12-04 18:00:00",
        )
        call_args = mock_http_client.post.call_args
        content = call_args.kwargs["content"]
        assert "2024-12-04 17:00:00" in content
        assert "2024-12-04 18:00:00" in content

    @pytest.mark.asyncio
    async def test_polygon_bounds_passed_to_client(self, mock_http_client, sample_playback_raw, sample_polygon_geojson):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text=sample_playback_raw, request=req)
        await get_vessel_playback(
            mock_http_client,
            polygon=sample_polygon_geojson,
            start="2024-12-04 17:00:00",
            end="2024-12-04 18:00:00",
        )
        call_args = mock_http_client.post.call_args
        content = call_args.kwargs["content"]
        assert "65.0" in content
        assert "66.0" in content
        assert "15.0" in content
        assert "16.0" in content
