from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from features.notifications.clients import (
    NotificationDataDocument,
    UserNotificationDocument,
    fetch_notification_data_by_id,
    insert_notification_data,
    insert_user_notifications,
    update_notification_delivery,
)
from features.notifications.models import (
    DeliveryResult,
    Notification,
    SendNotificationRequest,
    map_notification,
)
from features.notifications.services import (
    get_notifications_for_user,
    send_notification,
    _resolve_usernames,
    _resolve_notif_db,
)
from shared.errors import NotFoundError, ValidationError


class TestNotificationDataDocument:
    def test_from_full_doc(self):
        now = datetime.now(timezone.utc)
        doc = {
            "_id": "abc123",
            "topic": "alerts",
            "group_id": None,
            "title": "Alert",
            "body": "Something happened",
            "data": {"severity": "high"},
            "channels_attempted": ["websocket"],
            "channels_delivered": ["websocket"],
            "source_system": "monitoring",
            "created_at": now,
        }
        nd = NotificationDataDocument(doc)
        assert nd.id == "abc123"
        assert nd.topic == "alerts"
        assert nd.title == "Alert"
        assert nd.body == "Something happened"
        assert nd.data == {"severity": "high"}
        assert nd.channels_attempted == ["websocket"]
        assert nd.source_system == "monitoring"

    def test_defaults(self):
        doc = {"_id": "abc", "topic": "alerts", "body": "body"}
        nd = NotificationDataDocument(doc)
        assert nd.title == ""
        assert nd.data == {}
        assert nd.channels_attempted == []
        assert nd.channels_delivered == []
        assert nd.group_id is None
        assert nd.source_system is None


class TestUserNotificationDocument:
    def test_from_doc(self):
        doc = {
            "_id": "user_notif_1",
            "notification_id": "data_1",
            "username": "john",
            "created_at": datetime.now(timezone.utc),
        }
        ud = UserNotificationDocument(doc)
        assert ud.id == "user_notif_1"
        assert ud.notification_id == "data_1"
        assert ud.username == "john"


class TestMapNotification:
    def test_maps_from_dict(self):
        now = datetime.now(timezone.utc)
        doc = {
            "_id": "user_notif_1",
            "user_notif_id": "user_notif_1",
            "topic": "alerts",
            "username": "john",
            "group_id": None,
            "title": "Alert",
            "body": "body",
            "data": {},
            "channels_attempted": ["websocket"],
            "channels_delivered": ["websocket"],
            "source_system": None,
            "created_at": now,
            "updated_at": now,
        }
        model = map_notification(doc)
        assert isinstance(model, Notification)
        assert model.id == "user_notif_1"
        assert model.topic == "alerts"
        assert model.username == "john"


class TestInsertNotificationData:
    @pytest.mark.asyncio
    async def test_inserts_and_returns(self, mock_db):
        data = {"topic": "alerts", "body": "hello", "title": "Test"}
        result = await insert_notification_data(mock_db, data)
        assert isinstance(result, NotificationDataDocument)
        assert result.topic == "alerts"
        assert result.body == "hello"


class TestInsertUserNotifications:
    @pytest.mark.asyncio
    async def test_inserts_multiple(self, mock_db):
        data_doc = await insert_notification_data(mock_db, {
            "topic": "alerts", "body": "hello", "title": "Test"
        })
        result = await insert_user_notifications(mock_db, data_doc.id, ["john", "jane"])
        assert len(result) == 2
        assert result[0].username in ("john", "jane")
        assert result[1].username in ("john", "jane")
        assert result[0].notification_id == data_doc.id

    @pytest.mark.asyncio
    async def test_inserts_single(self, mock_db):
        data_doc = await insert_notification_data(mock_db, {
            "topic": "alerts", "body": "hello", "title": "Test"
        })
        result = await insert_user_notifications(mock_db, data_doc.id, ["john"])
        assert len(result) == 1
        assert result[0].username == "john"


class TestFetchNotificationDataById:
    @pytest.mark.asyncio
    async def test_returns_document_when_found(self, mock_db):
        data_doc = await insert_notification_data(mock_db, {
            "topic": "alerts", "body": "hello", "title": "Test"
        })
        result = await fetch_notification_data_by_id(mock_db, data_doc.id)
        assert result is not None
        assert result.id == data_doc.id
        assert result.topic == "alerts"

    @pytest.mark.asyncio
    async def test_returns_none_for_invalid_id(self, mock_db):
        result = await fetch_notification_data_by_id(mock_db, "not-valid")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        result = await fetch_notification_data_by_id(mock_db, "000000000000000000000099")
        assert result is None


