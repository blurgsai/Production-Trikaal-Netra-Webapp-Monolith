from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, StreamingResponse
from functools import lru_cache
from io import BytesIO

from .schemas import ReportRequest
from .services import ReportService
from utils.auth import get_current_user

reports_router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)


@lru_cache(maxsize=1)
def get_report_service() -> ReportService:
    """
    Singleton factory — FastAPI's Depends calls this on every request, but
    lru_cache ensures the ReportService (and its ReportRepository + asyncio.Lock)
    is created exactly once per process lifetime.  This prevents per-request
    Motor client + Lock churn.
    """
    from db import client
    from .repository import ReportRepository
    return ReportService(repo=ReportRepository(client))


@reports_router.post("/generate")
async def generate_report(
    request: ReportRequest,
    service: ReportService = Depends(get_report_service),
    _: dict = Depends(get_current_user),
):
    output = await service.generate_report(request)

    if isinstance(output, bytes):
        return StreamingResponse(
            BytesIO(output),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={request.report_type}_report.pdf"}
        )

    return HTMLResponse(content=output)
