"""Playback feature — Layer 2 (models + mappers).

Domain models for the playback response, matching the frontend contract in
frontend/src/features/playback/api/types.ts (snake_case field names preserved
exactly — the frontend owns raw->camelCase mapping). Plus the mappers that turn
raw Mongo documents / ClickHouse rows into these models.

`information` is a per-event-type discriminated union: the parent event's own
`type` field is the discriminator (there's no tag embedded in `information`
itself, so this can't be a Pydantic `Field(discriminator=...)` union — that
requires the tag on each union member). Instead `map_event_details` looks up
`type` in `INFORMATION_MODELS` and validates `information` against the matching
model explicitly, then hands the constructed instance to `EventDetails`. Every
one of these per-type models declares only optional fields plus `extra="allow"`,
so — unlike a tagged union — nothing here rejects an unrecognized shape; an
unknown/future event type (or a compound event's synthetic "type_a+type_b"
type) falls through to `UnknownEventInformation`, which behaves like a plain
dict on the wire (see its docstring for why a bare `dict[str, Any]` union
member doesn't work here).

Every branch always hands `EventDetails` an *already-constructed* model
instance for `information`, never a raw dict — Pydantic only takes the
"already one of the union members, keep as-is" fast path for instances it
already knows the type of. A raw dict would instead re-run union resolution
against all 16+ optional-every-field models and could match the wrong one.

── When the data team changes something, what actually needs editing ──────────

1. Pure rename of an existing field's raw source key (same value, new key
   name) — backend-only, IF done via `validation_alias` rather than a literal
   attribute rename. Keep the Pydantic field named after the STABLE public
   name (what the frontend already expects on the wire) and point
   `validation_alias=` at whatever the raw key is now, e.g.:
       deceleration_mps2: float | None = Field(default=None, validation_alias="decel_mps2")
   Output JSON key is unchanged, so nothing downstream (frontend types,
   eventTypeMappers.ts, UI) has to move. Renaming the attribute itself
   instead changes the wire contract and pulls the frontend along with it —
   that's a design choice each time, not automatic.

2. New/reshaped data you want the UI to actually display, or a brand-new
   event type — touches both sides. `extra="allow"` means new raw fields
   already arrive over the wire even if unmodeled, but nothing renders data
   nobody's mapped yet, so surfacing it always means frontend/src/features/
   playback/api/types.ts + model/eventTypeMappers.ts (+ model/eventTypeTypes.ts
   and a UI plugin if it's a new event type). See the models/__init__.py
   module-level notes in project memory for the full file checklist.

3. Backend-internal business-logic change that doesn't alter the response
   shape (a threshold value, how severity is derived, an upstream heuristic)
   — backend-only, and the frontend can't tell it happened at all, because
   the JSON contract is identical. This is the strongest form of insulation
   this layer buys, and it usually lives in services/__init__.py rather than
   here. The inverse — starting to *display* a field that was already
   arriving unmodeled via extra="allow" — is frontend-only for the same
   reason: the backend never has to know the frontend started reading it.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, RootModel

from src.shared.serialization import deep_serialize_datetimes, serialize_datetime

# ── Shared domain models ────────────────────────────────────────────────────────


class VesselPosition(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    speed_mps: float | None = None
    course: float | None = None
    heading: float | None = None


class TimeWindow(BaseModel):
    query_start: int | None = None
    query_end: int | None = None
    event_start: int | None = None
    event_end: int | None = None
    buffer_hours: int = 3


# ── information: per-event-type schemas ─────────────────────────────────────────
# Mirrors the *InformationRaw interfaces in the frontend's api/types.ts, one
# section per event type. Every model is all-optional with extra="allow" —
# these describe real-world Spark/heuristic output, not a strict contract we
# want to 500 on if a field is missing or an extra one shows up.

# ── geofence_intrusion ───────────────────────────────────────────────────────


class GeofenceIntrusionInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    geofence_id: str | None = None
    geofence_name: str | None = None
    Has_exited_polygon: bool | None = None  # capital H — exact data-team field name


# ── dark_ship ────────────────────────────────────────────────────────────────


class DarkShipInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    vessel_update_rate_per_hour: float | None = None
    area_average_update_rate_per_hour: float | None = None
    time_since_last_update_seconds: float | None = None


# ── signal_lost ──────────────────────────────────────────────────────────────


class SignalLostInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    detector: str | None = None
    threshold_value: float | None = None
    signal_lost_duration_seconds: float | None = None
    # Duplicates the top-level `location` — kept loose since the frontend
    # mapper doesn't read it either.
    last_known_position: dict[str, Any] | None = None


# ── dark_after_departure ──────────────────────────────────────────────────────


class DarkAfterDepartureThresholds(BaseModel):
    model_config = ConfigDict(extra="allow")

    departure_to_dark_threshold_seconds: float | None = None


class DarkAfterDepartureInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    thresholds: DarkAfterDepartureThresholds | None = None
    port_id: str | None = None
    port_departure_time: str | None = None
    dark_start_time: str | None = None
    time_since_departure_seconds: float | None = None
    vessel_update_rate_per_hour: float | None = None
    area_average_update_rate_per_hour: float | None = None
    time_since_last_update_seconds: float | None = None


# ── port_intrusion ─────────────────────────────────────────────────────────


class PortIntrusionInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    port_id: str | None = None
    restriction_type: str | None = None
    intrusion_duration_seconds: float | None = None
    violation_count: int | None = None


# ── kinematics family (sudden_stop / anomalous_acceleration / anomalous_jerk) ──
# All three carry a signed kinematic reading plus a bidirectional threshold band.
# Values already in SI (m/s² / m/s³).


class SuddenStopInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    deceleration_mps2: float | None = None
    threshold_positive_acceleration_mps2: float | None = None
    threshold_negative_acceleration_mps2: float | None = None
    acceleration_direction: str | None = None
    threshold_type: str | None = None
    speed_before_mps: float | None = None
    speed_after_mps: float | None = None
    speed_drop_mps: float | None = None


class AnomalousAccelerationInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    threshold_positive_acceleration_mps2: float | None = None
    threshold_negative_acceleration_mps2: float | None = None
    acceleration_direction: str | None = None
    threshold_type: str | None = None
    observed_acceleration_mps2: float | None = None
    speed_before_mps: float | None = None
    speed_after_mps: float | None = None
    speed_change_mps: float | None = None


# Richest of the family — includes jerk distribution stats.
class AnomalousJerkInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    threshold_positive_jerk_mps3: float | None = None
    threshold_negative_jerk_mps3: float | None = None
    std_deviation_jerk: float | None = None
    mean_jerk_mps3: float | None = None
    q1_jerk: float | None = None
    q3_jerk: float | None = None
    trigger_jerk_mps3: float | None = None
    jerk_direction: str | None = None
    threshold_type: str | None = None
    calculation_method: str | None = None
    observed_jerk_mps3: float | None = None
    acceleration_before_mps2: float | None = None
    acceleration_after_mps2: float | None = None
    jerk_peak_mps3: float | None = None


# ── speed family (high_speed / prolonged_low_speed / prolonged_stationary / uneconomical_transit) ──
# high_speed, prolonged_low_speed and prolonged_stationary share the same 8 speed-
# statistic fields (m/s); prolonged_stationary adds threshold_duration.
# uneconomical_transit reports in knots/hours instead (frontend converts to m/s).


class HighSpeedInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    min_speed_mps: float | None = None
    max_speed_mps: float | None = None
    mean_speed_mps: float | None = None
    std_deviation_speed_mps: float | None = None
    q1_speed_mps: float | None = None
    q3_speed_mps: float | None = None
    threshold_mps: float | None = None
    trigger_speed_mps: float | None = None


class ProlongedLowSpeedInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    min_speed_mps: float | None = None
    max_speed_mps: float | None = None
    mean_speed_mps: float | None = None
    std_deviation_speed_mps: float | None = None
    q1_speed_mps: float | None = None
    q3_speed_mps: float | None = None
    threshold_mps: float | None = None
    trigger_speed_mps: float | None = None


class ProlongedStationaryInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    min_speed_mps: float | None = None
    max_speed_mps: float | None = None
    mean_speed_mps: float | None = None
    std_deviation_speed_mps: float | None = None
    q1_speed_mps: float | None = None
    q3_speed_mps: float | None = None
    threshold_mps: float | None = None
    threshold_duration: float | None = None
    trigger_speed_mps: float | None = None


class UneconomicalTransitInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    average_sog_knots: float | None = None
    current_sog_knots: float | None = None
    voyage_duration_hours: float | None = None
    speed_threshold_knots: float | None = None
    duration_threshold_hours: float | None = None


# ── proximity / multi-vessel family (vessel_rendezvous / parallel_movement / duplicate_mmsi / coordinated_dark_activity) ──
# All involve ≥2 vessels and a distance threshold. Speeds vary by unit per type
# (knots for rendezvous/duplicate_mmsi, m/s for parallel_movement) — the
# frontend mapper converts. Distances are metres throughout.


class VesselRendezvousThresholds(BaseModel):
    model_config = ConfigDict(extra="allow")

    distance_threshold_m: float | None = None
    duration_threshold_seconds: float | None = None


class VesselRendezvousInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    min_distance_m: float | None = None
    max_distance_m: float | None = None
    median_distance_m: float | None = None
    avg_speed_v1_knots: float | None = None
    avg_speed_v2_knots: float | None = None
    thresholds: VesselRendezvousThresholds | None = None


class ParallelMovementThresholds(BaseModel):
    model_config = ConfigDict(extra="allow")

    distance_threshold_m: float | None = None
    duration_threshold_seconds: float | None = None


class ParallelMovementInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    distance_m: float | None = None
    heading_difference_degrees: float | None = None
    speed_difference_mps: float | None = None
    parallelity_score: float | None = None
    sustained_duration_seconds: float | None = None
    thresholds: ParallelMovementThresholds | None = None


# `spoofed_mmsi` mirrors the MMSI being cloned.
class DuplicateMmsiInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    spoofed_mmsi: int | str | None = None
    distance_discrepancy_m: float | None = None
    speed_required_to_match: float | None = None
    vessel_max_speed: float | None = None
    probability_of_spoofing: float | None = None


# An N-vessel cluster (2–4) that goes AIS-dark together. `vessel_id` here is an
# internal vessel_id (same namespace as vessels_involved / trajectory keys), NOT
# an MMSI.
class CoordinatedDarkActivityThresholds(BaseModel):
    model_config = ConfigDict(extra="allow")

    distance_threshold_m: float | None = None
    coordination_threshold_window_seconds: float | None = None


class CoordinatedDarkVesselUpdateRate(BaseModel):
    model_config = ConfigDict(extra="allow")

    vessel_id: int | str | None = None
    rate_per_hour: float | None = None
    last_update_seconds: float | None = None


class CoordinatedDarkActivityInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    thresholds: CoordinatedDarkActivityThresholds | None = None
    cluster_size: int | None = None
    coordination_score: float | None = None
    co_dark_window_seconds: float | None = None
    area_average_update_rate_per_hour: float | None = None
    vessel_update_rates: list[CoordinatedDarkVesselUpdateRate] | None = None
    cluster_average_update_rate: float | None = None


# ── compound events ──────────────────────────────────────────────────────────
# Not part of INFORMATION_MODELS below (a compound event's `type` is a
# synthesized "type_a+type_b" string, never one of the 16 atomic keys) —
# get_compound_playback (services/) constructs this directly.


class CompoundEventInformation(BaseModel):
    model_config = ConfigDict(extra="allow")

    constituent_events: dict[str, str | None] = Field(default_factory=dict)


# ── fallback: unrecognized / future event types ─────────────────────────────────


class UnknownEventInformation(RootModel[dict[str, Any]]):
    """Wraps a plain dict for any `type` not in INFORMATION_MODELS.

    Can't use a bare `dict[str, Any]` union member instead: every model above
    has all-optional fields plus extra="allow", so Pydantic's smart-union
    matching would treat an arbitrary dict as a *structural* match against one
    of THEM (whichever scores best) rather than recognizing "this type wasn't
    in the table, leave it alone". Wrapping it in a RootModel gives it real
    type identity — the mapper always constructs this explicitly, so the value
    handed to EventDetails is already an instance of a union member and skips
    re-validation. On the wire it still serializes as a plain JSON object,
    exactly like a bare dict would (RootModel is transparent).
    """


# Dispatch table: atomic event `type` -> its `information` model. This IS the
# discriminator — see the module docstring for why it can't be a Pydantic
# `Field(discriminator=...)` union instead.
INFORMATION_MODELS: dict[str, type[BaseModel]] = {
    "geofence_intrusion": GeofenceIntrusionInformation,
    "dark_ship": DarkShipInformation,
    "signal_lost": SignalLostInformation,
    "dark_after_departure": DarkAfterDepartureInformation,
    "port_intrusion": PortIntrusionInformation,
    "sudden_stop": SuddenStopInformation,
    "anomalous_acceleration": AnomalousAccelerationInformation,
    "anomalous_jerk": AnomalousJerkInformation,
    "high_speed": HighSpeedInformation,
    "prolonged_low_speed": ProlongedLowSpeedInformation,
    "prolonged_stationary": ProlongedStationaryInformation,
    "uneconomical_transit": UneconomicalTransitInformation,
    "vessel_rendezvous": VesselRendezvousInformation,
    "parallel_movement": ParallelMovementInformation,
    "duplicate_mmsi": DuplicateMmsiInformation,
    "coordinated_dark_activity": CoordinatedDarkActivityInformation,
}

# Static type for EventDetails.information: any of the 16 atomic models, the
# compound model, or the UnknownEventInformation fallback. Runtime
# discrimination always happens in the mapper, never via this union alone —
# with every field on every model optional and extra="allow", a raw dict would
# validate against several of these ambiguously if pydantic had to guess.
InformationUnion = (
    GeofenceIntrusionInformation
    | DarkShipInformation
    | SignalLostInformation
    | DarkAfterDepartureInformation
    | PortIntrusionInformation
    | SuddenStopInformation
    | AnomalousAccelerationInformation
    | AnomalousJerkInformation
    | HighSpeedInformation
    | ProlongedLowSpeedInformation
    | ProlongedStationaryInformation
    | UneconomicalTransitInformation
    | VesselRendezvousInformation
    | ParallelMovementInformation
    | DuplicateMmsiInformation
    | CoordinatedDarkActivityInformation
    | CompoundEventInformation
    | UnknownEventInformation
)


# ── Event details / response models ─────────────────────────────────────────────


class EventDetails(BaseModel):
    # snake_case mirrors EventDetailsBaseRaw; extras (e.g. nested info) pass through.
    model_config = ConfigDict(extra="allow")

    type: str | None = None
    location: Any = None
    timestamp: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    duration: Any = None
    vessels_involved: list[str] = Field(default_factory=list)
    severity: str | None = None
    model: str | None = None
    status: str | None = None
    s2_cell_id: str | None = None
    temporality: str | None = None
    event_source: str | None = None
    constituent_types: list[str] | None = None
    information: InformationUnion = Field(default_factory=lambda: UnknownEventInformation({}))


class GeofencePolygon(BaseModel):
    geofence_id: str | None = None
    asset_name: str | None = None
    polygon: Any = None  # GeoJSON {type, coordinates}


class PortPolygon(BaseModel):
    port_id: str | None = None
    port_name: str | None = None
    polygon: Any = None  # GeoJSON {type, coordinates} — null when the port has no zone


class PlaybackResponse(BaseModel):
    # Zone extras (geofence_polygon / port_polygon) are injected only when present,
    # via extra="allow", so they don't appear as null keys for events without a zone.
    model_config = ConfigDict(extra="allow")

    event_details: EventDetails
    trajectories: dict[str, dict[str, VesselPosition]] = Field(default_factory=dict)
    time_window: TimeWindow


# ── Mappers ──────────────────────────────────────────────────────────────────────


def map_event_details(doc: dict, *, constituent_types: list[str] | None = None) -> EventDetails:
    event_type = doc.get("type")
    # Walk the info blob so any nested datetime becomes a 'Z'-suffixed string
    # before it's handed to the per-type model (or left as a dict).
    raw_information = deep_serialize_datetimes(doc.get("information") or {})
    information_model = INFORMATION_MODELS.get(event_type) if event_type else None
    information: InformationUnion = (
        information_model.model_validate(raw_information)
        if information_model
        else UnknownEventInformation(raw_information)
    )

    return EventDetails(
        type=event_type,
        location=doc.get("location"),
        timestamp=serialize_datetime(doc.get("timestamp")),
        start_time=serialize_datetime(doc.get("start_time")),
        end_time=serialize_datetime(doc.get("end_time")),
        duration=doc.get("duration"),
        vessels_involved=[str(v) for v in doc.get("vessels_involved", [])],
        severity=doc.get("severity"),
        model=doc.get("model"),
        status=doc.get("status"),
        s2_cell_id=doc.get("s2_cell_id"),
        temporality=doc.get("temporality"),
        event_source=doc.get("event_source"),
        constituent_types=constituent_types,
        information=information,
    )


def map_geofence_polygon(doc: dict, geofence_id: Any) -> GeofencePolygon:
    return GeofencePolygon(
        geofence_id=str(geofence_id) if geofence_id is not None else str(doc.get("_id")),
        asset_name=doc.get("asset_name") or doc.get("polygon_name"),
        polygon=doc.get("polygon"),
    )


def map_port_polygon(doc: dict, port_id: Any) -> PortPolygon:
    # Real port documents carry only a point `location`, not a zone polygon.
    return PortPolygon(
        port_id=str(port_id) if port_id is not None else str(doc.get("_id")),
        port_name=doc.get("port_name"),
        polygon=doc.get("polygon"),
    )
