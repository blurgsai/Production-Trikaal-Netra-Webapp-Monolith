import asyncio
import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, WebSocketException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from features.notifications.models import (
    DeliveryResult,
    Notification,
    SendNotificationRequest,
)
from features.notifications.services import (
    get_notifications_for_user,
    send_notification,
)
from shared.auth import decode_jwt_token
from shared.config import get_settings
from shared.dependencies import api_key_guard, get_db
from shared.websocket import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Notifications"])


@router.post("/notify", response_model=DeliveryResult, status_code=202)
async def notify(
    req: SendNotificationRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    """
    Primary dispatch endpoint. Any producer system calls this to deliver
    a notification via channels configured for the topic.
    """
    return await send_notification(db, req)


@router.get("/notifications/{username}", response_model=list[Notification])
async def list_notifications(
    username: str,
    topic: str | None = Query(default=None, description="Filter to a specific topic's storage DB/collection"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await get_notifications_for_user(db, username, topic=topic, skip=skip, limit=limit)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
):
    """
    WebSocket endpoint for real-time delivery.
    Client connects with a JWT token via query parameter.
    Server validates the token before accepting the connection.
    """
    # Validate JWT token
    payload = decode_jwt_token(token)
    if payload is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
    
    username = payload.get("sub")
    if not username:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Token missing username")
    
    settings = get_settings()
    await ws_manager.connect(username, websocket)
    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=settings.ws_heartbeat_interval,
                )
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                try:
                    await websocket.send_json({"type": "heartbeat"})
                except Exception:
                    break
    except WebSocketDisconnect:
        logger.info("WS user disconnected: %s", username)
    finally:
        ws_manager.disconnect(username, websocket)
