import asyncio
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections keyed by username.

    A single username may have multiple active connections
    (e.g. multiple browser tabs).
    """

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, username: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[username].append(websocket)
        logger.info("WS connected: username=%s total_sockets=%d", username, len(self._connections[username]))

    def disconnect(self, username: str, websocket: WebSocket) -> None:
        sockets = self._connections.get(username, [])
        if websocket in sockets:
            sockets.remove(websocket)
        if not sockets:
            self._connections.pop(username, None)
        logger.info("WS disconnected: username=%s", username)

    def is_connected(self, username: str) -> bool:
        return bool(self._connections.get(username))

    async def send_to_client(self, username: str, payload: dict[str, Any]) -> bool:
        """Send payload to all sockets of a user. Returns True if at least one delivery succeeded."""
        sockets = self._connections.get(username, [])
        if not sockets:
            return False

        dead: list[WebSocket] = []
        sent = False
        for ws in sockets:
            try:
                await ws.send_json(payload)
                sent = True
            except Exception as exc:
                logger.warning("WS send failed for username=%s: %s", username, exc)
                dead.append(ws)

        for ws in dead:
            self.disconnect(username, ws)

        return sent

    async def broadcast_to_clients(self, usernames: list[str], payload: dict[str, Any]) -> dict[str, bool]:
        """Broadcast to multiple users. Returns delivery status per username."""
        results = await asyncio.gather(
            *[self.send_to_client(u, payload) for u in usernames],
            return_exceptions=False,
        )
        return dict(zip(usernames, results))

    def connected_usernames(self) -> list[str]:
        return list(self._connections.keys())


ws_manager = WebSocketManager()
