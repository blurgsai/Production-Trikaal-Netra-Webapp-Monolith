"""Unit tests for src.features.world_monitor.models — Pydantic models and mappers."""
from datetime import datetime, timezone

import pytest
from bson import ObjectId
from pydantic import ValidationError

from src.features.world_monitor.models import (
    LinkedArticlePreview,
    OverviewDistributionItem,
    OverviewDistributionsResponse,
    OverviewHotspot,
    OverviewRecentResponse,
    OverviewSummary,
    OverviewTrendPoint,
    PaginatedResponse,
    SEVERITY_ORDER,
    StructuredField,
    WorldMonitorArticleDetail,
    WorldMonitorArticleListItem,
    WorldMonitorArticleListResponse,
    WorldMonitorEventDetail,
    WorldMonitorEventListItem,
    WorldMonitorEventListResponse,
    WorldMonitorLocation,
    WorldMonitorMapMarker,
    WorldMonitorMapResponse,
    WorldMonitorMetadataResponse,
    _build_event_summary,
    _build_event_title,
    _clean_text,
    _extract_reasoning,
    _extract_structured_fields,
    _extract_threat_level,
    _labelize,
    _normalize_locations,
    _primary_location_name,
    _strip_html,
    _stringify_datetime,
    _stringify_id,
    map_article_from_doc,
    map_article_preview_from_doc,
    map_event_from_doc,
    map_map_markers_from_doc,
)


# ── Domain model tests ──


class TestWorldMonitorLocation:
    def test_creation(self):
        loc = WorldMonitorLocation(name="Gulf of Aden", lat=12.5, lng=45.0)
        assert loc.name == "Gulf of Aden"
        assert loc.lat == 12.5
        assert loc.lng == 45.0
        assert loc.role == "mentioned"

    def test_with_role(self):
        loc = WorldMonitorLocation(name="Gulf of Aden", lat=12.5, lng=45.0, role="primary")
        assert loc.role == "primary"

    def test_missing_required_fields_raises(self):
        with pytest.raises(ValidationError):
            WorldMonitorLocation(name="Test")


class TestLinkedArticlePreview:
    def test_creation(self):
        preview = LinkedArticlePreview(
            id="abc123",
            title="Test Article",
            tags=["news", "maritime"],
        )
        assert preview.id == "abc123"
        assert preview.title == "Test Article"
        assert preview.tags == ["news", "maritime"]
        assert preview.locations == []

    def test_missing_title_raises(self):
        with pytest.raises(ValidationError):
            LinkedArticlePreview(id="abc")


class TestWorldMonitorEventListItem:
    def test_creation(self):
        event = WorldMonitorEventListItem(
            id="evt1",
            title="Piracy Event",
            event_type="Piracy",
            threat_level="HIGH",
            summary="Test summary",
        )
        assert event.id == "evt1"
        assert event.event_type == "Piracy"
        assert event.locations == []

    def test_missing_required_fields_raises(self):
        with pytest.raises(ValidationError):
            WorldMonitorEventListItem(id="evt1")


class TestWorldMonitorEventDetail:
    def test_inherits_from_list_item(self):
        detail = WorldMonitorEventDetail(
            id="evt1",
            title="Piracy Event",
            event_type="Piracy",
            threat_level="HIGH",
            summary="Test summary",
            structured_fields=[{"key": "vessel", "label": "Vessel", "value": "MV Test"}],
        )
        assert detail.structured_fields[0].key == "vessel"

    def test_default_structured_fields(self):
        detail = WorldMonitorEventDetail(
            id="evt1", title="Test", event_type="Piracy",
            threat_level="HIGH", summary="Summary",
        )
        assert detail.structured_fields == []


class TestWorldMonitorMapMarker:
    def test_creation(self):
        marker = WorldMonitorMapMarker(
            marker_id="evt1:0",
            event_id="evt1",
            title="Test",
            event_type="Piracy",
            threat_level="HIGH",
            location=WorldMonitorLocation(name="Aden", lat=12.5, lng=45.0),
        )
        assert marker.marker_id == "evt1:0"


class TestWorldMonitorArticleListItem:
    def test_creation(self):
        article = WorldMonitorArticleListItem(
            id="art1",
            title="Test Article",
        )
        assert article.id == "art1"
        assert article.linked_event_count == 0
        assert article.location_count == 0


