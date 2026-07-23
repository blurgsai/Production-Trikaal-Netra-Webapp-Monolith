"""Unit tests for src.features.focus_mode.models — mappers + the ms<->seconds boundary."""
from src.features.focus_mode.models import map_trajectory_point, map_vessel_summary


class TestMapVesselSummary:
    def test_maps_fields(self):
        doc = {"vesselId": 123, "identification": {"shipName": "MV Test"}}
        result = map_vessel_summary(doc)
        assert result.vessel_id == 123
        assert result.ship_name == "MV Test"

    def test_missing_ship_name_falls_back_to_unknown(self):
        doc = {"vesselId": 456, "identification": {}}
        result = map_vessel_summary(doc)
        assert result.ship_name == "Unknown"

    def test_missing_identification_falls_back_to_unknown(self):
        doc = {"vesselId": 789}
        result = map_vessel_summary(doc)
        assert result.ship_name == "Unknown"


class TestMapTrajectoryPoint:
    def test_converts_ms_timestamp_to_seconds(self):
        row = {"ts": 1717000000000, "lat": 15.9, "lon": 65.3, "speed": 5.2, "heading": 180.0}
        result = map_trajectory_point(row)
        assert result.timestamp == 1717000000

    def test_truncates_sub_second_ms_remainder(self):
        row = {"ts": 1717000000999, "lat": 15.9, "lon": 65.3, "speed": None, "heading": None}
        result = map_trajectory_point(row)
        assert result.timestamp == 1717000000

    def test_maps_lat_lon(self):
        row = {"ts": 1717000000000, "lat": 15.903896666666666, "lon": 65.26356333333334}
        result = map_trajectory_point(row)
        assert result.lat == 15.903896666666666
        assert result.lon == 65.26356333333334

    def test_speed_and_heading_default_to_none(self):
        row = {"ts": 1717000000000, "lat": 15.9, "lon": 65.3}
        result = map_trajectory_point(row)
        assert result.speed is None
        assert result.heading is None
