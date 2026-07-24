from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from features.notifications.clients import NotificationDataDocument
from features.notifications.models import SendNotificationRequest
from features.topics.clients import (
    COLLECTION,
    TopicConfigDocument,
    delete_topic_config,
    fetch_all_topic_configs,
    fetch_topic_config,
    insert_topic_config,
    update_topic_config,
)
from features.topics.models import (
    Channel,
    CreateTopicConfigRequest,
    TopicConfig,
    UpdateTopicConfigRequest,
    map_topic_config,
)
from features.topics.services import (
    create_topic_config,
    delete_topic_config_service,
    get_topic_config,
    list_topic_configs,
    update_topic_config_service,
)
from shared.errors import ConflictError, NotFoundError


# ---------------------------------------------------------------------------
# TopicConfigDocument
# ---------------------------------------------------------------------------

class TestTopicConfigDocument:
    def test_from_full_doc(self):
        doc = {
            "_id": "abc123",
            "topic": "alerts",
            "channels": ["websocket", "email"],
            "email_template": "Hello",
            "metadata": {"priority": "high"},
            "created_at": datetime.now(timezone.utc),
        }
        tcd = TopicConfigDocument(doc)
        assert tcd.id == "abc123"
        assert tcd.topic == "alerts"
        assert tcd.channels == ["websocket", "email"]
        assert tcd.email_template == "Hello"
        assert tcd.metadata == {"priority": "high"}

    def test_defaults(self):
        doc = {"_id": "abc123", "topic": "alerts", "channels": ["websocket"]}
        tcd = TopicConfigDocument(doc)
        assert tcd.email_template is None
        assert tcd.metadata == {}
        assert tcd.storage_collection == "notifications"


# ---------------------------------------------------------------------------
# map_topic_config
# ---------------------------------------------------------------------------

class TestMapTopicConfig:
    def test_maps_correctly(self):
        now = datetime.now(timezone.utc)
        doc = TopicConfigDocument({
            "_id": "abc123",
            "topic": "alerts",
            "channels": ["websocket"],
            "email_template": None,
            "email_subject_template": None,
            "metadata": {},
            "storage_uri": None,
            "storage_db": None,
            "storage_collection": "notifications",
            "smtp_host": None,
            "smtp_port": None,
            "smtp_user": None,
            "smtp_password": None,
            "smtp_from": None,
            "smtp_tls": None,
            "created_at": now,
            "updated_at": now,
        })
        model = map_topic_config(doc)
        assert isinstance(model, TopicConfig)
        assert model.id == "abc123"
        assert model.topic == "alerts"
        assert model.channels == [Channel.websocket]


# ---------------------------------------------------------------------------
# Clients (with mock DB)
# ---------------------------------------------------------------------------

class TestFetchTopicConfig:
    @pytest.mark.asyncio
    async def test_returns_document_when_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value={"_id": "abc", "topic": "alerts", "channels": ["websocket"]})
        result = await fetch_topic_config(mock_db, "alerts")
        assert result is not None
        assert result.topic == "alerts"
        coll.find_one.assert_called_once_with({"topic": "alerts"})

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.find_one = AsyncMock(return_value=None)
        result = await fetch_topic_config(mock_db, "missing")
        assert result is None


