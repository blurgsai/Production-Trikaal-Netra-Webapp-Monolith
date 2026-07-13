"""Unit tests for src.features.vessel_flags.services — business logic layer."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

from src.features.vessel_flags.services import create_flag, list_flags, remove_flag


class TestCreateFlag:
    @pytest.mark.asyncio
    async def test_creates_flag_with_valid_inputs(self):
        oid = ObjectId()
        raw_doc = {
            "_id": oid,
            "vessel_id": "v1",
            "user_id": "u1",
            "flag": "suspicious",
            "comment": "Off course",
            "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
        }
        with patch(
            "src.features.vessel_flags.services.insert_flag",
            new_callable=AsyncMock,
            return_value=raw_doc,
        ) as mock_insert:
            result = await create_flag(None, "v1", "u1", "suspicious", "Off course")

            mock_insert.assert_called_once_with(None, "v1", "u1", "suspicious", "Off course")
            assert result["id"] == str(oid)
            assert result["vessel_id"] == "v1"
            assert result["user_id"] == "u1"
            assert result["flag"] == "suspicious"

    @pytest.mark.asyncio
    async def test_normalizes_flag_to_lowercase(self):
        raw_doc = {
            "_id": ObjectId(),
            "vessel_id": "v1",
            "user_id": "u1",
            "flag": "safe",
            "comment": "",
            "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
        }
        with patch(
            "src.features.vessel_flags.services.insert_flag",
            new_callable=AsyncMock,
            return_value=raw_doc,
        ) as mock_insert:
            await create_flag(None, "v1", "u1", "SAFE", "")
            args = mock_insert.call_args[0]
            assert args[3] == "safe"

    @pytest.mark.asyncio
    async def test_strips_comment_whitespace(self):
        raw_doc = {
            "_id": ObjectId(),
            "vessel_id": "v1",
            "user_id": "u1",
            "flag": "safe",
            "comment": "trimmed",
            "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
        }
        with patch(
            "src.features.vessel_flags.services.insert_flag",
            new_callable=AsyncMock,
            return_value=raw_doc,
        ) as mock_insert:
            await create_flag(None, "v1", "u1", "safe", "  trimmed  ")
            args = mock_insert.call_args[0]
            assert args[4] == "trimmed"

    @pytest.mark.asyncio
    async def test_invalid_flag_raises_value_error(self):
        with pytest.raises(ValueError) as exc_info:
            await create_flag(None, "v1", "u1", "malicious", "comment")
        assert "Invalid flag" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_empty_flag_raises_value_error(self):
        with pytest.raises(ValueError):
            await create_flag(None, "v1", "u1", "", "comment")

    @pytest.mark.asyncio
    @pytest.mark.parametrize("valid_flag", ["safe", "unsafe", "suspicious", "neutral", "unknown"])
    async def test_all_valid_flags_accepted(self, valid_flag):
        raw_doc = {
            "_id": ObjectId(),
            "vessel_id": "v1",
            "user_id": "u1",
            "flag": valid_flag,
            "comment": "",
            "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
        }
        with patch(
            "src.features.vessel_flags.services.insert_flag",
            new_callable=AsyncMock,
            return_value=raw_doc,
        ):
            result = await create_flag(None, "v1", "u1", valid_flag, "")
            assert result["flag"] == valid_flag


class TestListFlags:
    @pytest.mark.asyncio
    async def test_returns_mapped_flags(self):
        docs = [
            {
                "_id": ObjectId(),
                "vessel_id": "v1",
                "user_id": "u1",
                "flag": "safe",
                "comment": "ok",
                "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
            },
            {
                "_id": ObjectId(),
                "vessel_id": "v1",
                "user_id": "u2",
                "flag": "unsafe",
                "comment": "danger",
                "created_at": datetime(2024, 1, 16, tzinfo=timezone.utc),
            },
        ]
        with patch(
            "src.features.vessel_flags.services.fetch_flags_by_vessel",
            new_callable=AsyncMock,
            return_value=docs,
        ):
            result = await list_flags(None, "v1")
            assert len(result) == 2
            assert result[0]["flag"] == "safe"
            assert result[1]["flag"] == "unsafe"

    @pytest.mark.asyncio
    async def test_returns_empty_list_for_no_flags(self):
        with patch(
            "src.features.vessel_flags.services.fetch_flags_by_vessel",
            new_callable=AsyncMock,
            return_value=[],
        ):
            result = await list_flags(None, "v1")
            assert result == []


class TestRemoveFlag:
    @pytest.mark.asyncio
    async def test_returns_true_when_deleted(self):
        with patch(
            "src.features.vessel_flags.services.delete_flag_by_id",
            new_callable=AsyncMock,
            return_value=True,
        ):
            result = await remove_flag(None, str(ObjectId()))
            assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_when_not_found(self):
        with patch(
            "src.features.vessel_flags.services.delete_flag_by_id",
            new_callable=AsyncMock,
            return_value=False,
        ):
            result = await remove_flag(None, str(ObjectId()))
            assert result is False
