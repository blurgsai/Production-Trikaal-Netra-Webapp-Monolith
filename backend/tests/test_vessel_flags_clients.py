"""Unit tests for src.features.vessel_flags.clients — MongoDB data access layer."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId

from src.features.vessel_flags.clients import (
    delete_flag_by_id,
    fetch_flags_by_vessel,
    insert_flag,
)


class TestInsertFlag:
    @pytest.mark.asyncio
    async def test_inserts_document_with_correct_fields(self):
        collection = MagicMock()
        inserted_oid = ObjectId()
        collection.insert_one = AsyncMock(return_value=MagicMock(inserted_id=inserted_oid))

        db = MagicMock()
        db.get_collection = MagicMock(return_value=collection)

        result = await insert_flag(db, "vessel-1", "user-1", "suspicious", "Off course")

        collection.insert_one.assert_called_once()
        inserted_doc = collection.insert_one.call_args[0][0]
        assert inserted_doc["vessel_id"] == "vessel-1"
        assert inserted_doc["user_id"] == "user-1"
        assert inserted_doc["flag"] == "suspicious"
        assert inserted_doc["comment"] == "Off course"
        assert "created_at" in inserted_doc
        assert isinstance(inserted_doc["created_at"], datetime)

        assert result["_id"] == inserted_oid
        assert result["vessel_id"] == "vessel-1"
        assert result["flag"] == "suspicious"

    @pytest.mark.asyncio
    async def test_inserts_with_empty_comment(self):
        collection = MagicMock()
        collection.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

        db = MagicMock()
        db.get_collection = MagicMock(return_value=collection)

        result = await insert_flag(db, "v1", "u1", "safe", "")
        inserted_doc = collection.insert_one.call_args[0][0]
        assert inserted_doc["comment"] == ""


class TestFetchFlagsByVessel:
    @pytest.mark.asyncio
    async def test_returns_documents_sorted_by_created_at_desc(self):
        cursor = MagicMock()
        cursor.sort = MagicMock(return_value=cursor)
        docs = [
            {"_id": ObjectId(), "vessel_id": "v1", "flag": "safe"},
            {"_id": ObjectId(), "vessel_id": "v1", "flag": "unsafe"},
        ]
        cursor.to_list = AsyncMock(return_value=docs)

        collection = MagicMock()
        collection.find = MagicMock(return_value=cursor)

        db = MagicMock()
        db.get_collection = MagicMock(return_value=collection)

        result = await fetch_flags_by_vessel(db, "v1")

        collection.find.assert_called_once_with({"vessel_id": "v1"})
        cursor.sort.assert_called_once_with("created_at", -1)
        assert len(result) == 2
        assert result[0]["flag"] == "safe"

    @pytest.mark.asyncio
    async def test_returns_empty_list_for_no_matches(self):
        cursor = MagicMock()
        cursor.sort = MagicMock(return_value=cursor)
        cursor.to_list = AsyncMock(return_value=[])

        collection = MagicMock()
        collection.find = MagicMock(return_value=cursor)

        db = MagicMock()
        db.get_collection = MagicMock(return_value=collection)

        result = await fetch_flags_by_vessel(db, "nonexistent")
        assert result == []


class TestDeleteFlagById:
    @pytest.mark.asyncio
    async def test_deletes_valid_object_id(self):
        collection = MagicMock()
        collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))

        db = MagicMock()
        db.get_collection = MagicMock(return_value=collection)

        oid = ObjectId()
        result = await delete_flag_by_id(db, str(oid))

        assert result is True
        collection.delete_one.assert_called_once_with({"_id": oid})

    @pytest.mark.asyncio
    async def test_returns_false_for_invalid_object_id(self):
        db = MagicMock()
        result = await delete_flag_by_id(db, "not-a-valid-oid")
        assert result is False

    @pytest.mark.asyncio
    async def test_returns_false_when_not_found(self):
        collection = MagicMock()
        collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=0))

        db = MagicMock()
        db.get_collection = MagicMock(return_value=collection)

        result = await delete_flag_by_id(db, str(ObjectId()))
        assert result is False
