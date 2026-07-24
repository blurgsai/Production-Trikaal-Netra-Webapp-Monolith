import asyncio
import logging

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from features.admin.router import router as admin_router
from features.auth.router import router as auth_router
from features.groups.router import router as groups_router
from features.notifications.router import router as notifications_router
from features.topics.router import router as topics_router
from features.users.router import router as users_router
from shared.auth import init_db
from shared.auth.dependencies import _LoginRedirect
from shared.config import get_settings
from shared.dependencies import get_mongo_client
from shared.db import close_all as close_motor_registry
from shared.redis import close_redis, run_ws_subscriber
from shared.websocket import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    client = get_mongo_client()
    db = client[settings.mongodb_db]

    await db["topic_configs"].create_index("topic", unique=True)
    await db["groups"].create_index("group_id", unique=True)
    await db["users"].create_index("username", unique=True)
    # Normalized notification schema indexes
    await db["notification_data"].create_index("topic")
    await db["notification_data"].create_index([("created_at", -1)])
    await db["notifications"].create_index([("username", 1), ("created_at", -1)])
    await db["notifications"].create_index("notification_id")

    logger.info("MongoDB indexes ensured")

    await init_db()

    _redis_task: asyncio.Task | None = None
    if settings.redis_url:
        _redis_task = asyncio.create_task(run_ws_subscriber(ws_manager))
        logger.info("Redis WS subscriber task started")
    else:
        logger.info("Redis not configured — single-instance WS delivery mode")

    yield

    if _redis_task is not None:
        _redis_task.cancel()
        try:
            await _redis_task
        except asyncio.CancelledError:
            pass
        await close_redis()

    await close_motor_registry()
    client.close()
    logger.info("MongoDB client closed")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Loosely-coupled, reusable notification server. "
            "Supports WebSocket push and email delivery. "
            "Open-ended payload schema — producers attach any key-value pairs under `data`."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(notifications_router, prefix="/api")
    app.include_router(topics_router, prefix="/api")
    app.include_router(groups_router, prefix="/api")
    app.include_router(users_router, prefix="/api")
    app.include_router(auth_router)
    app.include_router(admin_router)

    app.mount("/static", StaticFiles(directory="static"), name="static")

    @app.exception_handler(_LoginRedirect)
    async def login_redirect_handler(request: Request, exc: _LoginRedirect):
        return RedirectResponse(
            url=f"/admin/login?next={exc.next_url}",
            status_code=303,
        )

    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "ok", "version": settings.app_version}

    return app


app = create_app()
