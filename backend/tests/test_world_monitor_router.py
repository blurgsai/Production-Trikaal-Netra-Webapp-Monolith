"""Integration tests for src.features.world_monitor.router — FastAPI endpoints.

These tests use TestClient(app) to exercise the full HTTP stack:
  router → service → client → model (with mocked external calls).

They are marked with @pytest.mark.integration so they can be selected
or deselected independently from pure unit tests.
"""
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from src.main import app
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db

pytestmark = pytest.mark.integration


def _mock_current_user():
    return {"username": "testuser", "role": "user"}


@pytest.fixture
def client():
    def override_get_db():
        yield None

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = _mock_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestGetMetadata:
    def test_returns_metadata(self, client):
        with patch(
            "src.features.world_monitor.router.get_metadata",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = {
                "event_types": ["Piracy"],
                "threat_levels": ["HIGH"],
                "sources": ["News"],
                "processing_statuses": ["enriched"],
                "sort_options": [{"value": "latest", "label": "Latest"}],
            }
            resp = client.get("/world-monitor/filters/metadata")

            assert resp.status_code == 200
            body = resp.json()
            assert body["success"] is True
            assert body["event_types"] == ["Piracy"]
            assert body["sources"] == ["News"]


class TestGetEvents:
    def test_returns_event_list(self, client, sample_event_doc):
        normalized = {
            "id": str(sample_event_doc["_id"]),
            "event_id": "evt-001",
            "title": "Piracy Event",
            "event_type": "Piracy",
            "threat_level": "HIGH",
            "summary": "Test summary",
            "reasoning": "Test reasoning",
            "primary_location": None,
            "locations": [],
            "relevance_score": 0.85,
            "enriched_at": "2025-01-15T10:30:00Z",
            "linked_article_preview": None,
        }
        with patch(
            "src.features.world_monitor.router.get_event_list",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = {
                "data": [normalized],
                "pagination": {
                    "total": 1,
                    "page": 1,
                    "page_size": 12,
                    "total_pages": 1,
                },
            }
            resp = client.get("/world-monitor/events")

            assert resp.status_code == 200
            body = resp.json()
            assert body["success"] is True
            assert len(body["data"]) == 1
            assert body["data"][0]["event_type"] == "Piracy"
            assert body["pagination"]["total"] == 1

    def test_with_query_params(self, client):
        with patch(
            "src.features.world_monitor.router.get_event_list",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = {
                "data": [],
                "pagination": {
                    "total": 0, "page": 1, "page_size": 12, "total_pages": 1,
                },
            }
            resp = client.get(
                "/world-monitor/events",
                params={
                    "keyword": "piracy",
                    "event_types": "Piracy,Conflict",
                    "threat_levels": "HIGH",
                    "page": 2,
                    "page_size": 24,
                    "sort": "oldest",
                },
            )

            assert resp.status_code == 200
            call_kwargs = mock_service.call_args.kwargs
            assert call_kwargs["keyword"] == "piracy"
            assert call_kwargs["event_types"] == "Piracy,Conflict"
            assert call_kwargs["page"] == 2
            assert call_kwargs["sort"] == "oldest"

    def test_invalid_page_returns_422(self, client):
        resp = client.get("/world-monitor/events", params={"page": 0})
        assert resp.status_code == 422

    def test_invalid_page_size_returns_422(self, client):
        resp = client.get("/world-monitor/events", params={"page_size": 200})
        assert resp.status_code == 422


class TestSearchVessels:
    def test_returns_matches(self, client):
        with patch(
            "src.features.world_monitor.router.search_vessels_by_name",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = {
                "query": "Stellar",
                "matches": [
                    {
                        "vessel_id": 1,
                        "ship_name": "MV Stellar Voyager",
                        "mmsi": 123456789,
                        "score": 0.85,
                    }
                ],
            }
            resp = client.get(
                "/world-monitor/vessels/search",
                params={"name": "Stellar", "limit": 5},
            )

            assert resp.status_code == 200
            body = resp.json()
            assert body["success"] is True
            assert body["query"] == "Stellar"
            assert len(body["matches"]) == 1
            assert body["matches"][0]["vessel_id"] == 1
            assert body["matches"][0]["mmsi"] == 123456789

    def test_rejects_missing_name(self, client):
        resp = client.get("/world-monitor/vessels/search")
        assert resp.status_code == 422

    def test_rejects_invalid_limit(self, client):
        resp = client.get("/world-monitor/vessels/search", params={"name": "x", "limit": 25})
        assert resp.status_code == 422


class TestGetMapEvents:
    def test_returns_map_data(self, client):
        with patch(
            "src.features.world_monitor.router.get_map_data",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = {
                "data": [
                    {
                        "marker_id": "id1:0",
                        "event_id": "id1",
                        "title": "Test",
                        "event_type": "Piracy",
                        "threat_level": "HIGH",
                        "relevance_score": 0.9,
                        "enriched_at": "2025-01-15T10:00:00Z",
                        "location": {
                            "name": "Aden",
                            "lat": 12.5,
                            "lng": 45.0,
                            "role": "primary",
                        },
                    }
                ],
                "total_events": 1,
                "total_markers": 1,
            }
            resp = client.get("/world-monitor/events/map")

            assert resp.status_code == 200
            body = resp.json()
            assert body["total_events"] == 1
            assert body["total_markers"] == 1
            assert len(body["data"]) == 1


class TestGetEventDetail:
    def test_returns_detail(self, client, sample_event_doc):
        normalized = {
            "id": str(sample_event_doc["_id"]),
            "event_id": "evt-001",
            "title": "Piracy Event",
            "event_type": "Piracy",
            "threat_level": "HIGH",
            "summary": "Test summary",
            "reasoning": "Test reasoning",
            "primary_location": None,
            "locations": [],
            "relevance_score": 0.85,
            "enriched_at": "2025-01-15T10:30:00Z",
            "linked_article_preview": None,
            "structured_fields": [
                {"key": "vessel", "label": "Vessel", "value": "MV Test"},
            ],
        }
        with patch(
            "src.features.world_monitor.router.get_event_detail",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = normalized
            resp = client.get(f"/world-monitor/events/{str(sample_event_doc['_id'])}")

            assert resp.status_code == 200
            body = resp.json()
            assert body["id"] == str(sample_event_doc["_id"])
            assert len(body["structured_fields"]) == 1

    def test_returns_404_when_not_found(self, client):
        with patch(
            "src.features.world_monitor.router.get_event_detail",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get("/world-monitor/events/nonexistent")
            assert resp.status_code == 404
            assert "not found" in resp.json()["detail"].lower()


class TestGetArticles:
    def test_returns_article_list(self, client, sample_article_doc):
        normalized = {
            "id": str(sample_article_doc["_id"]),
            "external_article_id": "art-001",
            "title": "Test Article",
            "source": "News",
            "source_type": "RSS",
            "author": "Jane",
            "published": "2025-01-15T08:00:00Z",
            "updated": None,
            "ingested_at": "2025-01-15T09:30:00Z",
            "summary": "Summary",
            "image_url": None,
            "tags": ["news"],
            "processing_status": "enriched",
            "linked_event_count": 0,
            "location_count": 1,
            "link": "https://example.com/1",
        }
        with patch(
            "src.features.world_monitor.router.get_article_list",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = {
                "data": [normalized],
                "pagination": {
                    "total": 1, "page": 1, "page_size": 12, "total_pages": 1,
                },
            }
            resp = client.get("/world-monitor/articles")

            assert resp.status_code == 200
            body = resp.json()
            assert len(body["data"]) == 1
            assert body["data"][0]["title"] == "Test Article"

    def test_with_filters(self, client):
        with patch(
            "src.features.world_monitor.router.get_article_list",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = {
                "data": [],
                "pagination": {
                    "total": 0, "page": 1, "page_size": 12, "total_pages": 1,
                },
            }
            resp = client.get(
                "/world-monitor/articles",
                params={
                    "search": "piracy",
                    "source": "News",
                    "processing_status": "enriched",
                    "sort": "oldest",
                },
            )

            assert resp.status_code == 200
            call_kwargs = mock_service.call_args.kwargs
            assert call_kwargs["search"] == "piracy"
            assert call_kwargs["source"] == "News"


class TestGetArticleDetail:
    def test_returns_detail(self, client, sample_article_doc):
        normalized = {
            "id": str(sample_article_doc["_id"]),
            "external_article_id": "art-001",
            "title": "Test Article",
            "source": "News",
            "source_type": "RSS",
            "author": "Jane",
            "published": "2025-01-15T08:00:00Z",
            "updated": None,
            "ingested_at": "2025-01-15T09:30:00Z",
            "summary": "Summary",
            "image_url": None,
            "tags": ["news"],
            "processing_status": "enriched",
            "linked_event_count": 1,
            "location_count": 1,
            "link": "https://example.com/1",
            "processed_content": "Content",
            "raw_content": "Raw content",
            "locations": [],
            "linked_events": [],
        }
        with patch(
            "src.features.world_monitor.router.get_article_detail",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = normalized
            resp = client.get(f"/world-monitor/articles/{str(sample_article_doc['_id'])}")

            assert resp.status_code == 200
            body = resp.json()
            assert body["processed_content"] == "Content"
            assert body["linked_event_count"] == 1

    def test_returns_404_when_not_found(self, client):
        with patch(
            "src.features.world_monitor.router.get_article_detail",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get("/world-monitor/articles/nonexistent")
            assert resp.status_code == 404


class TestGetOverviewSummary:
    def test_returns_summary(self, client):
        with patch(
            "src.features.world_monitor.router.get_overview_summary",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = {
                "active_events": 10,
                "critical_high_events": 3,
                "new_events_last_24h": 2,
                "distinct_regions": 5,
                "articles_ingested_today": 8,
                "active_areas": 4,
                "review_required_events": 1,
                "linked_article_events": 6,
                "avg_enrichment_lag_hours": None,
            }
            resp = client.get("/world-monitor/overview/summary")

            assert resp.status_code == 200
            body = resp.json()
            assert body["active_events"] == 10
            assert body["critical_high_events"] == 3


class TestGetOverviewRecent:
    def test_returns_recent_events(self, client):
        with patch(
            "src.features.world_monitor.router.get_overview_recent",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = []
            resp = client.get("/world-monitor/overview/recent")

            assert resp.status_code == 200
            body = resp.json()
            assert body["success"] is True
            assert body["data"] == []

    def test_limit_param(self, client):
        with patch(
            "src.features.world_monitor.router.get_overview_recent",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = []
            resp = client.get("/world-monitor/overview/recent", params={"limit": 15})

            assert resp.status_code == 200
            call_kwargs = mock_service.call_args.kwargs
            assert call_kwargs["limit"] == 15

    def test_invalid_limit_returns_422(self, client):
        resp = client.get("/world-monitor/overview/recent", params={"limit": 0})
        assert resp.status_code == 422


class TestGetOverviewDistributions:
    def test_returns_distributions(self, client):
        with patch(
            "src.features.world_monitor.router.get_overview_distributions",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = {
                "severity": [
                    {"key": "HIGH", "label": "High", "value": 3},
                ],
                "event_types": [
                    {"key": "Piracy", "label": "Piracy", "value": 2},
                ],
                "sources": [
                    {"key": "News", "label": "News", "value": 5},
                ],
            }
            resp = client.get("/world-monitor/overview/distributions")

            assert resp.status_code == 200
            body = resp.json()
            assert len(body["severity"]) == 1
            assert body["severity"][0]["key"] == "HIGH"


class TestGetOverviewHotspots:
    def test_returns_hotspots(self, client):
        with patch(
            "src.features.world_monitor.router.get_overview_hotspots",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = [
                {
                    "location_name": "Gulf of Aden",
                    "event_count": 10,
                    "critical_high_count": 3,
                    "dominant_event_type": "Piracy",
                    "last_seen": "2025-01-15T10:30:00Z",
                },
            ]
            resp = client.get("/world-monitor/overview/hotspots")

            assert resp.status_code == 200
            body = resp.json()
            assert len(body) == 1
            assert body[0]["location_name"] == "Gulf of Aden"


class TestGetOverviewTrends:
    def test_returns_trends(self, client):
        with patch(
            "src.features.world_monitor.router.get_overview_trends",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = [
                {"bucket": "2025-01-15", "total_events": 5, "critical_high_events": 2},
            ]
            resp = client.get("/world-monitor/overview/trends")

            assert resp.status_code == 200
            body = resp.json()
            assert len(body) == 1
            assert body[0]["bucket"] == "2025-01-15"

    def test_days_param(self, client):
        with patch(
            "src.features.world_monitor.router.get_overview_trends",
            new_callable=AsyncMock,
        ) as mock_service:
            mock_service.return_value = []
            resp = client.get("/world-monitor/overview/trends", params={"days": 14})

            assert resp.status_code == 200
            call_kwargs = mock_service.call_args.kwargs
            assert call_kwargs["days"] == 14

    def test_invalid_days_returns_422(self, client):
        resp = client.get("/world-monitor/overview/trends", params={"days": 1})
        assert resp.status_code == 422