class TestWorldMonitorArticleDetail:
    def test_inherits_from_list_item(self):
        detail = WorldMonitorArticleDetail(
            id="art1",
            title="Test",
            processed_content="Content",
            locations=[WorldMonitorLocation(name="Aden", lat=12.5, lng=45.0)],
            linked_events=[],
        )
        assert detail.processed_content == "Content"
        assert len(detail.locations) == 1


class TestPaginatedResponse:
    def test_creation(self):
        pag = PaginatedResponse(total=100, page=1, page_size=12, total_pages=9)
        assert pag.total == 100


class TestWorldMonitorEventListResponse:
    def test_creation(self):
        resp = WorldMonitorEventListResponse(
            data=[],
            pagination=PaginatedResponse(total=0, page=1, page_size=12, total_pages=1),
        )
        assert resp.success is True
        assert resp.data == []


class TestWorldMonitorMapResponse:
    def test_creation(self):
        resp = WorldMonitorMapResponse(data=[], total_events=0, total_markers=0)
        assert resp.success is True


class TestWorldMonitorMetadataResponse:
    def test_creation(self):
        resp = WorldMonitorMetadataResponse(
            event_types=["Piracy"],
            threat_levels=["HIGH"],
            sources=["News"],
            processing_statuses=["enriched"],
            sort_options=[{"value": "latest", "label": "Latest"}],
        )
        assert resp.success is True
        assert resp.event_types == ["Piracy"]


class TestOverviewSummary:
    def test_creation(self):
        summary = OverviewSummary(
            active_events=10,
            critical_high_events=3,
            new_events_last_24h=2,
            distinct_regions=5,
            articles_ingested_today=8,
        )
        assert summary.active_events == 10
        assert summary.active_areas == 0
        assert summary.review_required_events == 0


class TestOverviewTrendPoint:
    def test_creation(self):
        point = OverviewTrendPoint(bucket="2025-01-15", total_events=5, critical_high_events=2)
        assert point.bucket == "2025-01-15"


class TestOverviewDistributionItem:
    def test_creation(self):
        item = OverviewDistributionItem(key="HIGH", label="High", value=5)
        assert item.value == 5


class TestOverviewHotspot:
    def test_creation(self):
        hotspot = OverviewHotspot(
            location_name="Gulf of Aden",
            event_count=10,
            critical_high_count=3,
        )
        assert hotspot.dominant_event_type is None
        assert hotspot.last_seen is None


class TestOverviewRecentResponse:
    def test_creation(self):
        resp = OverviewRecentResponse(data=[])
        assert resp.success is True


# ── Mapper/helper tests ──


class TestStringifyId:
    def test_string(self):
        assert _stringify_id("abc") == "abc"

    def test_objectid(self):
        oid = ObjectId("65f1a2b3c4d5e6f7a8b9c0d1")
        assert _stringify_id(oid) == "65f1a2b3c4d5e6f7a8b9c0d1"

    def test_none(self):
        assert _stringify_id(None) is None


class TestCleanText:
    def test_strips_whitespace(self):
        assert _clean_text("  hello  ") == "hello"

    def test_collapses_multiple_spaces(self):
        assert _clean_text("hello    world") == "hello world"

    def test_none(self):
        assert _clean_text(None) is None

    def test_empty_string(self):
        assert _clean_text("") is None


class TestStripHtml:
    def test_removes_tags(self):
        assert _strip_html("<p>Hello</p>") == "Hello"

    def test_removes_nested_tags(self):
        assert _strip_html("<div><p>Hello world</p></div>") == "Hello world"

    def test_none(self):
        assert _strip_html(None) is None


class TestLabelize:
    def test_underscores_to_title(self):
        assert _labelize("vessel_name") == "Vessel Name"

    def test_single_word(self):
        assert _labelize("location") == "Location"


