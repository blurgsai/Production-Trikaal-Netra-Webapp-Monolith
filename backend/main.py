from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI


from routes import user, event, events, historicalplayback, reports, focusmode, admin, compound_events

from routes.lloyds_table.router import router as lloyds_table_router
from routes.vessels.router import router as vessel_router
import uvicorn
from config import setup_cors
from dotenv import load_dotenv
import httpx
# Load .env file
load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize shared ClickHouse HTTP client for standard routes
    app.state.clickhouse_client = httpx.AsyncClient()
    logger.info("[Startup] Global ClickHouse HTTP client initialized")

    try:
        yield  # Application runs here
    finally:
        # ── Graceful shutdown ────────────────────────────────────────────────────
        
        # 1. Close the shared ClickHouse client in app.state
        await app.state.clickhouse_client.aclose()
        logger.info("[Shutdown] Global ClickHouse HTTP client closed")

        # 2. Close the shared ClickHouse HTTP client held by the singleton ReportRepository
        try:
            from routes.reports.router import get_report_service
            # get_report_service() returns the cached instance
            await get_report_service().repo._http.aclose()
            logger.info("[Shutdown] ReportRepository ClickHouse HTTP client closed")
        except Exception as exc:
            logger.debug("[Shutdown] ReportRepository client close skipped: %s", exc)


app = FastAPI(lifespan=lifespan)

setup_cors(app)

app.include_router(admin.router)
app.include_router(lloyds_table_router)
app.include_router(user.router)
app.include_router(vessel_router)
app.include_router(events.router)  # New playback endpoint
app.include_router(compound_events.router)  # Compound events endpoints
app.include_router(event.router)
app.include_router(historicalplayback.router)
app.include_router(reports.reports_router)
app.include_router(focusmode.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)