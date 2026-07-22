import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.features.basemaps.repository import init_db
from src.features.basemaps.router import router as basemaps_router
from src.features.overlays.repository import init_overlays_db
from src.features.overlays.router import router as overlays_router
from src.features.tiles.router import router as tiles_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(title="Trikaal Tileserver", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    init_overlays_db()


app.include_router(basemaps_router)
app.include_router(overlays_router)
app.include_router(tiles_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
