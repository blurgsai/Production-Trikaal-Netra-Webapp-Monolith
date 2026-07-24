from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from features.admin.services import (
    get_all_groups_with_stats,
    get_dashboard_stats,
    get_group_detail,
    get_known_users,
)


class _AsyncIter:
    def __init__(self, items):
        self._items = items
        self._idx = 0

    def __aiter__(self):
        self._idx = 0
        return self

    async def __anext__(self):
        if self._idx >= len(self._items):
            raise StopAsyncIteration
        item = self._items[self._idx]
        self._idx += 1
        return item


class _MockCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *args):
        return self

    def skip(self, n):
        return self

    def limit(self, n):
        return self

    def __aiter__(self):
        return _AsyncIter(self._docs).__aiter__()


class _FakeCollection:
    def __init__(self, docs=None, counts=None, aggregates=None):
        self._docs = docs or []
        self._counts = counts or {}
        self._aggregates = aggregates or []

    async def find_one(self, query):
        for doc in self._docs:
            if all(doc.get(k) == v for k, v in query.items() if not k.startswith("$")):
                return doc
        return None

    async def count_documents(self, query):
        return self._counts.get("default", 0)

    def find(self, query):
        return _MockCursor(self._docs)

    def aggregate(self, pipeline):
        return _MockCursor(self._aggregates)


class TestGetKnownClients:
    @pytest.mark.asyncio
    async def test_aggregates(self, mock_db):
        notif_coll = _FakeCollection(aggregates=[
            {"_id": "u1", "total_notifications": 5, "total_notifications": 5, "last_notification": datetime.now(timezone.utc)},
            {"_id": "u2", "total_notifications": 3, "total_notifications": 3, "last_notification": None},
        ])
        users_coll = _FakeCollection(docs=[
            {"_id": "a", "username": "u1", "display_name": "User One", "email": None, "is_active": True, "created_at": None},
            {"_id": "b", "username": "u2", "display_name": None, "email": "u2@example.com", "is_active": True, "created_at": None},
        ])
        mock_db._collections["notifications"] = notif_coll
        mock_db._collections["users"] = users_coll

        result = await get_known_users(mock_db)
        assert len(result) == 2
        assert result[0]["username"] == "u1"
        assert result[0]["total_notifications"] == 5
        assert result[1]["email"] == "u2@example.com"


class TestGetAllGroupsWithStats:
    @pytest.mark.asyncio
    async def test_returns_groups(self, mock_db):
        coll = _FakeCollection(docs=[
            {"_id": "a", "group_id": "g1", "usernames": ["u1", "u2"], "metadata": {}, "created_at": None, "updated_at": None},
            {"_id": "b", "group_id": "g2", "usernames": ["u3"], "metadata": {}, "created_at": None, "updated_at": None},
        ])
        mock_db._collections["groups"] = coll

        result = await get_all_groups_with_stats(mock_db)
        assert len(result) == 2
        assert result[0]["group_id"] == "g1"
        assert result[0]["member_count"] == 2


class TestGetGroupDetail:
    @pytest.mark.asyncio
    async def test_returns_group(self, mock_db):
        coll = _FakeCollection(docs=[
            {"_id": "a", "group_id": "g1", "usernames": ["u1"], "metadata": {"dept": "eng"}, "created_at": None, "updated_at": None},
        ])
        mock_db._collections["groups"] = coll
        result = await get_group_detail(mock_db, "g1")
        assert result is not None
        assert result["group_id"] == "g1"
        assert result["member_count"] == 1
        assert result["metadata"] == {"dept": "eng"}

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        coll = _FakeCollection(docs=[])
        mock_db._collections["groups"] = coll
        result = await get_group_detail(mock_db, "missing")
        assert result is None


