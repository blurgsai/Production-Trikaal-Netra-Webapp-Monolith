from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from routes.vessels.router import router as vessel_router
import uvicorn
from shared.config import setup_cors
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] Application starting")
    yield
    logger.info("[Shutdown] Application stopping")


app = FastAPI(lifespan=lifespan)

setup_cors(app)

app.include_router(vessel_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)