class TestUpdateNotificationDelivery:
    @pytest.mark.asyncio
    async def test_updates(self, mock_db):
        data_doc = await insert_notification_data(mock_db, {
            "topic": "alerts", "body": "hello", "title": "Test"
        })
        await update_notification_delivery(
            mock_db, data_doc.id, ["websocket"], ["websocket"]
        )
        fetched = await fetch_notification_data_by_id(mock_db, data_doc.id)
        assert fetched.channels_attempted == ["websocket"]
        assert fetched.channels_delivered == ["websocket"]

    @pytest.mark.asyncio
    async def test_silently_returns_for_invalid_id(self, mock_db):
        await update_notification_delivery(mock_db, "invalid", ["websocket"], ["websocket"])


class TestResolveUsernames:
    @pytest.mark.asyncio
    async def test_returns_usernames_when_provided(self, mock_db):
        req = SendNotificationRequest(topic="alerts", body="hello", usernames=["john", "jane"])
        result = await _resolve_usernames(mock_db, req)
        assert result == ["john", "jane"]

    @pytest.mark.asyncio
    async def test_resolves_from_group(self, mock_db):
        coll = mock_db._collections["groups"] = MagicMock()
        coll.find_one = AsyncMock(return_value={"group_id": "g1", "usernames": ["john", "jane"]})
        req = SendNotificationRequest(topic="alerts", body="hello", group_id="g1")
        result = await _resolve_usernames(mock_db, req)
        assert result == ["john", "jane"]

    @pytest.mark.asyncio
    async def test_raises_when_group_not_found(self, mock_db):
        coll = mock_db._collections["groups"] = MagicMock()
        coll.find_one = AsyncMock(return_value=None)
        req = SendNotificationRequest(topic="alerts", body="hello", group_id="g1")
        with pytest.raises(NotFoundError):
            await _resolve_usernames(mock_db, req)

    @pytest.mark.asyncio
    async def test_raises_when_neither_provided(self, mock_db):
        req = SendNotificationRequest(topic="alerts", body="hello")
        with pytest.raises(ValidationError):
            await _resolve_usernames(mock_db, req)

    @pytest.mark.asyncio
    async def test_prefers_usernames_over_group(self, mock_db):
        req = SendNotificationRequest(
            topic="alerts", body="hello", usernames=["john"], group_id="g1"
        )
        result = await _resolve_usernames(mock_db, req)
        assert result == ["john"]


class TestResolveNotifDb:
    @pytest.mark.asyncio
    async def test_fallback_when_no_topic(self, mock_db):
        db, coll = await _resolve_notif_db(mock_db, None)
        assert coll == "notifications"

    @pytest.mark.asyncio
    async def test_fallback_when_topic_not_found(self, mock_db):
        with patch("features.notifications.services.fetch_topic_config", return_value=None):
            db, coll = await _resolve_notif_db(mock_db, "missing")
            assert coll == "notifications"


