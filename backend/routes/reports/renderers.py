"""
renderers.py — Thin rendering layer.

HTMLRenderer:  Jinja2 template → HTML string.
PdfRenderer:   HTML → Chromium (Playwright) → PDF bytes.

For Generic reports the density map is rendered inside the *same* Playwright
browser that produces the PDF, eliminating a redundant second browser launch.
GenericReport.generate() stores the Leaflet HTML source in data["_density_html_src"]
and a sentinel in the density section's map_base64.  PdfRenderer detects both,
screenshots the density page first, injects the real base64, then generates the PDF —
all within one Chromium process.

To add a renderer for a new report type, add its template to _TEMPLATE_MAP
and create a new entry in builders/__init__.py — nothing here needs to change.

No CSS lives here. No business logic lives here.
"""
import base64
import os
from abc import ABC, abstractmethod
from typing import Any, Dict

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .constants import DENSITY_MAP_SENTINEL as _DENSITY_SENTINEL

_env = Environment(
    loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), "html_templates")),
    autoescape=select_autoescape(["html"]),
)

# Maps BaseReport.TEMPLATE_KEY → Jinja2 template filename.
# Add an entry here whenever a new report type is implemented.
_TEMPLATE_MAP: Dict[str, str] = {
    "track":   "track_report.html",
    "generic": "generic_report.html",
    "insight": "insight_report.html",
}


class ReportRenderer(ABC):
    @abstractmethod
    async def render(self, data: Dict[str, Any]) -> Any:
        ...


class HTMLRenderer(ReportRenderer):
    def __init__(self, for_pdf: bool = False):
        """
        for_pdf=True skips the external Google Fonts <link> so Playwright
        doesn't have to wait for a network request during PDF rendering.
        """
        self._for_pdf = for_pdf

    async def render(self, data: Dict[str, Any]) -> str:
        template_name = _TEMPLATE_MAP.get(data.get("report_key", ""), "track_report.html")
        tmpl = _env.get_template(template_name)
        return tmpl.render(
            report_type=data.get("report_type", "Report"),
            generated_at=data.get("generated_at", ""),
            metadata=data.get("metadata", {}),
            data=data.get("data", []),
            is_pdf=self._for_pdf,
        )


class PdfRenderer(ReportRenderer):
    """
    Renders HTML in headless Chromium via Playwright.
    Viewport is set to A4 width (794 px) so nothing gets scaled on print.

    Uses sync_playwright inside asyncio.to_thread() to avoid the Windows
    SelectorEventLoop limitation (async_playwright raises NotImplementedError
    when asyncio.create_subprocess_exec() is called on Windows).

    Generic report optimisation: if data contains "_density_html_src" the
    density screenshot is taken on a separate page inside the *same* browser
    process before the PDF is generated.  This collapses two Chromium launches
    into one, saving ~4–6 s per Generic PDF request.
    """

    def __init__(self):
        self._html = HTMLRenderer(for_pdf=True)

    async def render(self, data: Dict[str, Any]) -> bytes:
        import asyncio

        # Pop the density HTML source before rendering — it must not reach Jinja2.
        density_html_src = data.pop("_density_html_src", None)

        html = await self._html.render(data)

        def _sync_pdf(page_html: str, density_src: str) -> bytes:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)

                # If the report carries a pending density map, screenshot it now
                # using the same browser instance (no second Chromium spawn).
                if density_src and _DENSITY_SENTINEL in page_html:
                    dp = browser.new_page(viewport={"width": 800, "height": 500})
                    dp.set_content(density_src, wait_until="networkidle", timeout=30_000)
                    density_b64 = base64.b64encode(dp.screenshot(type="png")).decode()
                    dp.close()
                    page_html = page_html.replace(
                        _DENSITY_SENTINEL,
                        f"data:image/png;base64,{density_b64}",
                    )

                page = browser.new_page(viewport={"width": 794, "height": 1123})
                page.set_content(page_html, wait_until="networkidle", timeout=30_000)
                result = page.pdf(
                    format="A4",
                    print_background=True,
                    scale=1,
                    margin={"top": "15mm", "bottom": "15mm", "left": "10mm", "right": "10mm"},
                )
                browser.close()
            return result

        return await asyncio.to_thread(_sync_pdf, html, density_html_src or "")
