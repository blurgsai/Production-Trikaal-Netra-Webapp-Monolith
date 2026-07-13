"""Integration tests for vessel_flags feature.

Three levels per the backend integration testing guide:
  1. Router ↔ Service — mock client functions, let router + service + mapper run real
  2. Service ↔ Client — mock MongoDB collections, let service + client + mapper run real
  3. Full Pipeline     — mock get_db, let TestClient → Router → Service → Client → Mapper → response_model run real
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from src.main import app
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db


def _mock_current_user():
    return {"_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"), "username": "testuser", "role": "user"}


# ── Shared fixtures ──


@pytest.fixture
def flag_oid():
    return ObjectId("65f1a2b3c4d5e6f7a8b9c0d1")


@pytest.fixture
def raw_flag_doc(flag_oid):
    return {
        "_id": flag_oid,
        "vessel_id": "vessel-001",
        "user_id": str(_mock_current_user()["_id"]),
        "flag": "suspicious",
        "comment": "Vessel deviating from expected route",
        "created_at": datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc),
    }


@pytest.fixture
def mock_db(raw_flag_doc):
    """A mocked Motor MongoDB database for vessel_flags collection."""
    db = MagicMock()
    collection = MagicMock()

    # Configure insert_one
    collection.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id=raw_flag_doc["_id"])
    )

    # Configure find + cursor chain
    cursor = MagicMock()
    cursor.sort = MagicMock(return_value=cursor)
    cursor.to_list = AsyncMock(return_value=[raw_flag_doc])
    collection.find = MagicMock(return_value=cursor)

    # Configure delete_one
    collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))

    db.get_collection = MagicMock(return_value=collection)
    db._collection = collection
    db._cursor = cursor
    return db


@pytest.fixture
def client_with_mock_db(mock_db):
    """TestClient with get_db overridden to return our mock_db."""
    def override():
        return mock_db
    app.dependency_overrides[get_db] = override
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
    """RS-level: verify router → service → mapper → response_model pipeline."""

    @pytest.mark.integration
    def test_rs01_post_flag_returns_201_with_mapped_fields(self, client_with_mock_db, raw_flag_doc):
        with patch(
            "src.features.vessel_flags.services.insert_flag",
            new_callable=AsyncMock,
            return_value=raw_flag_doc,
        ):
            resp = client_with_mock_db.post(
                "/vessel-flags",
                json={
                    "vessel_id": "vessel-001",
                    "flag": "suspicious",
                    "comment": "Vessel deviating from expected route",
                },
            )
            assert resp.status_code == 201
            body = resp.json()
            assert body["vessel_id"] == "vessel-001"
            assert body["flag"] == "suspicious"
            assert body["comment"] == "Vessel deviating from expected route"
            assert body["user_id"] == str(_mock_current_user()["_id"])
            assert "created_at" in body
            assert "id" in body

    @pytest.mark.integration
    def test_rs02_get_flags_returns_200_with_list(self, client_with_mock_db, raw_flag_doc):
        mapped = {
            "id": str(raw_flag_doc["_id"]),
            "vessel_id": raw_flag_doc["vessel_id"],
            "user_id": raw_flag_doc["user_id"],
            "flag": raw_flag_doc["flag"],
            "comment": raw_flag_doc["comment"],
            "created_at": raw_flag_doc["created_at"].isoformat(),
        }
        with patch(
            "src.features.vessel_flags.services.fetch_flags_by_vessel",
            new_callable=AsyncMock,
            return_value=[raw_flag_doc],
        ):
            resp = client_with_mock_db.get("/vessel-flags/vessel-001")
            assert resp.status_code == 200
            body = resp.json()
            assert body["success"] is True
            assert body["total"] == 1
            assert body["data"][0]["flag"] == "suspicious"

    @pytest.mark.integration
    def test_rs03_delete_flag_returns_204(self, client_with_mock_db):
        with patch(
            "src.features.vessel_flags.services.delete_flag_by_id",
            new_callable=AsyncMock,
            return_value=True,
        ):
            resp = client_with_mock_db.delete(f"/vessel-flags/{ObjectId()}")
            assert resp.status_code == 204

    @pytest.mark.integration
    def test_rs04_invalid_flag_returns_400(self, client_with_mock_db):
        with patch(
            "src.features.vessel_flags.services.insert_flag",
            new_callable=AsyncMock,
        ):
            resp = client_with_mock_db.post(
                "/vessel-flags",
                json={"vessel_id": "v1", "flag": "malicious", "comment": ""},
            )
            assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════
# Level 2: Service ↔ Client Integration
#   Mock: MongoDB collections (MagicMock)
#   Real: Service → Client → Mapper
# ═══════════════════════════════════════════════════════════════════════════


class TestServiceClientIntegration:
    """SC-level: verify service → client → mapper pipeline with mocked MongoDB."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc01_create_flag_inserts_and_maps(self, mock_db, raw_flag_doc):
        from src.features.vessel_flags.services import create_flag

        result = await create_flag(
            mock_db,
            "vessel-001",
            str(_mock_current_user()["_id"]),
            "suspicious",
            "Vessel deviating from expected route",
        )
        mock_db._collection.insert_one.assert_called_once()
        assert result["vessel_id"] == "vessel-001"
        assert result["flag"] == "suspicious"
        assert result["comment"] == "Vessel deviating from expected route"
        assert result["id"] == str(raw_flag_doc["_id"])

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc02_list_flags_fetches_and_maps(self, mock_db, raw_flag_doc):
        from src.features.vessel_flags.services import list_flags

        result = await list_flags(mock_db, "vessel-001")
        mock_db._collection.find.assert_called_once_with({"vessel_id": "vessel-001"})
        assert len(result) == 1
        assert result[0]["flag"] == "suspicious"
        assert result[0]["vessel_id"] == "vessel-001"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc03_remove_flag_deletes_from_collection(self, mock_db):
        from src.features.vessel_flags.services import remove_flag

        result = await remove_flag(mock_db, str(ObjectId()))
        assert result is True
        mock_db._collection.delete_one.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════════
