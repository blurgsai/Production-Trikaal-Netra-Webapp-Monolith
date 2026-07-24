from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from shared.redis import close_redis, publish_ws_event, run_ws_subscriber


class TestPublishWsEvent:
    @pytest.mark.asyncio
    async def test_publishes_json_message(self, test_env):
        with patch("shared.redis.get_redis_client") as mock_get_client:
            mock_redis = AsyncMock()
            mock_get_client.return_value = mock_redis
            await publish_ws_event(["c1", "c2"], {"type": "notification", "msg": "hi"})
            mock_redis.publish.assert_awaited_once()
            channel, message = mock_redis.publish.call_args.args
            assert channel == "notif:ws:events"
            import json
            data = json.loads(message)
            assert data["_usernames"] == ["c1", "c2"]
            assert data["type"] == "notification"


class TestRunWsSubscriber:
    @pytest.mark.asyncio
    async def test_subscribes_and_dispatches(self, test_env):
        mock_ws_mgr = MagicMock()
        mock_ws_mgr.broadcast_to_clients = AsyncMock()

        mock_pubsub = AsyncMock()
        mock_message = {"type": "message", "data": '{"_usernames": ["c1"], "msg": "hello"}'}

        async def mock_listen():
            yield mock_message
            # Stop after one message by cancelling ourselves isn't easy in this structure;
            # We'll let the loop run once and then cancel.

        mock_pubsub.listen = mock_listen

        mock_sub = MagicMock()
        mock_sub.pubsub.return_value = mock_pubsub
        mock_sub.aclose = AsyncMock()

        with patch("shared.redis.aioredis.from_url", return_value=mock_sub):
            task = asyncio.create_task(run_ws_subscriber(mock_ws_mgr))
            await asyncio.sleep(0.05)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        mock_ws_mgr.broadcast_to_clients.assert_awaited_once()


class TestCloseRedis:
    @pytest.mark.asyncio
    async def test_closes_and_clears(self):
        mock_client = AsyncMock()
        import shared.redis as redis_mod
        redis_mod._client = mock_client
        await close_redis()
        mock_client.aclose.assert_awaited_once()
        assert redis_mod._client is None

    @pytest.mark.asyncio
    async def test_noop_when_no_client(self):
        import shared.redis as redis_mod
        redis_mod._client = None
        await close_redis()
        assert redis_mod._client is None


class TestPublishEmptyClientIds:
    @pytest.mark.asyncio
    async def test_publishes_empty_list(self, test_env):
        with patch("shared.redis.get_redis_client") as mock_get_client:
            mock_redis = AsyncMock()
            mock_get_client.return_value = mock_redis
            await publish_ws_event([], {"type": "ping"})
            mock_redis.publish.assert_awaited_once()
            import json
            data = json.loads(mock_redis.publish.call_args.args[1])
            assert data["_usernames"] == []


class TestSubscriberMalformedJson:
    @pytest.mark.asyncio
    async def test_skips_malformed_message(self, test_env):
        mock_ws_mgr = MagicMock()
        mock_ws_mgr.broadcast_to_clients = AsyncMock()

        mock_pubsub = AsyncMock()
        mock_message = {"type": "message", "data": "not-valid-json"}

        async def mock_listen():
            yield mock_message

        mock_pubsub.listen = mock_listen

        mock_sub = MagicMock()
        mock_sub.pubsub.return_value = mock_pubsub
        mock_sub.aclose = AsyncMock()

        with patch("shared.redis.aioredis.from_url", return_value=mock_sub):
            task = asyncio.create_task(run_ws_subscriber(mock_ws_mgr))
            await asyncio.sleep(0.05)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        mock_ws_mgr.broadcast_to_clients.assert_not_awaited()


class TestSubscriberNonMessageType:
    @pytest.mark.asyncio
    async def test_ignores_subscribe_confirmations(self, test_env):
        mock_ws_mgr = MagicMock()
        mock_ws_mgr.broadcast_to_clients = AsyncMock()

        mock_pubsub = AsyncMock()
        mock_message = {"type": "subscribe", "channel": "notif:ws:events"}

        async def mock_listen():
            yield mock_message

        mock_pubsub.listen = mock_listen

        mock_sub = MagicMock()
        mock_sub.pubsub.return_value = mock_pubsub
        mock_sub.aclose = AsyncMock()

        with patch("shared.redis.aioredis.from_url", return_value=mock_sub):
            task = asyncio.create_task(run_ws_subscriber(mock_ws_mgr))
            await asyncio.sleep(0.05)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        mock_ws_mgr.broadcast_to_clients.assert_not_awaited()


class TestPublishFailure:
    @pytest.mark.asyncio
    async def test_raises_on_publish_error(self, test_env):
        with patch("shared.redis.get_redis_client") as mock_get_client:
            mock_redis = AsyncMock()
            mock_redis.publish.side_effect = Exception("Connection refused")
            mock_get_client.return_value = mock_redis
            with pytest.raises(Exception, match="Connection refused"):
                await publish_ws_event(["c1"], {"type": "test"})


import asyncio