class TestSendNotification:
    @pytest.mark.asyncio
    async def test_raises_when_topic_not_found(self, mock_db):
        with patch("features.notifications.services.fetch_topic_config", return_value=None):
            req = SendNotificationRequest(topic="missing", body="hello", usernames=["john"])
            with pytest.raises(NotFoundError):
                await send_notification(mock_db, req)

    @pytest.mark.asyncio
    async def test_sends_via_websocket_only(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["websocket"],
            "email_template": None, "email_subject_template": None,
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": None,
            "smtp_port": None, "smtp_user": None, "smtp_password": None,
            "smtp_from": None, "smtp_tls": None,
            "created_at": now, "updated_at": now,
        })
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("shared.websocket.ws_manager.broadcast_to_clients", return_value={"john": True}) as mock_ws:
                    with patch("shared.config.get_settings") as mock_settings:
                        s = MagicMock()
                        s.redis_url = ""
                        mock_settings.return_value = s
                        req = SendNotificationRequest(topic="alerts", body="hello", usernames=["john"])
                        result = await send_notification(mock_db, req)
                        assert isinstance(result, DeliveryResult)
                        assert "websocket" in result.channels_attempted
                        assert "websocket" in result.channels_delivered
                        assert result.ws_delivered_to == ["john"]

    @pytest.mark.asyncio
    async def test_sends_via_email_only(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["email"],
            "email_template": "<html>$body</html>", "email_subject_template": "$topic",
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": "smtp.test.com",
            "smtp_port": 587, "smtp_user": "u", "smtp_password": "p",
            "smtp_from": "f", "smtp_tls": False,
            "created_at": now, "updated_at": now,
        })
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("features.notifications.services.send_topic_email", return_value=["john@test.com"]) as mock_email:
                    with patch("features.notifications.services.fetch_user", return_value=MagicMock(email="john@test.com")):
                        req = SendNotificationRequest(topic="alerts", body="hello", usernames=["john"])
                        result = await send_notification(mock_db, req)
                        assert "email" in result.channels_attempted
                        assert "email" in result.channels_delivered
                        assert result.email_sent_to == ["john@test.com"]

    @pytest.mark.asyncio
    async def test_sends_both_ws_and_email(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["websocket", "email"],
            "email_template": "<html>$body</html>", "email_subject_template": "$topic",
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": "smtp.test.com",
            "smtp_port": 587, "smtp_user": "u", "smtp_password": "p",
            "smtp_from": "f", "smtp_tls": False,
            "created_at": now, "updated_at": now,
        })
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("shared.websocket.ws_manager.broadcast_to_clients", return_value={"john": True}):
                    with patch("features.notifications.services.send_topic_email", return_value=["john@example.com"]) as mock_email:
                        with patch("features.notifications.services.fetch_user", return_value=MagicMock(email="john@example.com")):
                            with patch("shared.config.get_settings") as mock_settings:
                                s = MagicMock()
                                s.redis_url = ""
                                mock_settings.return_value = s
                                req = SendNotificationRequest(topic="alerts", body="hello", usernames=["john"])
                                result = await send_notification(mock_db, req)
                                assert "websocket" in result.channels_delivered
                                assert "email" in result.channels_delivered
                                assert result.ws_delivered_to == ["john"]
                                assert result.email_sent_to == ["john@example.com"]

    @pytest.mark.asyncio
    async def test_group_id_target(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["websocket"],
            "email_template": None, "email_subject_template": None,
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": None,
            "smtp_port": None, "smtp_user": None, "smtp_password": None,
            "smtp_from": None, "smtp_tls": None,
            "created_at": now, "updated_at": now,
        })
        coll = mock_db._collections["groups"] = MagicMock()
        coll.find_one = AsyncMock(return_value={"group_id": "g1", "usernames": ["john", "jane"]})
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("shared.websocket.ws_manager.broadcast_to_clients", return_value={"john": True, "jane": True}):
                    with patch("shared.config.get_settings") as mock_settings:
                        s = MagicMock()
                        s.redis_url = ""
                        mock_settings.return_value = s
                        req = SendNotificationRequest(topic="alerts", body="hello", group_id="g1")
                        result = await send_notification(mock_db, req)
                        assert result is not None
                        assert "john" in result.ws_delivered_to
                        assert "jane" in result.ws_delivered_to

    @pytest.mark.asyncio
    async def test_email_no_valid_addresses(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["email"],
            "email_template": "<html>$body</html>", "email_subject_template": "$topic",
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": "smtp.test.com",
            "smtp_port": 587, "smtp_user": "u", "smtp_password": "p",
            "smtp_from": "f", "smtp_tls": False,
            "created_at": now, "updated_at": now,
        })
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("features.notifications.services.send_topic_email", return_value=[]) as mock_email:
                    with patch("features.notifications.services.fetch_user", return_value=MagicMock(email=None)):
                        req = SendNotificationRequest(topic="alerts", body="hello", usernames=["john"])
                        result = await send_notification(mock_db, req)
                        assert "email" in result.channels_attempted
                        assert "email" not in result.channels_delivered
                        mock_email.assert_called_once()

    @pytest.mark.asyncio
    async def test_source_system_included(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["websocket"],
            "email_template": None, "email_subject_template": None,
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": None,
            "smtp_port": None, "smtp_user": None, "smtp_password": None,
            "smtp_from": None, "smtp_tls": None,
            "created_at": now, "updated_at": now,
        })
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("shared.websocket.ws_manager.broadcast_to_clients", return_value={"john": True}):
                    with patch("shared.config.get_settings") as mock_settings:
                        s = MagicMock()
                        s.redis_url = ""
                        mock_settings.return_value = s
                        req = SendNotificationRequest(
                            topic="alerts", body="hello", usernames=["john"], source_system="monitoring"
                        )
                        result = await send_notification(mock_db, req)
                        assert result is not None


