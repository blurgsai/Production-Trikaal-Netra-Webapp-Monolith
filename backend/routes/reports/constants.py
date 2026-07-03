"""
routes/reports/constants.py — Single source of truth for the reports package.

Rules:
  - No business logic here. Pure data.
  - No imports from within this package (prevents circular deps).
  - Every constant that is used in more than one module lives here.
"""
from typing import Dict, Final

# ---------------------------------------------------------------------------
# Event type → human-readable label
# ---------------------------------------------------------------------------
# Used in every report section that displays event names.
# Falls back to ev_type.replace("_", " ").title() for unknown types — so
# only types that need a non-obvious label need an entry here.

EVENT_LABEL_MAP: Final[Dict[str, str]] = {
    "anomalous_acceleration": "Anomalous Acceleration",
    "anomalous_turn_rate":    "Anomalous Turn Rate",
    "prolonged_stationary":   "Prolonged Stationary",
    "prolonged_low_speed":    "Prolonged Low Speed",
    "dark_ship":              "Dark Ship Activity",
    "signal_lost":            "Signal Lost",
    "geofence_intrusion":     "Geofence Intrusion",
    "geofence_enter":         "Geofence Entry",
    "geofence_exit":          "Geofence Exit",
    "geofence_violation":     "Geofence Violation",
    "spoofing_detected":      "AIS Spoofing",
    "identity_mismatch":      "Identity Mismatch",
}

# ---------------------------------------------------------------------------
# Event type → severity fallback
# ---------------------------------------------------------------------------
# Applied ONLY when an event document has a null/missing severity field.
# If the document carries severity, this map is ignored.
# Source of truth for severity when the pipeline hasn't set it yet.

EVENT_SEVERITY_FALLBACK: Final[Dict[str, str]] = {
    "anomalous_acceleration": "warning",
    "anomalous_turn_rate":    "warning",
    "prolonged_stationary":   "info",
    "prolonged_low_speed":    "info",
    "dark_ship":              "high",
    "signal_lost":            "warning",
    "geofence_intrusion":     "warning",
    "geofence_enter":         "warning",
    "geofence_exit":          "info",
    "geofence_violation":     "warning",
    "spoofing_detected":      "high",
    "identity_mismatch":      "high",
}

# ---------------------------------------------------------------------------
# Density map PDF sentinel
# ---------------------------------------------------------------------------
# GenericReport (PDF mode) stores DENSITY_MAP_B64_VALUE as the density
# section's map_base64.  The Jinja2 template renders it inside an <img> tag:
#
#   <img src="data:image/png;base64,__DENSITY_MAP_PENDING__" ...>
#
# PdfRenderer searches the final page HTML for DENSITY_MAP_SENTINEL (the
# full <img> src string) and replaces it with a real base64 screenshot taken
# inside its own Playwright session — eliminating a second browser launch.
#
# Both values are derived from a single string so they cannot diverge.

_DENSITY_INNER         = "__DENSITY_MAP_PENDING__"
DENSITY_MAP_B64_VALUE  = _DENSITY_INNER                          # used by generic.py
DENSITY_MAP_SENTINEL   = f"data:image/png;base64,{_DENSITY_INNER}"  # searched by renderers.py