class TestInsertTopicConfig:
    @pytest.mark.asyncio
    async def test_inserts_and_returns(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.insert_one = AsyncMock(return_value=MagicMock(inserted_id="abc"))
        coll.find_one = AsyncMock(return_value={"_id": "abc", "topic": "alerts", "channels": ["websocket"]})
        result = await insert_topic_config(mock_db, {"topic": "alerts", "channels": ["websocket"]})
        assert result.topic == "alerts"


class TestDeleteTopicConfig:
    @pytest.mark.asyncio
    async def test_returns_true_when_deleted(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
        assert await delete_topic_config(mock_db, "alerts") is True

    @pytest.mark.asyncio
    async def test_returns_false_when_not_found(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.delete_one = AsyncMock(return_value=MagicMock(deleted_count=0))
        assert await delete_topic_config(mock_db, "missing") is False


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

class TestGetTopicConfig:
    @pytest.mark.asyncio
    async def test_raises_not_found(self, mock_db):
        with patch("features.topics.services.fetch_topic_config", return_value=None):
            with pytest.raises(NotFoundError):
                await get_topic_config(mock_db, "missing")

    @pytest.mark.asyncio
    async def test_returns_mapped_doc(self, mock_db):
        now = datetime.now(timezone.utc)
        doc = TopicConfigDocument({
            "_id": "abc", "topic": "alerts", "channels": ["websocket"],
            "created_at": now, "updated_at": now,
        })
        with patch("features.topics.services.fetch_topic_config", return_value=doc):
            result = await get_topic_config(mock_db, "alerts")
            assert result.topic == "alerts"


class TestListTopicConfigs:
    @pytest.mark.asyncio
    async def test_returns_list(self, mock_db):
        now = datetime.now(timezone.utc)
        docs = [
            TopicConfigDocument({"_id": "a", "topic": "alerts", "channels": ["websocket"], "created_at": now, "updated_at": now}),
            TopicConfigDocument({"_id": "b", "topic": "news", "channels": ["email"], "created_at": now, "updated_at": now}),
        ]
        with patch("features.topics.services.fetch_all_topic_configs", return_value=docs):
            result = await list_topic_configs(mock_db)
            assert len(result) == 2
            assert result[0].topic == "alerts"
            assert result[1].topic == "news"


class TestCreateTopicConfig:
    @pytest.mark.asyncio
    async def test_raises_conflict_when_exists(self, mock_db):
        now = datetime.now(timezone.utc)
        existing = TopicConfigDocument({"_id": "a", "topic": "alerts", "channels": ["websocket"], "created_at": now, "updated_at": now})
        with patch("features.topics.services.fetch_topic_config", return_value=existing):
            req = CreateTopicConfigRequest(topic="alerts", channels=[Channel.websocket])
            with pytest.raises(ConflictError):
                await create_topic_config(mock_db, req)

    @pytest.mark.asyncio
    async def test_creates_new(self, mock_db):
        with patch("features.topics.services.fetch_topic_config", return_value=None):
            with patch("features.topics.services.insert_topic_config") as mock_insert:
                now = datetime.now(timezone.utc)
                doc = TopicConfigDocument({
                    "_id": "a", "topic": "alerts", "channels": ["websocket"],
                    "created_at": now, "updated_at": now,
                })
                mock_insert.return_value = doc
                req = CreateTopicConfigRequest(topic="alerts", channels=[Channel.websocket])
                result = await create_topic_config(mock_db, req)
                assert result.topic == "alerts"
                assert result.channels == [Channel.websocket]


class TestUpdateTopicConfigService:
    @pytest.mark.asyncio
    async def test_raises_not_found(self, mock_db):
        with patch("features.topics.services.fetch_topic_config", return_value=None):
            req = UpdateTopicConfigRequest(channels=[Channel.email])
            with pytest.raises(NotFoundError):
                await update_topic_config_service(mock_db, "missing", req)

    @pytest.mark.asyncio
    async def test_updates_fields(self, mock_db):
        now = datetime.now(timezone.utc)
        existing = TopicConfigDocument({
            "_id": "a", "topic": "alerts", "channels": ["websocket"],
            "created_at": now, "updated_at": now,
        })
        with patch("features.topics.services.fetch_topic_config", return_value=existing):
            with patch("features.topics.services.update_topic_config") as mock_update:
                updated = TopicConfigDocument({
                    "_id": "a", "topic": "alerts", "channels": ["email"],
                    "created_at": now, "updated_at": now,
                })
                mock_update.return_value = updated
                req = UpdateTopicConfigRequest(channels=[Channel.email])
                result = await update_topic_config_service(mock_db, "alerts", req)
                assert result.channels == [Channel.email]


class TestDeleteTopicConfigService:
    @pytest.mark.asyncio
    async def test_raises_not_found(self, mock_db):
        with patch("features.topics.services.delete_topic_config", return_value=False):
            with pytest.raises(NotFoundError):
                await delete_topic_config_service(mock_db, "missing")

    @pytest.mark.asyncio
    async def test_deletes_successfully(self, mock_db):
        with patch("features.topics.services.delete_topic_config", return_value=True):
            await delete_topic_config_service(mock_db, "alerts")


from unittest.mock import patch


# ---------------------------------------------------------------------------
# Missing client-layer tests
# ---------------------------------------------------------------------------

class TestFetchAllTopicConfigs:
    @pytest.mark.asyncio
    async def test_returns_all(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("topic_configs", data=[
            {"_id": "a", "topic": "alerts", "channels": ["websocket"], "created_at": None, "updated_at": None},
            {"_id": "b", "topic": "news", "channels": ["email"], "created_at": None, "updated_at": None},
        ])
        result = await fetch_all_topic_configs(mock_db)
        assert len(result) == 2
        assert result[0].topic == "alerts"

    @pytest.mark.asyncio
    async def test_returns_empty_when_none(self, mock_db):
        from tests.conftest import MockCollection
        mock_db._collections[COLLECTION] = MockCollection("topic_configs", data=[])
        result = await fetch_all_topic_configs(mock_db)
        assert result == []


class TestUpdateTopicConfig:
    @pytest.mark.asyncio
    async def test_updates_and_returns(self, mock_db):
        coll = mock_db._collections[COLLECTION] = MagicMock()
        coll.update_one = AsyncMock(return_value=MagicMock())
        coll.find_one = AsyncMock(return_value={
            "_id": "abc", "topic": "alerts", "channels": ["email"],
            "email_template": "T", "email_subject_template": "S",
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": "h",
            "smtp_port": 25, "smtp_user": "u", "smtp_password": "p",
            "smtp_from": "f", "smtp_tls": False,
            "created_at": None, "updated_at": None,
        })
        result = await update_topic_config(mock_db, "alerts", {"channels": ["email"]})
        assert result.topic == "alerts"
        assert result.channels == [Channel.email]


class TestTopicConfigDocumentCustomStorage:
    def test_custom_storage_fields(self):
        now = datetime.now(timezone.utc)
        doc = TopicConfigDocument({
            "_id": "abc", "topic": "alerts", "channels": ["websocket"],
            "storage_uri": "mongodb://custom:27017", "storage_db": "custom_db",
            "storage_collection": "custom_notifs", "created_at": now, "updated_at": now,
        })
        assert doc.storage_uri == "mongodb://custom:27017"
        assert doc.storage_db == "custom_db"
        assert doc.storage_collection == "custom_notifs"


# ---------------------------------------------------------------------------
# Missing service-layer tests
# ---------------------------------------------------------------------------

class TestCreateTopicBothChannels:
    @pytest.mark.asyncio
    async def test_creates_with_ws_and_email(self, mock_db):
        with patch("features.topics.services.fetch_topic_config", return_value=None):
            with patch("features.topics.services.insert_topic_config") as mock_insert:
                now = datetime.now(timezone.utc)
                doc = TopicConfigDocument({
                    "_id": "a", "topic": "alerts", "channels": ["websocket", "email"],
                    "created_at": now, "updated_at": now,
                })
                mock_insert.return_value = doc
                req = CreateTopicConfigRequest(topic="alerts", channels=[Channel.websocket, Channel.email])
                result = await create_topic_config(mock_db, req)
                assert result.channels == [Channel.websocket, Channel.email]


class TestTopicEmailNoSmtp:
    @pytest.mark.asyncio
    async def test_email_attempted_but_not_delivered_without_smtp(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["email"],
            "email_template": "<html>$body</html>", "email_subject_template": "$topic",
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": None,
            "smtp_port": None, "smtp_user": None, "smtp_password": None,
            "smtp_from": None, "smtp_tls": None,
            "created_at": now, "updated_at": now,
        })
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.insert_notification_data") as mock_insert:
                mock_insert.return_value = NotificationDataDocument({
                    "_id": "n1", "topic": "alerts",
                    "body": "hello", "channels_attempted": [], "channels_delivered": [],
                    "created_at": now, "updated_at": now,
                })
                with patch("features.notifications.services.insert_user_notifications"):
                    with patch("features.notifications.services.send_topic_email", return_value=[]) as mock_email:
                        with patch("features.notifications.services.fetch_user", return_value=MagicMock(email="u1@example.com")):
                            from features.notifications.services import send_notification
                            req = SendNotificationRequest(topic="alerts", body="hello", usernames=["u1"])
                            result = await send_notification(mock_db, req)
                            assert "email" in result.channels_attempted
                            assert "email" not in result.channels_delivered


class TestUpdateTopicRemovesChannel:
    @pytest.mark.asyncio
    async def test_removes_websocket_channel(self, mock_db):
        now = datetime.now(timezone.utc)
        existing = TopicConfigDocument({
            "_id": "a", "topic": "alerts", "channels": ["websocket", "email"],
            "created_at": now, "updated_at": now,
        })
        with patch("features.topics.services.fetch_topic_config", return_value=existing):
            with patch("features.topics.services.update_topic_config") as mock_update:
                updated = TopicConfigDocument({
                    "_id": "a", "topic": "alerts", "channels": ["email"],
                    "created_at": now, "updated_at": now,
                })
                mock_update.return_value = updated
                req = UpdateTopicConfigRequest(channels=[Channel.email])
                result = await update_topic_config_service(mock_db, "alerts", req)
                assert result.channels == [Channel.email]


class TestListTopicConfigsEmpty:
    @pytest.mark.asyncio
    async def test_returns_empty_list(self, mock_db):
        with patch("features.topics.services.fetch_all_topic_configs", return_value=[]):
            result = await list_topic_configs(mock_db)
            assert result == []
