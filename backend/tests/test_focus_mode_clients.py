"""Unit tests for src.features.focus_mode.clients — Mongo + ClickHouse access."""
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from src.features.focus_mode.clients import (
    fetch_trajectory_rows,
    fetch_vessel_mmsi,
    fetch_vessels_by_mmsi,
)


@pytest.fixture
def mock_vessel_state_db():
    db = MagicMock()
    collection = MagicMock()
    db.get_collection = MagicMock(return_value=collection)
    return db, collection


class TestFetchVesselsByMmsi:
    @pytest.mark.asyncio
    async def test_queries_by_mmsi_and_returns_docs(self, mock_vessel_state_db):
        db, collection = mock_vessel_state_db
        cursor = MagicMock()
        cursor.to_list = AsyncMock(
            return_value=[{"vesselId": 1, "identification": {"shipName": "MV A"}}]
        )
        collection.find = MagicMock(return_value=cursor)

        result = await fetch_vessels_by_mmsi(db, 366168522)

        collection.find.assert_called_once_with(
            {"identification.mmsi": 366168522},
            {"_id": 0, "vesselId": 1, "identification.shipName": 1},
        )
        assert result == [{"vesselId": 1, "identification": {"shipName": "MV A"}}]

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_match(self, mock_vessel_state_db):
        db, collection = mock_vessel_state_db
        cursor = MagicMock()
        cursor.to_list = AsyncMock(return_value=[])
        collection.find = MagicMock(return_value=cursor)

        result = await fetch_vessels_by_mmsi(db, 999)
        assert result == []


class TestFetchVesselMmsi:
    @pytest.mark.asyncio
    async def test_returns_mmsi_when_found(self, mock_vessel_state_db):
        db, collection = mock_vessel_state_db
        collection.find_one = AsyncMock(
            return_value={"identification": {"mmsi": 366168522}}
        )

        result = await fetch_vessel_mmsi(db, 123)

        collection.find_one.assert_called_once_with(
            {"vesselId": 123}, {"_id": 0, "identification.mmsi": 1}
        )
        assert result == 366168522

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_vessel_state_db):
        db, collection = mock_vessel_state_db
        collection.find_one = AsyncMock(return_value=None)

        result = await fetch_vessel_mmsi(db, 123)
        assert result is None


class TestFetchTrajectoryRows:
    @pytest.mark.asyncio
    async def test_parses_json_each_row_response(self, mock_http_client):
        req = httpx.Request("POST", "http://test")
        body = (
            '{"ts":1717000000000,"lat":15.9,"lon":65.3,"speed":5.2,"heading":180.0}\n'
            '{"ts":1717000001000,"lat":15.91,"lon":65.31,"speed":5.3,"heading":181.0}\n'
        )
        mock_http_client.post.return_value = httpx.Response(200, text=body, request=req)

        rows = await fetch_trajectory_rows(mock_http_client, 123, None, None)

        assert len(rows) == 2
        assert rows[0]["ts"] == 1717000000000
        assert rows[0]["lat"] == 15.9

    @pytest.mark.asyncio
    async def test_empty_response_returns_empty_list(self, mock_http_client):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text="", request=req)

        rows = await fetch_trajectory_rows(mock_http_client, 123, None, None)
        assert rows == []

    @pytest.mark.asyncio
    async def test_query_includes_vessel_id_filter(self, mock_http_client):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text="", request=req)

        await fetch_trajectory_rows(mock_http_client, 366168522, None, None)

        sql = mock_http_client.post.call_args.kwargs["content"]
        assert "vessel_id = 366168522" in sql

    @pytest.mark.asyncio
    async def test_query_includes_time_bounds_in_ms_when_provided(self, mock_http_client):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text="", request=req)

        await fetch_trajectory_rows(mock_http_client, 1, 1717000000000, 1717003600000)

        sql = mock_http_client.post.call_args.kwargs["content"]
        assert "metadata_timestamp * 1000 >= 1717000000000" in sql
        assert "metadata_timestamp * 1000 <= 1717003600000" in sql

    @pytest.mark.asyncio
    async def test_query_omits_time_bounds_when_not_provided(self, mock_http_client):
        req = httpx.Request("POST", "http://test")
        mock_http_client.post.return_value = httpx.Response(200, text="", request=req)

        await fetch_trajectory_rows(mock_http_client, 1, None, None)

        sql = mock_http_client.post.call_args.kwargs["content"]
        assert "metadata_timestamp >=" not in sql
        assert "metadata_timestamp <=" not in sql
