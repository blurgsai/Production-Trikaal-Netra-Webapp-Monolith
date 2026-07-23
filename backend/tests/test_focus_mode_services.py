"""Unit tests for src.features.focus_mode.services — business logic layer."""
from unittest.mock import AsyncMock, patch

import pytest

from src.features.focus_mode.services import get_vessel_trajectory, get_vessels_by_mmsi


class TestGetVesselsByMmsi:
    @pytest.mark.asyncio
    async def test_returns_mapped_vessels(self):
        docs = [
            {"vesselId": 1, "identification": {"shipName": "MV A"}},
            {"vesselId": 2, "identification": {"shipName": "MV B"}},
        ]
        with patch(
            "src.features.focus_mode.services.fetch_vessels_by_mmsi",
            new_callable=AsyncMock,
            return_value=docs,
        ):
            result = await get_vessels_by_mmsi(None, 366168522)

            assert result.mmsi == 366168522
            assert result.count == 2
            assert result.vessels[0].vessel_id == 1
            assert result.vessels[0].ship_name == "MV A"

    @pytest.mark.asyncio
    async def test_returns_empty_for_no_match(self):
        with patch(
            "src.features.focus_mode.services.fetch_vessels_by_mmsi",
            new_callable=AsyncMock,
            return_value=[],
        ):
            result = await get_vessels_by_mmsi(None, 1)
            assert result.vessels == []
            assert result.count == 0


class TestGetVesselTrajectory:
    @pytest.mark.asyncio
    async def test_converts_seconds_to_ms_for_clickhouse_query(self):
        with (
            patch(
                "src.features.focus_mode.services.fetch_trajectory_rows",
                new_callable=AsyncMock,
                return_value=[],
            ) as mock_fetch_rows,
            patch(
                "src.features.focus_mode.services.fetch_vessel_mmsi",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            await get_vessel_trajectory(None, None, 123, 1717000000, 1717003600)

            mock_fetch_rows.assert_called_once_with(None, 123, 1717000000000, 1717003600000)

    @pytest.mark.asyncio
    async def test_passes_through_none_bounds(self):
        with (
            patch(
                "src.features.focus_mode.services.fetch_trajectory_rows",
                new_callable=AsyncMock,
                return_value=[],
            ) as mock_fetch_rows,
            patch(
                "src.features.focus_mode.services.fetch_vessel_mmsi",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            await get_vessel_trajectory(None, None, 123, None, None)
            mock_fetch_rows.assert_called_once_with(None, 123, None, None)

    @pytest.mark.asyncio
    async def test_maps_rows_and_echoes_mmsi(self):
        rows = [{"ts": 1717000000000, "lat": 15.9, "lon": 65.3, "speed": 5.0, "heading": 180.0}]
        with (
            patch(
                "src.features.focus_mode.services.fetch_trajectory_rows",
                new_callable=AsyncMock,
                return_value=rows,
            ),
            patch(
                "src.features.focus_mode.services.fetch_vessel_mmsi",
                new_callable=AsyncMock,
                return_value=366168522,
            ),
        ):
            result = await get_vessel_trajectory(None, None, 123, None, None)

            assert result.vessel_id == 123
            assert result.mmsi == 366168522
            assert result.count == 1
            assert result.trajectory[0].timestamp == 1717000000
            assert result.trajectory[0].lat == 15.9

    @pytest.mark.asyncio
    async def test_empty_rows_return_empty_trajectory(self):
        with (
            patch(
                "src.features.focus_mode.services.fetch_trajectory_rows",
                new_callable=AsyncMock,
                return_value=[],
            ),
            patch(
                "src.features.focus_mode.services.fetch_vessel_mmsi",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            result = await get_vessel_trajectory(None, None, 123, None, None)
            assert result.trajectory == []
            assert result.count == 0
