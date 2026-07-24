from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from features.groups.clients import (
    COLLECTION,
    GroupDocument,
    add_members_to_group,
    delete_group,
    fetch_all_groups,
    fetch_group,
    remove_members_from_group,
    upsert_group,
)
from features.groups.models import Group, MembersRequest, UpsertGroupRequest, map_group
from features.groups.services import (
    add_members,
    delete_group_service,
    get_group,
    list_groups,
    remove_members,
    upsert_group_service,
)
from shared.errors import NotFoundError


# ---------------------------------------------------------------------------
# GroupDocument
# ---------------------------------------------------------------------------

class TestGroupDocument:
    def test_from_full_doc(self):
        doc = {
            "_id": "abc123",
            "group_id": "team-alpha",
            "usernames": ["u1", "u2"],
            "metadata": {"dept": "engineering"},
            "created_at": datetime.now(timezone.utc),
        }
        gd = GroupDocument(doc)
        assert gd.id == "abc123"
        assert gd.group_id == "team-alpha"
        assert gd.usernames == ["u1", "u2"]
        assert gd.metadata == {"dept": "engineering"}

    def test_defaults(self):
        doc = {"_id": "abc123", "group_id": "team-alpha"}
        gd = GroupDocument(doc)
        assert gd.usernames == []
        assert gd.metadata == {}


# ---------------------------------------------------------------------------
# map_group
# ---------------------------------------------------------------------------

class TestMapGroup:
    def test_maps_correctly(self):
        now = datetime.now(timezone.utc)
        doc = GroupDocument({
            "_id": "abc",
            "group_id": "team-alpha",
            "usernames": ["u1"],
            "metadata": {},
            "created_at": now,
            "updated_at": now,
        })
        model = map_group(doc)
        assert isinstance(model, Group)
        assert model.id == "abc"
        assert model.group_id == "team-alpha"


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

class TestFetchGroup:
    @pytest.mark.asyncio
    async def test_returns_document_when_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value={"_id": "abc", "group_id": "team-alpha", "usernames": ["u1"]})
        result = await fetch_group(mock_db, "team-alpha")
        assert result is not None
        assert result.group_id == "team-alpha"

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value=None)
        result = await fetch_group(mock_db, "missing")
        assert result is None


