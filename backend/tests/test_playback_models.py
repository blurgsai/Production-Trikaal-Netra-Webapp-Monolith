"""Unit tests for src.features.playback.models — the per-event-type `information`
discriminated union and the mapper that dispatches into it.

See src/features/playback/models/__init__.py's module docstring for why this
can't be a Pydantic `Field(discriminator=...)` union: the tag (`event_details.type`)
lives on the parent, not inside `information` itself. Dispatch is done by hand in
map_event_details, keyed off INFORMATION_MODELS.
"""
from src.features.playback.models import (
    INFORMATION_MODELS,
    AnomalousAccelerationInformation,
    AnomalousJerkInformation,
    CompoundEventInformation,
    CoordinatedDarkActivityInformation,
    DarkAfterDepartureInformation,
    DarkShipInformation,
    DuplicateMmsiInformation,
    EventDetails,
    GeofenceIntrusionInformation,
    HighSpeedInformation,
    ParallelMovementInformation,
    PortIntrusionInformation,
    ProlongedLowSpeedInformation,
    ProlongedStationaryInformation,
    SignalLostInformation,
    SuddenStopInformation,
    UneconomicalTransitInformation,
    UnknownEventInformation,
    VesselRendezvousInformation,
    map_event_details,
)


def make_doc(event_type: str, information: dict) -> dict:
    """A minimal raw Mongo event doc, just enough for map_event_details."""
    return {
        "type": event_type,
        "location": {"type": "Point", "coordinates": [65.0, 15.0]},
        "timestamp": None,
        "start_time": None,
        "end_time": None,
        "duration": {"value": 30, "unit": "seconds"},
        "vessels_involved": [366168522],
        "severity": "high",
        "model": "heuristic",
        "status": "confirmed",
        "s2_cell_id": None,
        "temporality": "bounded",
        "event_source": "spark",
        "information": information,
    }


# ── INFORMATION_MODELS dispatch table ────────────────────────────────────────────


class TestInformationModelsTable:
    def test_all_16_atomic_types_registered(self):
        expected = {
            "geofence_intrusion", "dark_ship", "signal_lost", "dark_after_departure",
            "port_intrusion", "sudden_stop", "anomalous_acceleration", "anomalous_jerk",
            "high_speed", "prolonged_low_speed", "prolonged_stationary", "uneconomical_transit",
            "vessel_rendezvous", "parallel_movement", "duplicate_mmsi", "coordinated_dark_activity",
        }
        assert set(INFORMATION_MODELS.keys()) == expected


# ── Per-type dispatch via map_event_details ──────────────────────────────────────