# Level 3: Full Pipeline Integration
#   Mock: get_db (returns mock_db with mocked MongoDB collection)
#   Real: TestClient → Router → Service → Client → Mapper → response_model
# ═══════════════════════════════════════════════════════════════════════════


class TestFullPipelineIntegration:
    """FP-level: full pipeline with only MongoDB mocked."""

    @pytest.mark.integration
    def test_fp01_create_flag_full_pipeline(self, client_with_mock_db, mock_db, raw_flag_doc):
        """POST /vessel-flags → router → service → client (insert) → mapper → 201 response."""
        mock_db._collection.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=raw_flag_doc["_id"])
        )
        # insert_flag adds _id to the doc it constructed, so we need insert_one
        # to return the inserted_id; the service then calls map_flag_from_doc
        # on the doc that was passed to insert_one (with _id added).

        resp = client_with_mock_db.post(
            "/vessel-flags",
            json={
                "vessel_id": "vessel-001",
                "flag": "suspicious",
                "comment": "Vessel deviating from expected route",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["vessel_id"] == "vessel-001"
        assert body["flag"] == "suspicious"
        assert body["comment"] == "Vessel deviating from expected route"
        assert body["user_id"] == str(_mock_current_user()["_id"])
        assert "id" in body
        assert "created_at" in body

    @pytest.mark.integration
    def test_fp02_get_flags_full_pipeline(self, client_with_mock_db, mock_db, raw_flag_doc):
        """GET /vessel-flags/{vessel_id} → router → service → client (find) → mapper → 200 response."""
        cursor = MagicMock()
        cursor.sort = MagicMock(return_value=cursor)
        cursor.to_list = AsyncMock(return_value=[raw_flag_doc])
        mock_db._collection.find = MagicMock(return_value=cursor)

        resp = client_with_mock_db.get("/vessel-flags/vessel-001")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["total"] == 1
        assert body["data"][0]["vessel_id"] == "vessel-001"
        assert body["data"][0]["flag"] == "suspicious"
        assert body["data"][0]["user_id"] == raw_flag_doc["user_id"]

    @pytest.mark.integration
    def test_fp03_delete_flag_full_pipeline(self, client_with_mock_db, mock_db):
        """DELETE /vessel-flags/{flag_id} → router → service → client (delete_one) → 204 response."""
        mock_db._collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))

        resp = client_with_mock_db.delete(f"/vessel-flags/{ObjectId()}")
        assert resp.status_code == 204

    @pytest.mark.integration
    def test_fp04_delete_nonexistent_flag_returns_404(self, client_with_mock_db, mock_db):
        mock_db._collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=0))

        resp = client_with_mock_db.delete(f"/vessel-flags/{ObjectId()}")
        assert resp.status_code == 404

    @pytest.mark.integration
    def test_fp05_invalid_flag_value_rejected_by_service(self, client_with_mock_db):
        """Full pipeline validates flag value through service layer."""
        resp = client_with_mock_db.post(
            "/vessel-flags",
            json={"vessel_id": "v1", "flag": "malicious", "comment": "bad"},
        )
        assert resp.status_code == 400
        assert "Invalid flag" in resp.json()["detail"]

    @pytest.mark.integration
    def test_fp06_flag_options_endpoint(self, client_with_mock_db):
        """GET /vessel-flags/meta/options returns all valid flags."""
        resp = client_with_mock_db.get("/vessel-flags/meta/options")
        assert resp.status_code == 200
        flags = resp.json()["flags"]
        assert set(flags) == {"safe", "unsafe", "suspicious", "neutral", "unknown"}

    @pytest.mark.integration
    def test_fp07_empty_comment_allowed(self, client_with_mock_db, mock_db, raw_flag_doc):
        """POST with empty comment should succeed — comment is optional."""
        mock_db._collection.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=raw_flag_doc["_id"])
        )

        resp = client_with_mock_db.post(
            "/vessel-flags",
            json={"vessel_id": "vessel-001", "flag": "safe", "comment": ""},
        )
        assert resp.status_code == 201
        assert resp.json()["comment"] == ""
