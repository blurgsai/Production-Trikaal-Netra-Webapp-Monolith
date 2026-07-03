"""Unit tests for src.features.vessels.models — mappers and Pydantic models."""
import pytest

from src.features.vessels.models import (
    VesselPoint,
    VesselTrajectoryResponse,
    VesselPlaybackPoint,
    VesselPlaybackResponse,
    PlaybackWindowRequest,
    map_trajectory_from_raw,
    map_playback_from_raw,
    parse_playback_raw_rows,
)
from src.features.vessels.clients import TrajectoryRawRow, PlaybackRawRow


class TestTrajectoryRawRow:
    def test_creation(self):
        row = TrajectoryRawRow(lat=15.90, lon=65.26, ts="2024-12-04 17:50:30")
        assert row.lat == 15.90
        assert row.lon == 65.26
        assert row.ts == "2024-12-04 17:50:30"

    def test_negative_coords(self):
        row = TrajectoryRawRow(lat=-33.45, lon=-70.66, ts="2024-01-01 00:00:00")
        assert row.lat == -33.45
        assert row.lon == -70.66


class TestPlaybackRawRow:
    def test_creation(self):
        row = PlaybackRawRow(
            vessel_id="366500659123456789",
            ts="2024-12-04 17:50:30",
            lat=15.90,
            lon=65.26,
            heading=0.0,
        )
        assert row.vessel_id == "366500659123456789"
        assert row.heading == 0.0

    def test_heading_nonzero(self):
        row = PlaybackRawRow(
            vessel_id="123", ts="2024-01-01 00:00:00",
            lat=10.0, lon=20.0, heading=180.5,
        )
        assert row.heading == 180.5


class TestVesselPoint:
    def test_creation(self):
        pt = VesselPoint(lat=15.90, lng=65.26, timestamp="2024-12-04 17:50:30")
        assert pt.lat == 15.90
        assert pt.lng == 65.26
        assert pt.timestamp == "2024-12-04 17:50:30"


class TestVesselTrajectoryResponse:
    def test_creation(self):
        resp = VesselTrajectoryResponse(
            vessel_id="366500659123456789",
            trajectory=[VesselPoint(lat=15.9, lng=65.2, timestamp="2024-12-04 17:50:30")],
        )
        assert resp.vessel_id == "366500659123456789"
        assert len(resp.trajectory) == 1


class TestVesselPlaybackPoint:
    def test_creation(self):
        pt = VesselPlaybackPoint(ts="2024-12-04 17:50:30", lat=15.9, lon=65.2, heading=0.0)
        assert pt.ts == "2024-12-04 17:50:30"
        assert pt.heading == 0.0


class TestVesselPlaybackResponse:
    def test_creation(self):
        resp = VesselPlaybackResponse(
            timestamps=["2024-12-04 17:50:30"],
            vessels={"366500659123456789": [VesselPlaybackPoint(
                ts="2024-12-04 17:50:30", lat=15.9, lon=65.2, heading=0.0,
            )]},
        )
        assert resp.timestamps == ["2024-12-04 17:50:30"]
        assert "366500659123456789" in resp.vessels


class TestPlaybackWindowRequest:
    def test_creation(self, sample_polygon_geojson):
        req = PlaybackWindowRequest(
            polygon=sample_polygon_geojson,
            start="2024-12-04 17:00:00",
            end="2024-12-04 18:00:00",
        )
        assert req.start == "2024-12-04 17:00:00"
        assert req.end == "2024-12-04 18:00:00"
        assert req.polygon["type"] == "Polygon"

    def test_missing_fields_validation(self):
        with pytest.raises(Exception):
            PlaybackWindowRequest()


class TestMapTrajectoryFromRaw:
    def test_valid_data(self, sample_trajectory_raw):
        resp = map_trajectory_from_raw(sample_trajectory_raw, "366500659123456789")
        assert resp.vessel_id == "366500659123456789"
        assert len(resp.trajectory) == 3
        assert resp.trajectory[0].lat == 15.903896666666666
        assert resp.trajectory[0].lng == 65.26356333333334
        assert resp.trajectory[0].timestamp == "2024-12-04 17:50:30"

    def test_empty_raw(self):
        resp = map_trajectory_from_raw("", "123")
        assert resp.vessel_id == "123"
        assert resp.trajectory == []

    def test_whitespace_only_raw(self):
        resp = map_trajectory_from_raw("   \n  \n", "123")
        assert resp.trajectory == []

    def test_single_row(self):
        raw = "15.903896666666666\t65.26356333333334\t2024-12-04 17:50:30\n"
        resp = map_trajectory_from_raw(raw, "366500659123456789")
        assert len(resp.trajectory) == 1
        assert resp.trajectory[0].lat == 15.903896666666666

    def test_preserves_order(self, sample_trajectory_raw):
        resp = map_trajectory_from_raw(sample_trajectory_raw, "123")
        timestamps = [pt.timestamp for pt in resp.trajectory]
        assert timestamps == [
            "2024-12-04 17:50:30",
            "2024-12-04 17:49:29",
            "2024-12-04 17:48:29",
        ]

    def test_negative_coordinates(self):
        raw = "-33.45\t-70.66\t2024-01-01 00:00:00\n"
        resp = map_trajectory_from_raw(raw, "123")
        assert resp.trajectory[0].lat == -33.45
        assert resp.trajectory[0].lng == -70.66


