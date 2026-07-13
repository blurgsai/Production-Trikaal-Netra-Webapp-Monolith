"""Unit tests for src.features.vessel_flags.models — Pydantic models and mapper."""
from datetime import datetime, timezone

import pytest
from bson import ObjectId

from src.features.vessel_flags.models import (
    VALID_FLAGS,
    VesselFlagCreateRequest,
    VesselFlagListResponse,
    VesselFlagResponse,
    map_flag_from_doc,
)


class TestVesselFlagCreateRequest:
    def test_valid_creation(self):
        req = VesselFlagCreateRequest(
            vessel_id="vessel-123",
            flag="suspicious",
            comment="Deviating from route",
        )
        assert req.vessel_id == "vessel-123"
        assert req.flag == "suspicious"
        assert req.comment == "Deviating from route"

    def test_default_comment_is_empty(self):
        req = VesselFlagCreateRequest(vessel_id="v1", flag="safe")
        assert req.comment == ""

    def test_missing_vessel_id_raises(self):
        with pytest.raises(Exception):
            VesselFlagCreateRequest(flag="safe")

    def test_missing_flag_raises(self):
        with pytest.raises(Exception):
            VesselFlagCreateRequest(vessel_id="v1")


class TestVesselFlagResponse:
    def test_valid_response(self):
        resp = VesselFlagResponse(
            id="abc123",
            vessel_id="v1",
            user_id="user-1",
            flag="unsafe",
            comment="Test comment",
            created_at="2024-01-15T10:30:00Z",
        )
        assert resp.id == "abc123"
        assert resp.vessel_id == "v1"
        assert resp.user_id == "user-1"
        assert resp.flag == "unsafe"
        assert resp.comment == "Test comment"
        assert resp.created_at == "2024-01-15T10:30:00Z"


class TestVesselFlagListResponse:
    def test_empty_list(self):
        resp = VesselFlagListResponse(success=True, data=[], total=0)
        assert resp.success is True
        assert resp.total == 0

    def test_with_data(self):
        flag = VesselFlagResponse(
            id="1",
            vessel_id="v1",
            user_id="u1",
            flag="safe",
            comment="ok",
            created_at="2024-01-15T10:00:00Z",
        )
        resp = VesselFlagListResponse(success=True, data=[flag], total=1)
        assert resp.total == 1
        assert resp.data[0].flag == "safe"


class TestValidFlags:
    def test_contains_expected_flags(self):
        assert "safe" in VALID_FLAGS
        assert "unsafe" in VALID_FLAGS
        assert "suspicious" in VALID_FLAGS
        assert "neutral" in VALID_FLAGS
        assert "unknown" in VALID_FLAGS

    def test_flag_count(self):
        assert len(VALID_FLAGS) == 5


class TestMapFlagFromDoc:
    def test_maps_full_document(self):
        oid = ObjectId("65f1a2b3c4d5e6f7a8b9c0d1")
        dt = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        doc = {
            "_id": oid,
            "vessel_id": "vessel-001",
            "user_id": "user-abc",
            "flag": "suspicious",
            "comment": "Off course",
            "created_at": dt,
        }
        result = map_flag_from_doc(doc)
        assert result["id"] == str(oid)
        assert result["vessel_id"] == "vessel-001"
        assert result["user_id"] == "user-abc"
        assert result["flag"] == "suspicious"
        assert result["comment"] == "Off course"
        assert result["created_at"] == dt.isoformat()

    def test_missing_comment_defaults_to_empty(self):
        doc = {
            "_id": ObjectId(),
            "vessel_id": "v1",
            "user_id": "u1",
            "flag": "safe",
            "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
        }
        result = map_flag_from_doc(doc)
        assert result["comment"] == ""

    def test_missing_flag_defaults_to_unknown(self):
        doc = {
            "_id": ObjectId(),
            "vessel_id": "v1",
            "user_id": "u1",
            "comment": "test",
            "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
        }
        result = map_flag_from_doc(doc)
        assert result["flag"] == "unknown"

    def test_missing_user_id_defaults_to_empty_string(self):
        doc = {
            "_id": ObjectId(),
            "vessel_id": "v1",
            "flag": "safe",
            "comment": "ok",
            "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
        }
        result = map_flag_from_doc(doc)
        assert result["user_id"] == ""

    def test_string_created_at_passes_through(self):
        doc = {
            "_id": ObjectId(),
            "vessel_id": "v1",
            "user_id": "u1",
            "flag": "safe",
            "comment": "",
            "created_at": "2024-01-15T10:00:00Z",
        }
        result = map_flag_from_doc(doc)
        assert result["created_at"] == "2024-01-15T10:00:00Z"

    def test_missing_created_at_uses_current_time(self):
        doc = {
            "_id": ObjectId(),
            "vessel_id": "v1",
            "user_id": "u1",
            "flag": "safe",
            "comment": "",
        }
        result = map_flag_from_doc(doc)
        assert "T" in result["created_at"]

    def test_object_id_is_stringified(self):
        oid = ObjectId()
        doc = {
            "_id": oid,
            "vessel_id": "v1",
            "user_id": "u1",
            "flag": "safe",
            "comment": "",
            "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
        }
        result = map_flag_from_doc(doc)
        assert result["id"] == str(oid)
        assert isinstance(result["id"], str)