class TestMapEventDetailsDispatchesByType:
    def test_geofence_intrusion(self):
        doc = make_doc("geofence_intrusion", {
            "geofence_id": "geo-1", "geofence_name": "Oman EEZ", "Has_exited_polygon": True,
        })
        info = map_event_details(doc).information
        assert isinstance(info, GeofenceIntrusionInformation)
        assert info.Has_exited_polygon is True

    def test_dark_ship(self):
        doc = make_doc("dark_ship", {
            "vessel_update_rate_per_hour": 0.0, "area_average_update_rate_per_hour": 112.0,
            "time_since_last_update_seconds": 3600,
        })
        info = map_event_details(doc).information
        assert isinstance(info, DarkShipInformation)
        assert info.area_average_update_rate_per_hour == 112.0

    def test_signal_lost(self):
        doc = make_doc("signal_lost", {
            "detector": "ais_gap_monitor", "threshold_value": 900,
            "signal_lost_duration_seconds": 1200,
            "last_known_position": {"type": "Point", "coordinates": [65.0, 15.0]},
        })
        info = map_event_details(doc).information
        assert isinstance(info, SignalLostInformation)
        assert info.detector == "ais_gap_monitor"

    def test_dark_after_departure_nested_thresholds(self):
        doc = make_doc("dark_after_departure", {
            "thresholds": {"departure_to_dark_threshold_seconds": 21600},
            "port_id": "port-1", "port_departure_time": "2024-01-01T00:00:00Z",
            "dark_start_time": "2024-01-01T06:00:00Z", "time_since_departure_seconds": 21600,
            "vessel_update_rate_per_hour": 0.0, "area_average_update_rate_per_hour": 114.0,
            "time_since_last_update_seconds": 3600,
        })
        info = map_event_details(doc).information
        assert isinstance(info, DarkAfterDepartureInformation)
        assert info.thresholds.departure_to_dark_threshold_seconds == 21600

    def test_port_intrusion(self):
        doc = make_doc("port_intrusion", {
            "port_id": "port-1", "restriction_type": "port_security_zone",
            "intrusion_duration_seconds": 3600, "violation_count": 1,
        })
        info = map_event_details(doc).information
        assert isinstance(info, PortIntrusionInformation)
        assert info.violation_count == 1

    def test_sudden_stop(self):
        doc = make_doc("sudden_stop", {
            "deceleration_mps2": -1.2, "threshold_positive_acceleration_mps2": 0.6,
            "threshold_negative_acceleration_mps2": -0.6, "acceleration_direction": "negative",
            "speed_before_mps": 8.0, "speed_after_mps": 1.0, "speed_drop_mps": 7.0,
        })
        info = map_event_details(doc).information
        assert isinstance(info, SuddenStopInformation)
        assert info.deceleration_mps2 == -1.2

    def test_anomalous_acceleration(self):
        doc = make_doc("anomalous_acceleration", {
            "threshold_positive_acceleration_mps2": 0.4, "acceleration_direction": "positive",
            "observed_acceleration_mps2": 1.1, "speed_before_mps": 2.0, "speed_after_mps": 3.0,
            "speed_change_mps": 1.0,
        })
        info = map_event_details(doc).information
        assert isinstance(info, AnomalousAccelerationInformation)
        assert info.observed_acceleration_mps2 == 1.1

    def test_anomalous_jerk(self):
        doc = make_doc("anomalous_jerk", {
            "threshold_positive_jerk_mps3": 0.05, "mean_jerk_mps3": 0.01,
            "jerk_direction": "positive", "observed_jerk_mps3": 0.09,
            "jerk_peak_mps3": 0.09,
        })
        info = map_event_details(doc).information
        assert isinstance(info, AnomalousJerkInformation)
        assert info.jerk_peak_mps3 == 0.09

    def test_high_speed(self):
        doc = make_doc("high_speed", {
            "min_speed_mps": 5.0, "max_speed_mps": 12.0, "mean_speed_mps": 8.0,
            "threshold_mps": 7.7, "trigger_speed_mps": 12.0,
        })
        info = map_event_details(doc).information
        assert isinstance(info, HighSpeedInformation)
        assert info.trigger_speed_mps == 12.0

    def test_prolonged_low_speed(self):
        doc = make_doc("prolonged_low_speed", {
            "min_speed_mps": 0.1, "max_speed_mps": 2.0, "threshold_mps": 2.5,
        })
        info = map_event_details(doc).information
        assert isinstance(info, ProlongedLowSpeedInformation)

    def test_prolonged_stationary_has_threshold_duration(self):
        doc = make_doc("prolonged_stationary", {
            "min_speed_mps": 0.0, "max_speed_mps": 0.3, "threshold_mps": 0.5,
            "threshold_duration": 7200,
        })
        info = map_event_details(doc).information
        assert isinstance(info, ProlongedStationaryInformation)
        assert info.threshold_duration == 7200

    def test_uneconomical_transit(self):
        doc = make_doc("uneconomical_transit", {
            "average_sog_knots": 8.0, "current_sog_knots": 6.0,
            "voyage_duration_hours": 24.0, "speed_threshold_knots": 10.0,
            "duration_threshold_hours": 4.0,
        })
        info = map_event_details(doc).information
        assert isinstance(info, UneconomicalTransitInformation)
        assert info.average_sog_knots == 8.0

    def test_vessel_rendezvous_nested_thresholds(self):
        doc = make_doc("vessel_rendezvous", {
            "min_distance_m": 50.0, "max_distance_m": 300.0, "median_distance_m": 120.0,
            "avg_speed_v1_knots": 5.0, "avg_speed_v2_knots": 4.5,
            "thresholds": {"distance_threshold_m": 1000, "duration_threshold_seconds": 1800},
        })
        info = map_event_details(doc).information
        assert isinstance(info, VesselRendezvousInformation)
        assert info.thresholds.distance_threshold_m == 1000

    def test_parallel_movement_nested_thresholds(self):
        doc = make_doc("parallel_movement", {
            "distance_m": 200.0, "heading_difference_degrees": 1.5,
            "speed_difference_mps": 0.2, "parallelity_score": 0.94,
            "sustained_duration_seconds": 1800,
            "thresholds": {"distance_threshold_m": 1000, "duration_threshold_seconds": 1800},
        })
        info = map_event_details(doc).information
        assert isinstance(info, ParallelMovementInformation)
        assert info.parallelity_score == 0.94

    def test_duplicate_mmsi(self):
        doc = make_doc("duplicate_mmsi", {
            "spoofed_mmsi": 366168522, "distance_discrepancy_m": 50000.0,
            "speed_required_to_match": 900.0, "vessel_max_speed": 22.0,
            "probability_of_spoofing": 0.96,
        })
        info = map_event_details(doc).information
        assert isinstance(info, DuplicateMmsiInformation)
        assert info.spoofed_mmsi == 366168522

    def test_coordinated_dark_activity_nested_list(self):
        doc = make_doc("coordinated_dark_activity", {
            "thresholds": {"distance_threshold_m": 1000, "coordination_threshold_window_seconds": 3600},
            "cluster_size": 4, "coordination_score": 0.9, "co_dark_window_seconds": 900,
            "area_average_update_rate_per_hour": 112.0,
            "vessel_update_rates": [
                {"vessel_id": 366168522, "rate_per_hour": 10.0, "last_update_seconds": 5.0},
                {"vessel_id": "2", "rate_per_hour": 12.0, "last_update_seconds": 6.0},
            ],
            "cluster_average_update_rate": 11.0,
        })
        info = map_event_details(doc).information
        assert isinstance(info, CoordinatedDarkActivityInformation)
        assert len(info.vessel_update_rates) == 2
        assert info.vessel_update_rates[0].vessel_id == 366168522
        assert info.vessel_update_rates[1].vessel_id == "2"


