import logging
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI

from src.features.admin.router import router as admin_router
from src.features.compound_events.router import router as compound_events_router
from src.features.events.router import router as events_router
from src.features.focus_mode.router import router as focus_mode_router
from src.features.insights.router import router as insights_router
from src.features.playback.router import router as playback_router
from src.features.users.router import router as user_router
from src.features.vessel_flags.router import router as vessel_flags_router
from src.features.vessels.router import router as vessel_router
from src.features.world_monitor.router import router as world_monitor_router
from src.shared.config import setup_cors

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] Application starting")
    yield
    logger.info("[Shutdown] Application stopping")


app = FastAPI(lifespan=lifespan)

setup_cors(app)


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(user_router)
app.include_router(vessel_router)
app.include_router(vessel_flags_router)
app.include_router(world_monitor_router)
app.include_router(admin_router)
app.include_router(events_router)
app.include_router(compound_events_router)
app.include_router(playback_router)
app.include_router(focus_mode_router)
app.include_router(insights_router)

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=5000, reload=True)