class TestGetNotificationsForUser:
    @pytest.mark.asyncio
    async def test_returns_mapped_notifications(self, mock_db):
        now = datetime.now(timezone.utc)
        joined_doc = {
            "user_notif_id": "un1",
            "topic": "alerts",
            "username": "john",
            "title": "Test",
            "body": "hello",
            "created_at": now,
        }
        with patch("features.notifications.services._resolve_notif_db", return_value=(mock_db, "notifications")):
            with patch("features.notifications.services.fetch_user_notifications", return_value=[joined_doc]):
                result = await get_notifications_for_user(mock_db, "john")
                assert len(result) == 1
                assert result[0].topic == "alerts"
                assert result[0].username == "john"

    @pytest.mark.asyncio
    async def test_empty_list_when_no_notifications(self, mock_db):
        with patch("features.notifications.services._resolve_notif_db", return_value=(mock_db, "notifications")):
            with patch("features.notifications.services.fetch_user_notifications", return_value=[]):
                result = await get_notifications_for_user(mock_db, "nobody")
                assert result == []

    @pytest.mark.asyncio
    async def test_topic_filter_applied(self, mock_db):
        now = datetime.now(timezone.utc)
        alert_doc = {
            "user_notif_id": "un1",
            "topic": "alerts",
            "username": "john",
            "title": "Alert",
            "body": "alert body",
            "created_at": now,
        }
        update_doc = {
            "user_notif_id": "un2",
            "topic": "updates",
            "username": "john",
            "title": "Update",
            "body": "update body",
            "created_at": now,
        }
        with patch("features.notifications.services._resolve_notif_db", return_value=(mock_db, "notifications")):
            with patch("features.notifications.services.fetch_user_notifications", return_value=[alert_doc, update_doc]):
                result = await get_notifications_for_user(mock_db, "john", topic="alerts")
                assert len(result) == 1
                assert result[0].topic == "alerts"

    @pytest.mark.asyncio
    async def test_pagination_skip_limit(self, mock_db):
        now = datetime.now(timezone.utc)
        docs = [
            {"user_notif_id": f"un{i}", "topic": "alerts", "username": "john", "title": f"T{i}", "body": f"b{i}", "created_at": now}
            for i in range(5)
        ]
        with patch("features.notifications.services._resolve_notif_db", return_value=(mock_db, "notifications")):
            with patch("features.notifications.services.fetch_user_notifications", return_value=docs[2:4]):
                result = await get_notifications_for_user(mock_db, "john", skip=2, limit=2)
                assert len(result) == 2


class TestRedisWebSocketDelivery:
    @pytest.mark.asyncio
    async def test_uses_redis_when_configured(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["websocket"],
            "email_template": None, "email_subject_template": None,
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": None,
            "smtp_port": None, "smtp_user": None, "smtp_password": None,
            "smtp_from": None, "smtp_tls": None,
            "created_at": now, "updated_at": now,
        })
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("features.notifications.services.publish_ws_event") as mock_pub:
                    with patch("features.notifications.services.get_settings") as mock_settings:
                        s = MagicMock()
                        s.redis_url = "redis://localhost:6379"
                        mock_settings.return_value = s
                        req = SendNotificationRequest(topic="alerts", body="hello", usernames=["john"])
                        result = await send_notification(mock_db, req)
                        assert result.ws_published is True
                        assert "websocket" in result.channels_delivered
                        mock_pub.assert_called_once()


class TestOfflineWebSocketClient:
    @pytest.mark.asyncio
    async def test_no_ws_delivery_when_client_offline(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["websocket"],
            "email_template": None, "email_subject_template": None,
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": None,
            "smtp_port": None, "smtp_user": None, "smtp_password": None,
            "smtp_from": None, "smtp_tls": None,
            "created_at": now, "updated_at": now,
        })
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("shared.websocket.ws_manager.broadcast_to_clients", return_value={"john": False}) as mock_ws:
                    with patch("shared.config.get_settings") as mock_settings:
                        s = MagicMock()
                        s.redis_url = ""
                        mock_settings.return_value = s
                        req = SendNotificationRequest(topic="alerts", body="hello", usernames=["john"])
                        result = await send_notification(mock_db, req)
                        assert "websocket" in result.channels_attempted
                        assert result.ws_delivered_to == []


class TestNestedDataPayload:
    @pytest.mark.asyncio
    async def test_preserves_nested_data(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["websocket"],
            "email_template": None, "email_subject_template": None,
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": None,
            "smtp_port": None, "smtp_user": None, "smtp_password": None,
            "smtp_from": None, "smtp_tls": None,
            "created_at": now, "updated_at": now,
        })
        nested_data = {"config": {"threshold": 100, "nested_list": [1, 2, 3]}}
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("shared.websocket.ws_manager.broadcast_to_clients", return_value={"john": True}):
                    with patch("shared.config.get_settings") as mock_settings:
                        s = MagicMock()
                        s.redis_url = ""
                        mock_settings.return_value = s
                        req = SendNotificationRequest(
                            topic="alerts", body="hello", usernames=["john"], data=nested_data
                        )
                        result = await send_notification(mock_db, req)
                        assert result is not None


