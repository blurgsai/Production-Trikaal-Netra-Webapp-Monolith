"""
factory.py — Maps report_type strings to report builder classes.

To add a new report type:
  1. Create builders/<type>.py and implement BaseReport.
  2. Import the class below and add it to _REGISTRY.
  3. Add its template to renderers._TEMPLATE_MAP.
  4. Add it to schemas.ReportRequest's Literal if needed.
"""
from .schemas import ReportRequest
from .builders import BaseReport, TrackReport, GenericReport, InsightReport
from .repository import ReportRepository

_REGISTRY: dict[str, type[BaseReport]] = {
    "track":   TrackReport,
    "generic": GenericReport,
    "insight": InsightReport,
}


class ReportFactory:
    def __init__(self, repo: ReportRepository):
        self.repo = repo

    def create_report(self, request: ReportRequest) -> BaseReport:
        report_cls = _REGISTRY.get(request.report_type)
        if report_cls is None:
            raise ValueError(f"Unknown report type: {request.report_type!r}")
        return report_cls(self.repo, request)
