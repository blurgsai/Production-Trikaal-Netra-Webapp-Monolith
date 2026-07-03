"""Unit tests for src.features.vessels.clients — ClickHouse HTTP client functions."""
import httpx
import pytest

from src.features.vessels.clients import fetch_trajectory, fetch_playback


@pytest.fixture
def mock_response():
    """Create a mock httpx.Response with a request attached (needed for raise_for_status)."""
    req = httpx.Request("GET", "http://test")
    return httpx.Response(200, text="ok", request=req)


class TestFetchTrajectory:
    @pytest.mark.asyncio
    async def test_successful_fetch(self, mock_http_client, mock_response):
        mock_http_client.get.return_value = mock_response
        result = await fetch_trajectory(mock_http_client, vessel_id=366500659123456789, time_seconds=3600)

        assert result == "ok"
        mock_http_client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_on_http_error(self, mock_http_client):
        req = httpx.Request("GET", "http://test")
        error_resp = httpx.Response(404, text="Not Found", request=req)
        mock_http_client.get.return_value = error_resp

        with pytest.raises(httpx.HTTPStatusError):
            await fetch_trajectory(mock_http_client, vessel_id=123, time_seconds=3600)

    @pytest.mark.asyncio
    async def test_raises_on_request_error(self, mock_http_client):
        mock_http_client.get.side_effect = httpx.ConnectError("Connection refused")

        with pytest.raises(httpx.ConnectError):
            await fetch_trajectory(mock_http_client, vessel_id=123, time_seconds=3600)

    @pytest.mark.asyncio
    async def test_passes_vessel_id_and_time_as_params(self, mock_http_client, mock_response):
        mock_http_client.get.return_value = mock_response
        await fetch_trajectory(mock_http_client, vessel_id=366500659123456789, time_seconds=7200)

        call_args = mock_http_client.get.call_args
        params = call_args.kwargs["params"]
        assert params["vessel_id"] == "366500659123456789"
        assert params["time_seconds"] == "7200"

    @pytest.mark.asyncio
    async def test_query_contains_tab_separated_format(self, mock_http_client, mock_response):
        mock_http_client.get.return_value = mock_response
        await fetch_trajectory(mock_http_client, vessel_id=123, time_seconds=3600)

        call_args = mock_http_client.get.call_args
        query = call_args.kwargs["params"]["query"]
        assert "FORMAT TabSeparated" in query
        assert "ais_processed_flat" in query

    @pytest.mark.asyncio
    async def test_returns_response_text(self, mock_http_client, sample_trajectory_raw):
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(200, text=sample_trajectory_raw, request=req)
        result = await fetch_trajectory(mock_http_client, vessel_id=123, time_seconds=3600)
        assert "15.903896666666666" in result


class TestFetchPlayback:
    @pytest.mark.asyncio
    async def test_successful_fetch(self, mock_http_client, mock_response):
        mock_http_client.get.return_value = mock_response
        result = await fetch_playback(
            mock_http_client,
            minx=65.0, miny=15.0, maxx=66.0, maxy=16.0,
            start_str="2024-12-04 17:00:00", end_str="2024-12-04 18:00:00",
        )

        assert result == "ok"
        mock_http_client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_on_http_error(self, mock_http_client):
        req = httpx.Request("GET", "http://test")
        error_resp = httpx.Response(500, text="Internal Server Error", request=req)
        mock_http_client.get.return_value = error_resp

        with pytest.raises(httpx.HTTPStatusError):
            await fetch_playback(
                mock_http_client,
                minx=65.0, miny=15.0, maxx=66.0, maxy=16.0,
                start_str="2024-12-04 17:00:00", end_str="2024-12-04 18:00:00",
            )

    @pytest.mark.asyncio
    async def test_raises_on_request_error(self, mock_http_client):
        mock_http_client.get.side_effect = httpx.TimeoutException("timed out")

        with pytest.raises(httpx.TimeoutException):
            await fetch_playback(
                mock_http_client,
                minx=65.0, miny=15.0, maxx=66.0, maxy=16.0,
                start_str="2024-12-04 17:00:00", end_str="2024-12-04 18:00:00",
            )

    @pytest.mark.asyncio
    async def test_passes_bbox_and_dates_as_params(self, mock_http_client, mock_response):
        mock_http_client.get.return_value = mock_response
        await fetch_playback(
            mock_http_client,
            minx=65.0, miny=15.0, maxx=66.0, maxy=16.0,
            start_str="2024-12-04 17:00:00", end_str="2024-12-04 18:00:00",
        )

        call_args = mock_http_client.get.call_args
        params = call_args.kwargs["params"]
        assert params["minx"] == "65.0"
        assert params["maxx"] == "66.0"
        assert params["miny"] == "15.0"
        assert params["maxy"] == "16.0"
        assert params["start_str"] == "2024-12-04 17:00:00"
        assert params["end_str"] == "2024-12-04 18:00:00"

    @pytest.mark.asyncio
    async def test_query_contains_tab_separated_format(self, mock_http_client, mock_response):
        mock_http_client.get.return_value = mock_response
        await fetch_playback(
            mock_http_client,
            minx=65.0, miny=15.0, maxx=66.0, maxy=16.0,
            start_str="2024-12-04 17:00:00", end_str="2024-12-04 18:00:00",
        )

        call_args = mock_http_client.get.call_args
        query = call_args.kwargs["params"]["query"]
        assert "FORMAT TabSeparated" in query
        assert "ais_processed_flat" in query
        assert "heading" in query

    @pytest.mark.asyncio
    async def test_returns_response_text(self, mock_http_client, sample_playback_raw):
        req = httpx.Request("GET", "http://test")
        mock_http_client.get.return_value = httpx.Response(200, text=sample_playback_raw, request=req)
        result = await fetch_playback(
            mock_http_client,
            minx=65.0, miny=15.0, maxx=66.0, maxy=16.0,
            start_str="2024-12-04 17:00:00", end_str="2024-12-04 18:00:00",
        )
        assert "366500659123456789" in result
