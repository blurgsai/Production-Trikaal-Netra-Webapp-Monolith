"""
builders/insight.py — Insight Report builder.

Zero-input report: no AOI, no time range.
Captures a point-in-time snapshot of the monitored fleet using the
latest 50 events from dev.events, vessel_state aggregations, and an
optional ClickHouse fleet-speed snapshot.

Sections (in order):
  fleet_kpi             — vessel/event KPIs + severity strip
  active_events_summary — open/unresolved events (omitted when none)
  critical_highlight    — latest high-severity events (omitted when none)
  event_hotspot         — staticmap heatmap of event locations
  fleet_status          — nav-status breakdown, suspicious/spoofing counts,
                          flag distribution
  high_risk_vessels     — vessels in recent events AND marked suspicious
                          (omitted when none)
  event_intelligence    — event velocity, duration analysis, repeat offenders
  event_breakdown       — per-type card grid (sorted by count desc)
  fleet_speed           — ClickHouse speed distribution (omitted on failure)
  event_cards           — most-recent 30 events table
"""
from typing import Any, Dict, List

from ..maps import generate_event_heatmap_base64
from .base import BaseReport


class InsightReport(BaseReport):
    TEMPLATE_KEY = "insight"

    _EVENT_LIMIT = 50

    def __init__(self, repo, request):
        super().__init__(repo)

    async def generate(self) -> Dict[str, Any]:
        data = await self.repo.get_insight_data(limit=self._EVENT_LIMIT)

        event_locations = data.pop("event_locations", [])
        heatmap_b64     = await generate_event_heatmap_base64(None, event_locations)

        vessel_intel = data.get("vessel_intel", {})
        fleet_speed  = data.get("fleet_speed", {})

        sections: List[Dict[str, Any]] = []

        # 1. Fleet KPI — always present
        sections.append({
            "type":                    "fleet_kpi",
            "total_vessels":           data["total_vessels"],
            "total_events":            data["total_events"],
            "severity_counts":         data["severity_counts"],
            "active_events_count":     data.get("active_events_count", 0),
            "suspicious_vessel_count": vessel_intel.get("suspicious_count", 0),
        })

        # 2. Active / open events (omitted when none)
        # active_events_count = full-collection count (events with no end_time)
        # active_events       = up to 10 most recent open events from the fetched sample
        # The template already renders "Showing X of Y" when count > list length.
        if data.get("active_events_count", 0) > 0:
            sections.append({
                "type":               "active_events_summary",
                "active_events_count": data["active_events_count"],
                "active_events":       data.get("active_events", []),
            })

        # 3. Critical events highlight (omitted when none)
        if data.get("critical_events"):
            sections.append({
                "type":            "critical_highlight",
                "critical_events": data["critical_events"],
            })

        # 4. Event hotspot map
        sections.append({
            "type":        "event_hotspot",
            "heatmap_b64": heatmap_b64,
            "event_count": len(event_locations),
        })

        # 5. Fleet status from vessel_state (nav, suspicious, spoofing, flags)
        if vessel_intel:
            sections.append({
                "type":                 "fleet_status",
                "nav_status_breakdown": vessel_intel.get("nav_status_breakdown", []),
                "suspicious_count":     vessel_intel.get("suspicious_count", 0),
                "spoofing_count":       vessel_intel.get("spoofing_count", 0),
                "flag_distribution":    vessel_intel.get("flag_distribution", []),
            })

        # 6. High-risk cross-source vessels (omitted when none)
        if vessel_intel.get("high_risk_vessels"):
            sections.append({
                "type":    "high_risk_vessels",
                "vessels": vessel_intel["high_risk_vessels"],
            })

        # 7. Event intelligence (velocity, duration, repeat offenders)
        sections.append({
            "type":                  "event_intelligence",
            "event_velocity":        data.get("event_velocity"),
            "event_time_span_hours": data.get("event_time_span_hours"),
            "duration_stats":        data.get("duration_stats", []),
            "repeat_offenders":      data.get("repeat_offenders", []),
        })

        # 8. Event type breakdown
        sections.append({
            "type":         "event_breakdown",
            "type_summary": data["type_summary"],
        })

        # 9. Fleet speed snapshot (ClickHouse — omitted on failure)
        if fleet_speed:
            sections.append({
                "type":           "fleet_speed",
                "unique_vessels": fleet_speed["unique_vessels"],
                "avg_speed_kn":   fleet_speed["avg_speed_kn"],
                "distribution":   fleet_speed["distribution"],
                "window_hours":   fleet_speed["window_hours"],
            })

        # 10. Detailed event cards table (most verbose — last)
        sections.append({
            "type":          "event_cards",
            "recent_events": data["recent_events"],
        })

        return self._envelope("Fleet Insight Report", sections)