class TestUpsertGroup:
    @pytest.mark.asyncio
    async def test_upserts_and_returns(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.update_one = AsyncMock(return_value=MagicMock())
        coll.find_one = AsyncMock(return_value={"_id": "abc", "group_id": "team-alpha", "usernames": ["u1"]})
        result = await upsert_group(mock_db, {"group_id": "team-alpha", "usernames": ["u1"]})
        assert result.group_id == "team-alpha"


class TestAddMembersToGroup:
    @pytest.mark.asyncio
    async def test_adds_and_returns(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.update_one = AsyncMock(return_value=MagicMock())
        coll.find_one = AsyncMock(return_value={"_id": "abc", "group_id": "team-alpha", "usernames": ["u1", "u2"]})
        result = await add_members_to_group(mock_db, "team-alpha", ["u2"])
        assert result.group_id == "team-alpha"


class TestRemoveMembersFromGroup:
    @pytest.mark.asyncio
    async def test_removes_and_returns(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.update_one = AsyncMock(return_value=MagicMock())
        coll.find_one = AsyncMock(return_value={"_id": "abc", "group_id": "team-alpha", "usernames": ["u1"]})
        result = await remove_members_from_group(mock_db, "team-alpha", ["u2"])
        assert result.group_id == "team-alpha"


class TestDeleteGroup:
    @pytest.mark.asyncio
    async def test_returns_true_when_deleted(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
        assert await delete_group(mock_db, "team-alpha") is True

    @pytest.mark.asyncio
    async def test_returns_false_when_not_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.delete_one = AsyncMock(return_value=MagicMock(deleted_count=0))
        assert await delete_group(mock_db, "missing") is False


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

class TestUpsertGroupService:
    @pytest.mark.asyncio
    async def test_creates_new(self, mock_db):
        with patch("features.groups.services.fetch_group", return_value=None):
            with patch("features.groups.services.upsert_group") as mock_upsert:
                now = datetime.now(timezone.utc)
                doc = GroupDocument({
                    "_id": "abc", "group_id": "team-alpha", "usernames": ["u1"],
                    "metadata": {}, "created_at": now, "updated_at": now,
                })
                mock_upsert.return_value = doc
                req = UpsertGroupRequest(group_id="team-alpha", usernames=["u1"])
                result = await upsert_group_service(mock_db, req)
                assert result.group_id == "team-alpha"

    @pytest.mark.asyncio
    async def test_updates_existing(self, mock_db):
        now = datetime.now(timezone.utc)
        existing = GroupDocument({
            "_id": "abc", "group_id": "team-alpha", "usernames": ["u1"],
            "metadata": {}, "created_at": now, "updated_at": now,
        })
        with patch("features.groups.services.fetch_group", return_value=existing):
            with patch("features.groups.services.upsert_group") as mock_upsert:
                updated = GroupDocument({
                    "_id": "abc", "group_id": "team-alpha", "usernames": ["u1", "u2"],
                    "metadata": {}, "created_at": now, "updated_at": now,
                })
                mock_upsert.return_value = updated
                req = UpsertGroupRequest(group_id="team-alpha", usernames=["u1", "u2"])
                result = await upsert_group_service(mock_db, req)
                assert result.usernames == ["u1", "u2"]


class TestGetGroup:
    @pytest.mark.asyncio
    async def test_raises_not_found(self, mock_db):
        with patch("features.groups.services.fetch_group", return_value=None):
            with pytest.raises(NotFoundError):
                await get_group(mock_db, "missing")

    @pytest.mark.asyncio
    async def test_returns_group(self, mock_db):
        now = datetime.now(timezone.utc)
        doc = GroupDocument({
            "_id": "abc", "group_id": "team-alpha", "usernames": ["u1"],
            "metadata": {}, "created_at": now, "updated_at": now,
        })
        with patch("features.groups.services.fetch_group", return_value=doc):
            result = await get_group(mock_db, "team-alpha")
            assert result.group_id == "team-alpha"


class TestListGroups:
    @pytest.mark.asyncio
    async def test_returns_list(self, mock_db):
        now = datetime.now(timezone.utc)
        docs = [
            GroupDocument({"_id": "a", "group_id": "g1", "usernames": ["u1"], "metadata": {}, "created_at": now, "updated_at": now}),
            GroupDocument({"_id": "b", "group_id": "g2", "usernames": ["u2"], "metadata": {}, "created_at": now, "updated_at": now}),
        ]
        with patch("features.groups.services.fetch_all_groups", return_value=docs):
            result = await list_groups(mock_db)
            assert len(result) == 2


class TestAddMembers:
    @pytest.mark.asyncio
    async def test_raises_not_found(self, mock_db):
        with patch("features.groups.services.add_members_to_group", return_value=None):
            with pytest.raises(NotFoundError):
                await add_members(mock_db, "missing", MembersRequest(usernames=["u1"]))

    @pytest.mark.asyncio
    async def test_adds_members(self, mock_db):
        now = datetime.now(timezone.utc)
        doc = GroupDocument({
            "_id": "abc", "group_id": "team-alpha", "usernames": ["u1", "u2"],
            "metadata": {}, "created_at": now, "updated_at": now,
        })
        with patch("features.groups.services.add_members_to_group", return_value=doc):
            result = await add_members(mock_db, "team-alpha", MembersRequest(usernames=["u2"]))
            assert result.usernames == ["u1", "u2"]


class TestRemoveMembers:
    @pytest.mark.asyncio
    async def test_raises_not_found(self, mock_db):
        with patch("features.groups.services.remove_members_from_group", return_value=None):
            with pytest.raises(NotFoundError):
                await remove_members(mock_db, "missing", MembersRequest(usernames=["u1"]))

    @pytest.mark.asyncio
    async def test_removes_members(self, mock_db):
        now = datetime.now(timezone.utc)
        doc = GroupDocument({
            "_id": "abc", "group_id": "team-alpha", "usernames": ["u1"],
            "metadata": {}, "created_at": now, "updated_at": now,
        })
        with patch("features.groups.services.remove_members_from_group", return_value=doc):
            result = await remove_members(mock_db, "team-alpha", MembersRequest(usernames=["u2"]))
            assert result.usernames == ["u1"]


class TestDeleteGroupService:
    @pytest.mark.asyncio
    async def test_raises_not_found(self, mock_db):
        with patch("features.groups.services.delete_group", return_value=False):
            with pytest.raises(NotFoundError):
                await delete_group_service(mock_db, "missing")

    @pytest.mark.asyncio
    async def test_deletes(self, mock_db):
        with patch("features.groups.services.delete_group", return_value=True):
            await delete_group_service(mock_db, "team-alpha")


# ---------------------------------------------------------------------------
# Missing edge cases
# ---------------------------------------------------------------------------

class TestIdempotentUpsert:
    @pytest.mark.asyncio
    async def test_updates_existing(self, mock_db):
        now = datetime.now(timezone.utc)
        existing = GroupDocument({
            "_id": "abc", "group_id": "team-alpha", "usernames": ["u1"],
            "metadata": {"old": "data"}, "created_at": now, "updated_at": now,
        })
        updated = GroupDocument({
            "_id": "abc", "group_id": "team-alpha", "usernames": ["u1", "u2"],
            "metadata": {"new": "data"}, "created_at": now, "updated_at": now,
        })
        with patch("features.groups.services.fetch_group", return_value=existing):
            with patch("features.groups.services.upsert_group", return_value=updated):
                req = UpsertGroupRequest(group_id="team-alpha", usernames=["u1", "u2"])
                result = await upsert_group_service(mock_db, req)
                assert result.usernames == ["u1", "u2"]


class TestAddDuplicateMember:
    @pytest.mark.asyncio
    async def test_no_duplicate_when_adding_existing(self, mock_db):
        now = datetime.now(timezone.utc)
        doc = GroupDocument({
            "_id": "abc", "group_id": "team-alpha", "usernames": ["u1", "u2"],
            "metadata": {}, "created_at": now, "updated_at": now,
        })
        with patch("features.groups.services.add_members_to_group", return_value=doc):
            result = await add_members(mock_db, "team-alpha", MembersRequest(usernames=["u1", "u2"]))
            assert "u1" in result.usernames
            assert "u2" in result.usernames
            assert len(result.usernames) == 2


class TestRemoveNonMember:
    @pytest.mark.asyncio
    async def test_graceful_when_removing_non_member(self, mock_db):
        now = datetime.now(timezone.utc)
        doc = GroupDocument({
            "_id": "abc", "group_id": "team-alpha", "usernames": ["u1"],
            "metadata": {}, "created_at": now, "updated_at": now,
        })
        with patch("features.groups.services.remove_members_from_group", return_value=doc):
            result = await remove_members(mock_db, "team-alpha", MembersRequest(usernames=["not-in-group"]))
            assert "u1" in result.usernames
            assert "not-in-group" not in result.usernames


class TestEmptyGroupAfterRemoves:
    @pytest.mark.asyncio
    async def test_group_with_empty_usernames(self, mock_db):
        now = datetime.now(timezone.utc)
        doc = GroupDocument({
            "_id": "abc", "group_id": "team-alpha", "usernames": [],
            "metadata": {}, "created_at": now, "updated_at": now,
        })
        with patch("features.groups.services.remove_members_from_group", return_value=doc):
            result = await remove_members(mock_db, "team-alpha", MembersRequest(usernames=["u1"]))
            assert result.usernames == []


# ---------------------------------------------------------------------------
# Missing client-layer tests
# ---------------------------------------------------------------------------

class TestFetchAllGroups:
    @pytest.mark.asyncio
    async def test_returns_all_groups(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("groups", data=[
            {"_id": "a", "group_id": "g1", "usernames": ["u1"], "metadata": {}, "created_at": None, "updated_at": None},
            {"_id": "b", "group_id": "g2", "usernames": ["u2"], "metadata": {}, "created_at": None, "updated_at": None},
        ])
        result = await fetch_all_groups(mock_db)
        assert len(result) == 2
        assert result[0].group_id == "g1"
        assert result[1].group_id == "g2"

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_groups(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("groups", data=[])
        result = await fetch_all_groups(mock_db)
        assert result == []


class TestUpsertGroupMetadata:
    @pytest.mark.asyncio
    async def test_overwrites_metadata(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.update_one = AsyncMock(return_value=MagicMock())
        coll.find_one = AsyncMock(return_value={
            "_id": "abc", "group_id": "team-alpha", "usernames": ["u1"],
            "metadata": {"new": "meta"}, "created_at": None, "updated_at": None,
        })
        result = await upsert_group(mock_db, {"group_id": "team-alpha", "usernames": ["u1"], "metadata": {"new": "meta"}})
        assert result.metadata == {"new": "meta"}


# ---------------------------------------------------------------------------
# Missing service-layer tests
# ---------------------------------------------------------------------------

class TestUpsertGroupWithMetadata:
    @pytest.mark.asyncio
    async def test_creates_group_with_metadata(self, mock_db):
        with patch("features.groups.services.fetch_group", return_value=None):
            with patch("features.groups.services.upsert_group") as mock_upsert:
                now = datetime.now(timezone.utc)
                doc = GroupDocument({
                    "_id": "abc", "group_id": "meta-group", "usernames": ["u1"],
                    "metadata": {"dept": "eng"}, "created_at": now, "updated_at": now,
                })
                mock_upsert.return_value = doc
                req = UpsertGroupRequest(group_id="meta-group", usernames=["u1"], metadata={"dept": "eng"})
                result = await upsert_group_service(mock_db, req)
                assert result.group_id == "meta-group"
                assert result.metadata == {"dept": "eng"}


class TestListGroupsEmpty:
    @pytest.mark.asyncio
    async def test_returns_empty_list(self, mock_db):
        with patch("features.groups.services.fetch_all_groups", return_value=[]):
            result = await list_groups(mock_db)
            assert result == []


class TestLargeGroupMembership:
    @pytest.mark.asyncio
    async def test_upserts_many_members(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.update_one = AsyncMock(return_value=MagicMock())
        many_ids = [f"u{i}" for i in range(150)]
        coll.find_one = AsyncMock(return_value={
            "_id": "abc", "group_id": "big-group", "usernames": many_ids,
            "metadata": {}, "created_at": None, "updated_at": None,
        })
        result = await upsert_group(mock_db, {"group_id": "big-group", "usernames": many_ids})
        assert len(result.usernames) == 150