# ── extra="allow" preserves fields not in the modeled schema ────────────────────


class TestExtraFieldsPreserved:
    def test_unmodeled_extra_field_survives_round_trip(self):
        doc = make_doc("sudden_stop", {
            "deceleration_mps2": -1.2,
            "some_future_field_the_data_team_added": "keep me",
        })
        info = map_event_details(doc).information
        assert isinstance(info, SuddenStopInformation)
        assert info.model_dump()["some_future_field_the_data_team_added"] == "keep me"


# ── Unknown/future type fallback — the ambiguity regression test ────────────────
# All 16 information models are all-optional-fields + extra="allow", so a plain
# `dict[str, Any]` union member would let Pydantic silently structurally match an
# unrelated dict into the WRONG model. UnknownEventInformation (a RootModel) exists
# specifically so the mapper's own dispatch decision — not Pydantic's smart-union
# guessing — determines the outcome.


class TestUnknownTypeFallback:
    def test_unrecognized_type_falls_back_without_being_recognized(self):
        doc = make_doc("totally_unknown_future_event_type", {
            "deceleration_mps2": -1.2, "threshold_positive_acceleration_mps2": 0.6,
            "threshold_negative_acceleration_mps2": -0.6, "acceleration_direction": "negative",
            "speed_before_mps": 8.0, "speed_after_mps": 1.0, "speed_drop_mps": 7.0,
        })
        info = map_event_details(doc).information
        assert isinstance(info, UnknownEventInformation)
        assert not isinstance(info, SuddenStopInformation)
        assert info.root["deceleration_mps2"] == -1.2

    def test_missing_type_falls_back(self):
        doc = make_doc("", {"anything": 1})
        doc["type"] = None
        info = map_event_details(doc).information
        assert isinstance(info, UnknownEventInformation)

    def test_fallback_serializes_as_plain_object_not_wrapped_in_root(self):
        doc = make_doc("totally_unknown_future_event_type", {"foo": "bar"})
        details = map_event_details(doc)
        dumped = details.model_dump(mode="json")
        assert dumped["information"] == {"foo": "bar"}


# ── Compound events (services/ constructs this directly, not via the dispatch table) ──


class TestCompoundEventInformation:
    def test_constructs_and_serializes_flat(self):
        details = EventDetails(
            type="vessel_rendezvous+dark_ship",
            information=CompoundEventInformation(
                constituent_events={"evt1": "vessel_rendezvous", "evt2": "dark_ship"}
            ),
        )
        assert isinstance(details.information, CompoundEventInformation)
        dumped = details.model_dump(mode="json")
        assert dumped["information"] == {
            "constituent_events": {"evt1": "vessel_rendezvous", "evt2": "dark_ship"}
        }


# ── EventDetails default (no information passed at all) ─────────────────────────


class TestEventDetailsInformationDefault:
    def test_default_is_empty_unknown_information(self):
        details = EventDetails(type="whatever")
        assert isinstance(details.information, UnknownEventInformation)
        assert details.information.root == {}