class TestMapPlaybackFromRaw:
    def test_valid_data(self, sample_playback_raw):
        resp = map_playback_from_raw(sample_playback_raw)
        assert len(resp.vessels) == 2
        assert "366500659123456789" in resp.vessels
        assert "366168522123456789" in resp.vessels
        assert len(resp.vessels["366500659123456789"]) == 2

    def test_empty_raw(self):
        resp = map_playback_from_raw("")
        assert resp.vessels == {}
        assert resp.timestamps == []

    def test_whitespace_only_raw(self):
        resp = map_playback_from_raw("  \n  \n")
        assert resp.vessels == {}

    def test_timestamps_sorted(self, sample_playback_raw):
        resp = map_playback_from_raw(sample_playback_raw)
        assert resp.timestamps == sorted(resp.timestamps)

    def test_malformed_row_skipped(self):
        raw = "bad\trow\tonly\tthree\n366500659123456789\t2024-12-04 17:50:30\t15.9\t65.2\t0\n"
        resp = map_playback_from_raw(raw)
        assert len(resp.vessels) == 1
        assert "366500659123456789" in resp.vessels

    def test_empty_heading_defaults_to_zero(self):
        """When heading column is empty, it defaults to 0.0.
        strip() only strips the full string, not individual lines,
        so the trailing tab on the first line is preserved."""
        raw = "123\t2024-01-01 00:00:00\t10.0\t20.0\t\n456\t2024-01-01 01:00:00\t11.0\t21.0\t90.0\n"
        resp = map_playback_from_raw(raw)
        assert "123" in resp.vessels
        assert resp.vessels["123"][0].heading == 0.0
        assert "456" in resp.vessels
        assert resp.vessels["456"][0].heading == 90.0

    def test_single_vessel_multiple_points(self):
        raw = (
            "366500659123456789\t2024-12-04 17:50:30\t15.9\t65.2\t0\n"
            "366500659123456789\t2024-12-04 17:49:29\t15.8\t65.3\t0\n"
        )
        resp = map_playback_from_raw(raw)
        assert len(resp.vessels) == 1
        assert len(resp.vessels["366500659123456789"]) == 2
        assert len(resp.timestamps) == 2


class TestParsePlaybackRawRows:
    def test_valid_data(self, sample_playback_raw):
        rows = parse_playback_raw_rows(sample_playback_raw)
        assert len(rows) == 3
        assert rows[0].vessel_id == "366500659123456789"
        assert rows[0].lat == 15.903896666666666
        assert rows[0].heading == 0.0

    def test_empty_raw(self):
        rows = parse_playback_raw_rows("")
        assert rows == []

    def test_malformed_row_skipped(self):
        raw = "bad\trow\n123\t2024-01-01 00:00:00\t10.0\t20.0\t0\n"
        rows = parse_playback_raw_rows(raw)
        assert len(rows) == 1
        assert rows[0].vessel_id == "123"

    def test_empty_heading_defaults_to_zero(self):
        """When heading column is empty, it defaults to 0.0.
        strip() only strips the full string, not individual lines,
        so the trailing tab on the first line is preserved."""
        raw = "123\t2024-01-01 00:00:00\t10.0\t20.0\t\n456\t2024-01-01 01:00:00\t11.0\t21.0\t90.0\n"
        rows = parse_playback_raw_rows(raw)
        assert len(rows) == 2
        assert rows[0].vessel_id == "123"
        assert rows[0].heading == 0.0
        assert rows[1].vessel_id == "456"
        assert rows[1].heading == 90.0

    def test_returns_playback_raw_row_instances(self, sample_playback_raw):
        rows = parse_playback_raw_rows(sample_playback_raw)
        assert all(isinstance(r, PlaybackRawRow) for r in rows)
