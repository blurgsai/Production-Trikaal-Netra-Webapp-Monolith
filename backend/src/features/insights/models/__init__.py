from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from pydantic import BaseModel

# Fixed category buckets — only types present in data will get non-zero counts.
CATEGORY_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "suspicious",
        "title": "Suspicious Activity",
        "types": [
            "coordinated_dark_activity",
            "parallel_movement",
            "dark_ship",
            "route_deviation",
            "sudden_stop",
            "high_speed",
            "anomalous_jerk",
            "anomalous_acceleration",
            "prolonged_low_speed",
            "prolonged_stationary",
            "uneconomical_transit",
            "unusual_transit",
        ],
    },
    {
        "id": "identity",
        "title": "Identity & Vessel Changes",
        "types": [
            "callsign_change",
            "name_change",
            "vessel_parameter_change",
            "identity_change",
            "flag_change",
            "imo_change",
            "frequent_identity_change",
        ],
    },
    {
        "id": "ais",
        "title": "AIS & Signal Anomalies",
        "types": [
            "signal_lost",
            "ais_active_near_indian_ports_only",
            "invalid_identification_info",
            "duplicate_mmsi",
            "position_on_land",
            "dead_ship_identity",
        ],
    },
    {
        "id": "geofence",
        "title": "Geofence & Port Activity",
        "types": [
            "geofence_intrusion",
            "port_intrusion",
            "country_intrusion",
            "coastal_proximity_without_port_call",
            "dark_after_departure",
            "vessel_rendezvous",
        ],
    },
    {
        "id": "lloyds",
        "title": "Lloyd's Changes",
        "types": [
            "lloyds_identity_change",
            "lloyds_flag_change",
            "lloyds_name_change",
            "lloyds_callsign_change",
            "lloyds_imo_change",
            "lloyds_mmsi_change",
            "lloyds_ownership_change",
            "lloyds_vessel_parameter_change",
        ],
    },
]


class InsightsKpi(BaseModel):
    id: str
    label: str
    value: int


class InsightsEventTypeShare(BaseModel):
    key: str
    label: str
    count: int
    percent: int


class InsightsTimelinePoint(BaseModel):
    date: str
    count: int


class InsightsCategoryItem(BaseModel):
    key: str
    label: str
    count: int


class InsightsCategory(BaseModel):
    id: str
    title: str
    total: int
    items: list[InsightsCategoryItem]


class InsightsDashboard(BaseModel):
    kpis: list[InsightsKpi]
    event_type_shares: list[InsightsEventTypeShare]
    event_type_total: int
    timeline: list[InsightsTimelinePoint]
    categories: list[InsightsCategory]


class InsightsTimelineResponse(BaseModel):
    timeline: list[InsightsTimelinePoint]


def _format_type_label(type_key: str) -> str:
    return " ".join(part.capitalize() for part in type_key.replace("_", " ").split())


def _build_timeline(
    daily_raw: list[dict[str, Any]],
    *,
    window_start: datetime | None,
    window_end: datetime | None,
    timeline_range: str,
) -> list[InsightsTimelinePoint]:
    """Build chart points for the full selected window, filling days with 0 events."""
    if window_start is None or window_end is None:
        return [
            InsightsTimelinePoint(
                date=str(row["day"]),
                count=int(row["count"]),
            )
            for row in daily_raw
        ]

    by_day = {row["day"]: int(row["count"]) for row in daily_raw}
    start_day = window_start.date()
    end_day = window_end.date()
    if end_day < start_day:
        end_day = start_day

    span_days = (end_day - start_day).days + 1
    # Include year on labels when the window can cross year boundaries.
    include_year = span_days > 90 or timeline_range in {"1y", "6m", "all"}

    points: list[InsightsTimelinePoint] = []
    for offset in range(span_days):
        day = start_day + timedelta(days=offset)
        key = day.isoformat()
        label = (
            day.strftime("%b %d, %Y") if include_year else day.strftime("%b %d")
        )
        points.append(
            InsightsTimelinePoint(date=label, count=by_day.get(key, 0))
        )
    return points


def map_insights_timeline(
    daily_events: list[dict[str, Any]],
    *,
    window_start: datetime | None,
    window_end: datetime | None,
    timeline_range: str,
) -> InsightsTimelineResponse:
    if window_start is not None and window_end is not None:
        timeline = _build_timeline(
            daily_events,
            window_start=window_start,
            window_end=window_end,
            timeline_range=timeline_range,
        )
    else:
        timeline = []
    return InsightsTimelineResponse(timeline=timeline)


def map_insights_dashboard(
    *,
    vessel_count: int,
    type_counts: list[dict[str, Any]],
    high_priority_count: int,
    mid_priority_count: int,
    low_priority_count: int,
) -> InsightsDashboard:
    type_map = {row["type"]: int(row["count"]) for row in type_counts}
    total_events = sum(type_map.values())

    kpis = [
        InsightsKpi(
            id="total-vessels",
            label="Total Vessels Currently Tracked",
            value=vessel_count,
        ),
        InsightsKpi(
            id="total-events",
            label="Total Events",
            value=total_events,
        ),
        InsightsKpi(
            id="high-priority",
            label="High Priority Events",
            value=high_priority_count,
        ),
        InsightsKpi(
            id="mid-priority",
            label="Mid Priority Events",
            value=mid_priority_count,
        ),
        InsightsKpi(
            id="low-priority",
            label="Low Priority Events",
            value=low_priority_count,
        ),
    ]

    # Top 5 types + Others for donut
    sorted_types = sorted(type_counts, key=lambda r: r["count"], reverse=True)
    top = sorted_types[:5]
    others_count = sum(r["count"] for r in sorted_types[5:])
    shares: list[InsightsEventTypeShare] = []
    for row in top:
        pct = round((row["count"] / total_events) * 100) if total_events else 0
        shares.append(
            InsightsEventTypeShare(
                key=row["type"],
                label=_format_type_label(row["type"]),
                count=row["count"],
                percent=pct,
            )
        )
    if others_count > 0:
        pct = round((others_count / total_events) * 100) if total_events else 0
        shares.append(
            InsightsEventTypeShare(
                key="others",
                label="Others",
                count=others_count,
                percent=pct,
            )
        )

    categories: list[InsightsCategory] = []
    for definition in CATEGORY_DEFINITIONS:
        items: list[InsightsCategoryItem] = []
        for type_key in definition["types"]:
            count = type_map.get(type_key, 0)
            if count <= 0:
                continue
            items.append(
                InsightsCategoryItem(
                    key=type_key,
                    label=_format_type_label(type_key),
                    count=count,
                )
            )
        items.sort(key=lambda i: i.count, reverse=True)
        total = sum(i.count for i in items)
        if total <= 0:
            continue
        categories.append(
            InsightsCategory(
                id=definition["id"],
                title=definition["title"],
                total=total,
                items=items,
            )
        )

    return InsightsDashboard(
        kpis=kpis,
        event_type_shares=shares,
        event_type_total=total_events,
        timeline=[],
        categories=categories,
    )