class TestStringifyDatetime:
    def test_datetime_object(self):
        dt = datetime(2025, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        assert _stringify_datetime(dt) == "2025-01-15T10:30:00+00:00"

    def test_string_passthrough(self):
        assert _stringify_datetime("2025-01-15") == "2025-01-15"

    def test_none(self):
        assert _stringify_datetime(None) is None


class TestExtractReasoning:
    def test_direct_reasoning(self):
        doc = {"reasoning": "Direct reasoning text"}
        assert _extract_reasoning(doc) == "Direct reasoning text"

    def test_nested_reasoning(self, sample_event_doc):
        result = _extract_reasoning(sample_event_doc)
        assert result == "Multiple fast boats approached a cargo vessel."

    def test_no_reasoning(self):
        assert _extract_reasoning({}) is None


class TestExtractThreatLevel:
    def test_direct_level(self):
        assert _extract_threat_level({"threat_level": "high"}) == "HIGH"

    def test_nested_level(self):
        doc = {"extracted_data": [{"extracted_data": {"threat_level": "critical"}}]}
        assert _extract_threat_level(doc) == "CRITICAL"

    def test_default_medium(self):
        assert _extract_threat_level({}) == "MEDIUM"


class TestPrimaryLocationName:
    def test_from_nested(self, sample_event_doc):
        assert _primary_location_name(sample_event_doc) == "Gulf of Aden"

    def test_from_location_list(self):
        doc = {"location": [{"name": "Red Sea"}]}
        assert _primary_location_name(doc) == "Red Sea"

    def test_none_when_no_location(self):
        assert _primary_location_name({}) is None


class TestNormalizeLocations:
    def test_valid_point_locations(self):
        raw = [
            {
                "name": "Aden",
                "geometry": {"type": "Point", "coordinates": [45.0, 12.5]},
            },
        ]
        result = _normalize_locations(raw, None)
        assert len(result) == 1
        assert result[0]["name"] == "Aden"
        assert result[0]["lat"] == 12.5
        assert result[0]["lng"] == 45.0
        assert result[0]["role"] == "primary"

    def test_filters_non_point_geometry(self):
        raw = [
            {"name": "Area", "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 1]]]}},
        ]
        assert _normalize_locations(raw, None) == []

    def test_deduplicates_by_name_and_coords(self):
        raw = [
            {"name": "Aden", "geometry": {"type": "Point", "coordinates": [45.0, 12.5]}},
            {"name": "Aden", "geometry": {"type": "Point", "coordinates": [45.0, 12.5]}},
        ]
        assert len(_normalize_locations(raw, None)) == 1

    def test_primary_role_assignment(self):
        raw = [
            {"name": "Aden", "geometry": {"type": "Point", "coordinates": [45.0, 12.5]}},
            {"name": "Sanaa", "geometry": {"type": "Point", "coordinates": [44.2, 15.3]}},
        ]
        result = _normalize_locations(raw, "Aden")
        assert result[0]["role"] == "primary"
        assert result[1]["role"] == "mentioned"

    def test_first_location_becomes_primary_when_no_match(self):
        raw = [
            {"name": "Aden", "geometry": {"type": "Point", "coordinates": [45.0, 12.5]}},
        ]
        result = _normalize_locations(raw, "Nonexistent")
        assert result[0]["role"] == "primary"

    def test_empty_locations(self):
        assert _normalize_locations([], None) == []

    def test_none_coordinates_skipped(self):
        raw = [
            {"name": "Aden", "geometry": {"type": "Point", "coordinates": [None, 12.5]}},
        ]
        assert _normalize_locations(raw, None) == []


class TestBuildEventTitle:
    def test_explicit_title(self):
        doc = {"title": "Custom Title"}
        assert _build_event_title(doc, None) == "Custom Title"

    def test_vessel_name(self, sample_event_doc):
        result = _build_event_title(sample_event_doc, {"name": "Gulf of Aden"})
        assert "MV Pacific Star" in result

    def test_threat_type_fallback(self):
        doc = {
            "event_type": "Piracy",
            "extracted_data": [{"extracted_data": {"threat_type": "piracy"}}],
        }
        result = _build_event_title(doc, {"name": "Aden"})
        assert "Piracy threat near Aden" in result

    def test_location_fallback(self):
        doc = {"event_type": "Conflict"}
        result = _build_event_title(doc, {"name": "Red Sea"})
        assert "Conflict near Red Sea" in result

    def test_article_title_fallback(self):
        doc = {"event_type": "Unknown"}
        result = _build_event_title(doc, None, {"title": "Article Title"})
        assert result == "Unknown near Unknown Location"

    def test_event_type_fallback(self):
        doc = {"event_type": "Piracy"}
        result = _build_event_title(doc, None)
        assert result == "Piracy near Unknown Location"


class TestBuildEventSummary:
    def test_direct_summary(self):
        doc = {"summary": "Direct summary"}
        assert _build_event_summary(doc) == "Direct summary"

    def test_nested_summary(self):
        doc = {"extracted_data": [{"extracted_data": {"summary": "Nested summary"}}]}
        assert _build_event_summary(doc) == "Nested summary"

    def test_article_summary_fallback(self):
        result = _build_event_summary({}, {"summary": "Article summary"})
        assert result == "Article summary"

    def test_reasoning_fallback(self):
        doc = {"reasoning": "Reasoning text that is quite long and should be truncated to fit within the 220 character limit for the summary field"}
        result = _build_event_summary(doc)
        assert len(result) <= 220

    def test_default_fallback(self):
        assert "Operational details" in _build_event_summary({})


class TestExtractStructuredFields:
    def test_extracts_fields(self, sample_event_doc):
        fields = _extract_structured_fields(sample_event_doc)
        keys = [f["key"] for f in fields]
        assert "threat_type" in keys
        assert "vessel_name" in keys
        assert "location" in keys

    def test_excludes_summary_reasoning_threat_level(self, sample_event_doc):
        fields = _extract_structured_fields(sample_event_doc)
        keys = [f["key"] for f in fields]
        assert "summary" not in keys
        assert "reasoning" not in keys
        assert "threat_level" not in keys

    def test_empty_extracted_data(self):
        assert _extract_structured_fields({}) == []


class TestMapArticlePreviewFromDoc:
    def test_full_doc(self, sample_article_doc):
        result = map_article_preview_from_doc(sample_article_doc)
        assert result["id"] == str(sample_article_doc["_id"])
        assert result["title"] == "Piracy Incident Reported Near Gulf of Aden"
        assert result["source"] == "Maritime News"
        assert result["tags"] == ["piracy", "maritime", "security"]
        assert len(result["locations"]) == 1

    def test_none_doc(self):
        assert map_article_preview_from_doc(None) is None


class TestMapEventFromDoc:
    def test_full_doc(self, sample_event_doc, sample_article_doc):
        result = map_event_from_doc(sample_event_doc, sample_article_doc)
        assert result["id"] == str(sample_event_doc["_id"])
        assert result["event_id"] == "evt-001"
        assert result["event_type"] == "Piracy"
        assert result["threat_level"] == "HIGH"
        assert result["summary"] == "Suspicious vessel activity near Gulf of Aden"
        assert len(result["locations"]) == 2
        assert result["linked_article_preview"] is not None

    def test_with_structured_fields(self, sample_event_doc):
        result = map_event_from_doc(sample_event_doc, include_structured_fields=True)
        assert "structured_fields" in result
        assert len(result["structured_fields"]) > 0

    def test_without_structured_fields(self, sample_event_doc):
        result = map_event_from_doc(sample_event_doc)
        assert "structured_fields" not in result

    def test_minimal_doc(self):
        doc = {"_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"), "event_type": "Test"}
        result = map_event_from_doc(doc)
        assert result["id"] == "65f1a2b3c4d5e6f7a8b9c0d1"
        assert result["event_type"] == "Test"
        assert result["threat_level"] == "MEDIUM"


class TestMapMapMarkersFromDoc:
    def test_generates_markers(self, sample_event_doc):
        markers = map_map_markers_from_doc(sample_event_doc)
        assert len(markers) == 2
        assert markers[0]["marker_id"] == f"{str(sample_event_doc['_id'])}:0"
        assert markers[0]["event_id"] == str(sample_event_doc["_id"])

    def test_marker_has_location(self, sample_event_doc):
        markers = map_map_markers_from_doc(sample_event_doc)
        assert "location" in markers[0]
        assert markers[0]["location"]["lat"] == 12.5


class TestMapArticleFromDoc:
    def test_list_item_mode(self, sample_article_doc):
        result = map_article_from_doc(sample_article_doc, [], include_linked_events=False)
        assert result["id"] == str(sample_article_doc["_id"])
        assert result["linked_event_count"] == 0
        assert "processed_content" not in result
        assert "linked_events" not in result

    def test_detail_mode(self, sample_article_doc, sample_event_doc):
        result = map_article_from_doc(
            sample_article_doc, [sample_event_doc], include_linked_events=True
        )
        assert result["linked_event_count"] == 1
        assert "processed_content" in result
        assert "raw_content" in result
        assert len(result["linked_events"]) == 1
        assert len(result["locations"]) == 1

    def test_strips_html_from_raw_content(self):
        doc = {
            "_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0e2"),
            "title": "Test",
            "raw_content": "<p>Hello <b>world</b></p>",
        }
        result = map_article_from_doc(doc, [], include_linked_events=True)
        assert result["raw_content"] == "Hello world"


class TestSeverityOrder:
    def test_order_values(self):
        assert SEVERITY_ORDER["LOW"] == 1
        assert SEVERITY_ORDER["MEDIUM"] == 2
        assert SEVERITY_ORDER["HIGH"] == 3
        assert SEVERITY_ORDER["CRITICAL"] == 4