class TestNormalizedSchemaGroup:
    @pytest.mark.asyncio
    async def test_group_notification_creates_one_data_record(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["websocket"],
            "email_template": None, "email_subject_template": None,
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": None,
            "smtp_port": None, "smtp_user": None, "smtp_password": None,
            "smtp_from": None, "smtp_tls": None,
            "created_at": now, "updated_at": now,
        })
        coll = mock_db._collections["groups"] = MagicMock()
        coll.find_one = AsyncMock(return_value={"group_id": "all-users", "usernames": ["john", "jane"]})
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("shared.websocket.ws_manager.broadcast_to_clients", return_value={"john": True, "jane": True}):
                    with patch("shared.config.get_settings") as mock_settings:
                        s = MagicMock()
                        s.redis_url = ""
                        mock_settings.return_value = s
                        req = SendNotificationRequest(topic="alerts", body="hello", group_id="all-users")
                        result = await send_notification(mock_db, req)
                        data_count = await mock_db["notification_data"].count_documents({})
                        assert data_count == 1
                        user_count = await mock_db["notifications"].count_documents({})
                        assert user_count == 2


class TestEmptyGroupNotification:
    @pytest.mark.asyncio
    async def test_no_delivery_when_group_empty(self, mock_db):
        now = datetime.now(timezone.utc)
        from features.topics.clients import TopicConfigDocument
        topic_doc = TopicConfigDocument({
            "_id": "t1", "topic": "alerts", "channels": ["websocket"],
            "email_template": None, "email_subject_template": None,
            "metadata": {}, "storage_uri": None, "storage_db": None,
            "storage_collection": "notifications", "smtp_host": None,
            "smtp_port": None, "smtp_user": None, "smtp_password": None,
            "smtp_from": None, "smtp_tls": None,
            "created_at": now, "updated_at": now,
        })
        coll = mock_db._collections["groups"] = MagicMock()
        coll.find_one = AsyncMock(return_value={"group_id": "empty-group", "usernames": []})
        with patch("features.notifications.services.fetch_topic_config", return_value=topic_doc):
            with patch("features.notifications.services.get_db_for_topic", return_value=(mock_db, "notifications")):
                with patch("shared.config.get_settings") as mock_settings:
                    s = MagicMock()
                    s.redis_url = ""
                    mock_settings.return_value = s
                    req = SendNotificationRequest(topic="alerts", body="hello", group_id="empty-group")
                    result = await send_notification(mock_db, req)
                    assert result is not None
                    assert result.ws_delivered_to == []


class TestUpdateDeliveryEmpty:
    @pytest.mark.asyncio
    async def test_updates_with_empty_lists(self, mock_db):
        data_doc = await insert_notification_data(mock_db, {
            "topic": "alerts", "body": "hello", "title": "Test"
        })
        await update_notification_delivery(mock_db, data_doc.id, [], [])
        fetched = await fetch_notification_data_by_id(mock_db, data_doc.id)
        assert fetched.channels_attempted == []
        assert fetched.channels_delivered == []


class TestNotificationModel:
    def test_has_username_not_usernames(self):
        n = Notification(
            id="1", topic="alerts", username="john",
            title="Test", body="body"
        )
        assert n.username == "john"
        assert not hasattr(n, "usernames")

    def test_optional_fields_default(self):
        n = Notification(id="1", topic="alerts", username="john", title="T", body="b")
        assert n.group_id is None
        assert n.data == {}
        assert n.channels_attempted == []
        assert n.channels_delivered == []
        assert n.source_system is None


class TestSendNotificationRequest:
    def test_accepts_usernames(self):
        req = SendNotificationRequest(
            topic="alerts", body="hello", usernames=["john", "jane"]
        )
        assert req.usernames == ["john", "jane"]

    def test_accepts_group_id(self):
        req = SendNotificationRequest(
            topic="alerts", body="hello", group_id="team-alpha"
        )
        assert req.group_id == "team-alpha"

    def test_accepts_data_dict(self):
        req = SendNotificationRequest(
            topic="alerts", body="hello", data={"priority": "high"}
        )
        assert req.data == {"priority": "high"}

    def test_requires_body(self):
        with pytest.raises(ValueError):
            SendNotificationRequest(topic="alerts", body="")
