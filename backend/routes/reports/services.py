import logging
from typing import Union

from fastapi import HTTPException

from .schemas import ReportRequest
from .repository import ReportRepository
from .factory import ReportFactory
from .renderers import ReportRenderer, HTMLRenderer, PdfRenderer

logger = logging.getLogger(__name__)


class ReportService:
    def __init__(self, repo: ReportRepository = None, renderer: ReportRenderer = None):
        if repo is None:
            raise ValueError(
                "ReportService requires a ReportRepository instance. "
                "Ensure the DI container (get_report_service) provides one."
            )
        self.repo = repo
        self.factory = ReportFactory(self.repo)
        self.default_renderer = renderer or HTMLRenderer()

    async def generate_report(self, request_data: ReportRequest) -> Union[str, bytes]:
        try:
            report = self.factory.create_report(request_data)
            data_dict = await report.generate()

            renderer = self.default_renderer
            if request_data.format == "pdf":
                renderer = PdfRenderer()

            return await renderer.render(data_dict)

        except HTTPException:
            raise
        except NotImplementedError as e:
            raise HTTPException(status_code=501, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception:
            # Log the full traceback server-side; never leak internal details to the client.
            logger.exception(
                "[ReportService] Unhandled error during %s report generation",
                request_data.report_type,
            )
            raise HTTPException(
                status_code=500,
                detail="Report generation failed. Please try again or contact support.",
            )