class TestGetDashboardStats:
    @pytest.mark.asyncio
    async def test_returns_counts(self, mock_db):
        notif_data_coll = _FakeCollection(counts={"default": 8})
        user_notif_coll = _FakeCollection(
            counts={"default": 10},
            aggregates=[{"total": 5}],
        )
        groups_coll = _FakeCollection(counts={"default": 3})
        topics_coll = _FakeCollection(counts={"default": 2})

        mock_db._collections["notification_data"] = notif_data_coll
        mock_db._collections["notifications"] = user_notif_coll
        mock_db._collections["groups"] = groups_coll
        mock_db._collections["topic_configs"] = topics_coll

        result = await get_dashboard_stats(mock_db)
        assert result["total_notification_data"] == 8
        assert result["total_user_notifications"] == 10
        assert result["total_groups"] == 3
        assert result["total_topics"] == 2
        assert result["total_users"] == 5

    @pytest.mark.asyncio
    async def test_zero_when_no_data(self, mock_db):
        notif_data_coll = _FakeCollection(counts={"default": 0})
        user_notif_coll = _FakeCollection(counts={"default": 0}, aggregates=[])
        groups_coll = _FakeCollection(counts={"default": 0})
        topics_coll = _FakeCollection(counts={"default": 0})

        mock_db._collections["notification_data"] = notif_data_coll
        mock_db._collections["notifications"] = user_notif_coll
        mock_db._collections["groups"] = groups_coll
        mock_db._collections["topic_configs"] = topics_coll

        result = await get_dashboard_stats(mock_db)
        assert result["total_user_notifications"] == 0
        assert result["total_users"] == 0

    @pytest.mark.asyncio
    async def test_prefers_users_count_over_aggregate(self, mock_db):
        notif_data_coll = _FakeCollection(counts={"default": 5})
        user_notif_coll = _FakeCollection(counts={"default": 10}, aggregates=[{"total": 3}])
        groups_coll = _FakeCollection(counts={"default": 2})
        topics_coll = _FakeCollection(counts={"default": 1})
        users_coll = _FakeCollection(counts={"default": 7})

        mock_db._collections["notification_data"] = notif_data_coll
        mock_db._collections["notifications"] = user_notif_coll
        mock_db._collections["groups"] = groups_coll
        mock_db._collections["topic_configs"] = topics_coll
        mock_db._collections["users"] = users_coll

        result = await get_dashboard_stats(mock_db)
        assert result["total_users"] == 7


class TestGetKnownClientsEdgeCases:
    @pytest.mark.asyncio
    async def test_empty_users_returns_empty(self, mock_db):
        notif_coll = _FakeCollection(aggregates=[])
        users_coll = _FakeCollection(docs=[])
        mock_db._collections["notifications"] = notif_coll
        mock_db._collections["users"] = users_coll
        result = await get_known_users(mock_db)
        assert result == []

    @pytest.mark.asyncio
    async def test_user_with_no_notifications(self, mock_db):
        notif_coll = _FakeCollection(aggregates=[])
        users_coll = _FakeCollection(docs=[
            {"_id": "a", "username": "u1", "display_name": "User", "email": None, "is_active": True, "created_at": None},
        ])
        mock_db._collections["notifications"] = notif_coll
        mock_db._collections["users"] = users_coll
        result = await get_known_users(mock_db)
        assert len(result) == 1
        assert result[0]["total_notifications"] == 0
        assert result[0]["last_notification"] is None

    @pytest.mark.asyncio
    async def test_inactive_user_included(self, mock_db):
        notif_coll = _FakeCollection(aggregates=[])
        users_coll = _FakeCollection(docs=[
            {"_id": "a", "username": "u1", "display_name": None, "email": None, "is_active": False, "created_at": None},
        ])
        mock_db._collections["notifications"] = notif_coll
        mock_db._collections["users"] = users_coll
        result = await get_known_users(mock_db)
        assert len(result) == 1
        assert result[0]["is_active"] is False


class TestGetAllGroupsWithStatsEmpty:
    @pytest.mark.asyncio
    async def test_returns_empty_when_no_groups(self, mock_db):
        coll = _FakeCollection(docs=[])
        mock_db._collections["groups"] = coll
        result = await get_all_groups_with_stats(mock_db)
        assert result == []


class TestGetGroupDetailMetadata:
    @pytest.mark.asyncio
    async def test_returns_metadata(self, mock_db):
        coll = _FakeCollection(docs=[
            {"_id": "a", "group_id": "g1", "usernames": ["u1"], "metadata": {"region": "eu-west"}, "created_at": None, "updated_at": None},
        ])
        mock_db._collections["groups"] = coll
        result = await get_group_detail(mock_db, "g1")
        assert result is not None
        assert result["metadata"] == {"region": "eu-west"}
