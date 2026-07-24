import logging
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from features.notifications.clients import (
    fetch_notification_data_by_id,
    fetch_user_notifications,
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
from features.topics.clients import fetch_topic_config
from features.topics.models import Channel
from features.users.clients import fetch_user
from shared.config import get_settings
from shared.db import get_db_for_topic
from shared.email import SmtpConfig, send_topic_email
from shared.errors import NotFoundError, ValidationError
from shared.redis import publish_ws_event
from shared.websocket import ws_manager

logger = logging.getLogger(__name__)


async def _resolve_usernames(db: AsyncIOMotorDatabase, req: SendNotificationRequest) -> list[str]:
    """
    Resolve the target usernames from the request.
    If group_id is provided, look up group membership from the groups collection.
    """
    if req.usernames:
        return list(req.usernames)

    if req.group_id:
        group_doc = await db["groups"].find_one({"group_id": req.group_id})
        if group_doc is None:
            raise NotFoundError("Group", req.group_id)
        return group_doc.get("usernames", [])

    raise ValidationError("Either usernames or group_id must be provided")


async def _resolve_notif_db(
    global_db: AsyncIOMotorDatabase,
    topic: str | None,
) -> tuple[AsyncIOMotorDatabase, str]:
    """
    Return (database, collection_name) to use for notification storage.
    When topic is provided its storage config overrides the global defaults.
    Falls back to global db + default "notifications" collection otherwise.
    """
    DEFAULT_COLLECTION = "notifications"
    if topic is None:
        return global_db, DEFAULT_COLLECTION
    topic_doc = await fetch_topic_config(global_db, topic)
    if topic_doc is None:
        return global_db, DEFAULT_COLLECTION
    return get_db_for_topic(
        topic_doc.storage_uri,
        topic_doc.storage_db,
        topic_doc.storage_collection,
    )


async def send_notification(
    db: AsyncIOMotorDatabase,
    req: SendNotificationRequest,
) -> DeliveryResult:
    topic_doc = await fetch_topic_config(db, req.topic)
    if topic_doc is None:
        raise NotFoundError("TopicConfig", req.topic)

    notif_db, notif_collection = get_db_for_topic(
        topic_doc.storage_uri,
        topic_doc.storage_db,
        topic_doc.storage_collection,
    )

    usernames = await _resolve_usernames(db, req)

    now = datetime.now(timezone.utc)
    notification_data = {
        "topic": req.topic,
        "group_id": req.group_id,
        "title": req.title,
        "body": req.body,
        "data": req.data,
        "channels_attempted": [],
        "channels_delivered": [],
        "source_system": req.source_system,
        "created_at": now,
        "updated_at": now,
    }

    notification_doc = await insert_notification_data(notif_db, notification_data)
    channels = [Channel(c) for c in topic_doc.channels]

    channels_attempted: list[str] = []
    channels_delivered: list[str] = []
    ws_delivered_to: list[str] = []
    ws_published: bool = False
    email_sent_to: list[str] = []

    template_vars = {
        "topic": req.topic,
        "title": req.title,
        "body": req.body,
        "source_system": req.source_system or "",
        **req.data,
    }

    if Channel.websocket in channels:
        channels_attempted.append(Channel.websocket.value)
        ws_payload = {
            "type": "notification",
            "id": notification_doc.id,
            "topic": req.topic,
            "title": req.title,
            "body": req.body,
            "data": req.data,
        }
        if get_settings().redis_url:
            await publish_ws_event(usernames, ws_payload)
            ws_published = True
            channels_delivered.append(Channel.websocket.value)
        else:
            results = await ws_manager.broadcast_to_clients(usernames, ws_payload)
            ws_delivered_to = [u for u, ok in results.items() if ok]
            if ws_delivered_to:
                channels_delivered.append(Channel.websocket.value)

    if Channel.email in channels:
        channels_attempted.append(Channel.email.value)
        # Resolve email addresses from users collection
        user_docs = [await fetch_user(db, uname) for uname in usernames]
        email_targets = [u.email for u in user_docs if u and u.email]
        topic_smtp = SmtpConfig(
            host=topic_doc.smtp_host,
            port=topic_doc.smtp_port,
            user=topic_doc.smtp_user,
            password=topic_doc.smtp_password,
            from_addr=topic_doc.smtp_from,
            tls=topic_doc.smtp_tls,
        )
        sent = await send_topic_email(
            to_addresses=email_targets,
            subject_template=topic_doc.email_subject_template,
            body_template=topic_doc.email_template,
            variables=template_vars,
            smtp=topic_smtp,
        )
        email_sent_to = sent
        if sent:
            channels_delivered.append(Channel.email.value)

    await insert_user_notifications(notif_db, notification_doc.id, usernames)

    await update_notification_delivery(
        notif_db, notification_doc.id, channels_attempted, channels_delivered,
    )

    logger.info(
        "Notification sent: id=%s topic=%s ws_delivered=%d email_sent=%d",
        notification_doc.id,
        req.topic,
        len(ws_delivered_to),
        len(email_sent_to),
    )

    return DeliveryResult(
        notification_id=notification_doc.id,
        topic=req.topic,
        channels_attempted=channels_attempted,
        channels_delivered=channels_delivered,
        ws_delivered_to=ws_delivered_to,
        ws_published=ws_published,
        email_sent_to=email_sent_to,
    )


async def get_notifications_for_user(
    db: AsyncIOMotorDatabase,
    username: str,
    topic: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Notification]:
    notif_db, _ = await _resolve_notif_db(db, topic)
    docs = await fetch_user_notifications(notif_db, username, skip, limit)
    if topic:
        docs = [d for d in docs if d.get("topic") == topic]
    return [map_notification(d) for d in docs]
