from unittest.mock import AsyncMock, MagicMock

import pytest

from shared.websocket import WebSocketManager


@pytest.fixture
def ws_manager():
    return WebSocketManager()


@pytest.fixture
def mock_ws():
    ws = MagicMock()
    ws.accept = AsyncMock()
    ws.send_json = AsyncMock()
    ws.send_text = AsyncMock()
    return ws


class TestWebSocketManager:
    @pytest.mark.asyncio
    async def test_connect_accepts_and_stores(self, ws_manager, mock_ws):
        await ws_manager.connect("client-1", mock_ws)
        mock_ws.accept.assert_awaited_once()
        assert ws_manager.is_connected("client-1") is True
        assert len(ws_manager._connections["client-1"]) == 1

    @pytest.mark.asyncio
    async def test_disconnect_removes_socket(self, ws_manager, mock_ws):
        await ws_manager.connect("client-1", mock_ws)
        ws_manager.disconnect("client-1", mock_ws)
        assert ws_manager.is_connected("client-1") is False

    @pytest.mark.asyncio
    async def test_multiple_connections_per_client(self, ws_manager, mock_ws):
        ws2 = MagicMock()
        ws2.accept = AsyncMock()
        ws2.send_json = AsyncMock()
        await ws_manager.connect("client-1", mock_ws)
        await ws_manager.connect("client-1", ws2)
        assert len(ws_manager._connections["client-1"]) == 2

    @pytest.mark.asyncio
    async def test_send_to_client_delivers(self, ws_manager, mock_ws):
        await ws_manager.connect("client-1", mock_ws)
        result = await ws_manager.send_to_client("client-1", {"type": "test"})
        assert result is True
        mock_ws.send_json.assert_awaited_once_with({"type": "test"})

    @pytest.mark.asyncio
    async def test_send_to_client_returns_false_when_not_connected(self, ws_manager):
        result = await ws_manager.send_to_client("client-1", {"type": "test"})
        assert result is False

    @pytest.mark.asyncio
    async def test_send_to_client_removes_dead_sockets(self, ws_manager, mock_ws):
        await ws_manager.connect("client-1", mock_ws)
        mock_ws.send_json.side_effect = Exception("Connection closed")
        result = await ws_manager.send_to_client("client-1", {"type": "test"})
        assert result is False
        assert ws_manager.is_connected("client-1") is False

    @pytest.mark.asyncio
    async def test_broadcast_to_clients(self, ws_manager, mock_ws):
        ws2 = MagicMock()
        ws2.accept = AsyncMock()
        ws2.send_json = AsyncMock()
        await ws_manager.connect("client-1", mock_ws)
        await ws_manager.connect("client-2", ws2)
        results = await ws_manager.broadcast_to_clients(["client-1", "client-2"], {"msg": "hi"})
        assert results == {"client-1": True, "client-2": True}

    def test_connected_usernames(self, ws_manager, mock_ws):
        assert ws_manager.connected_usernames() == []
        # Use asyncio.run for async connect in sync context
        import asyncio
        asyncio.run(ws_manager.connect("client-1", mock_ws))
        assert ws_manager.connected_usernames() == ["client-1"]


class TestWebSocketEdgeCases:
    def test_disconnect_unconnected_socket_is_noop(self, ws_manager, mock_ws):
        ws_manager.disconnect("client-1", mock_ws)
        assert ws_manager.is_connected("client-1") is False

    @pytest.mark.asyncio
    async def test_send_removes_dead_socket_but_keeps_live(self, ws_manager, mock_ws):
        ws2 = MagicMock()
        ws2.accept = AsyncMock()
        ws2.send_json = AsyncMock()
        await ws_manager.connect("client-1", mock_ws)
        await ws_manager.connect("client-1", ws2)
        mock_ws.send_json.side_effect = Exception("dead")
        result = await ws_manager.send_to_client("client-1", {"msg": "hi"})
        assert result is True
        assert ws_manager.is_connected("client-1") is True
        assert len(ws_manager._connections["client-1"]) == 1

    @pytest.mark.asyncio
    async def test_broadcast_empty_list(self, ws_manager):
        results = await ws_manager.broadcast_to_clients([], {"msg": "hi"})
        assert results == {}

    @pytest.mark.asyncio
    async def test_broadcast_to_offline_client(self, ws_manager):
        results = await ws_manager.broadcast_to_clients(["client-1"], {"msg": "hi"})
        assert results == {"client-1": False}

    @pytest.mark.asyncio
    async def test_disconnect_last_socket_removes_key(self, ws_manager, mock_ws):
        await ws_manager.connect("client-1", mock_ws)
        ws_manager.disconnect("client-1", mock_ws)
        assert "client-1" not in ws_manager._connections
