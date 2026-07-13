import logging
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI

from src.features.users.router import router as user_router
from src.features.vessels.router import router as vessel_router
from src.features.vessel_flags.router import router as vessel_flags_router
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

app.include_router(user_router)
app.include_router(vessel_router)
app.include_router(vessel_flags_router)
app.include_router(world_monitor_router)

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=5000, reload=True)
