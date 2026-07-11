"""Integration tests for world_monitor feature.

Three levels per the backend integration testing guide:
  1. Router ↔ Service — mock client functions, let router + service + mapper run real
  2. Service ↔ Client — mock MongoDB collections, let service + client + mapper run real
  3. Full Pipeline     — mock get_db, let TestClient → Router → Service → Client → Mapper → response_model run real
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from src.main import app
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db


def _mock_current_user():
    return {"username": "testuser", "role": "user"}


# ── Shared fixtures ──


@pytest.fixture
def event_oid():
    return ObjectId("65f1a2b3c4d5e6f7a8b9c0d1")


@pytest.fixture
def article_oid():
    return ObjectId("65f1a2b3c4d5e6f7a8b9c0e2")


@pytest.fixture
def raw_event_doc(event_oid, article_oid):
    return {
        "_id": event_oid,
        "event_id": "evt-001",
        "event_type": "Piracy",
        "threat_level": "HIGH",
        "summary": "Suspicious vessel activity near Gulf of Aden",
        "reasoning": "Multiple fast boats approached a cargo vessel.",
        "relevance_score": 0.85,
        "enriched_at": "2025-01-15T10:30:00Z",
        "article_id": article_oid,
        "location": [
            {
                "name": "Gulf of Aden",
                "geometry": {"type": "Point", "coordinates": [45.0, 12.5]},
            },
            {
                "name": "Bab-el-Mandeb",
                "geometry": {"type": "Point", "coordinates": [43.3, 12.6]},
            },
        ],
        "extracted_data": [
            {
                "extracted_data": {
                    "threat_type": "piracy",
                    "location": "Gulf of Aden",
                    "vessel_name": "MV Pacific Star",
                    "damage": "No damage reported",
                }
            }
        ],
    }


@pytest.fixture
def raw_article_doc(article_oid):
    return {
        "_id": article_oid,
        "article_id": "art-001",
        "title": "Piracy Incident Reported Near Gulf of Aden",
        "source": "Maritime News",
        "source_type": "RSS",
        "author": "Jane Doe",
        "published": "2025-01-15T08:00:00Z",
        "updated": "2025-01-15T09:00:00Z",
        "ingested_at": "2025-01-15T09:30:00Z",
        "summary": "A piracy incident was reported near the Gulf of Aden.",
        "image_url": "https://example.com/image.jpg",
        "tags": ["piracy", "maritime", "security"],
        "processing_status": "enriched",
        "processed_content": "<p>Full article content here.</p>",
        "raw_content": "<p>Raw article content here.</p>",
        "link": "https://example.com/article/1",
        "location": [
            {
                "name": "Gulf of Aden",
                "geometry": {"type": "Point", "coordinates": [45.0, 12.5]},
            },
        ],
    }


@pytest.fixture
def mock_db(raw_event_doc, raw_article_doc):
    """A mocked Motor MongoDB database that returns realistic data."""
    db = MagicMock()
    events = MagicMock()
    articles = MagicMock()

    # Configure distinct calls for fetch_metadata
    events.distinct = AsyncMock(
        side_effect=[
            ["Piracy", "Conflict"],  # event_types
            ["HIGH", "CRITICAL"],    # threat_levels
        ]
    )
    articles.distinct = AsyncMock(
        side_effect=[
            ["Maritime News"],  # sources
            ["enriched"],       # processing_statuses
        ]
    )

    # Configure find_one for fetch_event_by_id / fetch_article_by_id
    events.find_one = AsyncMock(return_value=raw_event_doc)
    articles.find_one = AsyncMock(return_value=raw_article_doc)

    # Configure find + cursor chain for fetch_events / fetch_articles / etc.
    cursor = MagicMock()
    cursor.sort = MagicMock(return_value=cursor)
    cursor.skip = MagicMock(return_value=cursor)
    cursor.limit = MagicMock(return_value=cursor)
    cursor.to_list = AsyncMock(return_value=[raw_event_doc])

    events.find = MagicMock(return_value=cursor)
    articles.find = MagicMock(return_value=cursor)

    # Configure count_documents
    events.count_documents = AsyncMock(return_value=1)
    articles.count_documents = AsyncMock(return_value=1)

    db.get_collection = MagicMock(
        side_effect=lambda name: events if name == "world_monitor_events" else articles
    )
    db._events = events
    db._articles = articles
    db._cursor = cursor
    return db


@pytest.fixture
def client_with_mock_db(mock_db):
    """TestClient with get_db overridden to return our mock_db."""
    def override():
        return mock_db
    app.dependency_overrides[get_db] = override
    app.dependency_overrides[get_current_user] = _mock_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════════
# Level 1: Router ↔ Service Integration
#   Mock: client functions (AsyncMock)
#   Real: Router → Service → Mapper → response_model
# ═══════════════════════════════════════════════════════════════════════════


class TestRouterServiceIntegration:
    """RS-level: verify router → service → mapper → response_model pipeline."""

    @pytest.mark.integration
    def test_rs01_get_events_returns_200_with_mapped_domain_fields(
        self, client_with_mock_db, raw_event_doc
    ):
        with patch(
            "src.features.world_monitor.services.fetch_events",
            new_callable=AsyncMock,
            return_value={"documents": [raw_event_doc], "total": 1},
        ), patch(
            "src.features.world_monitor.services.build_event_query",
            new_callable=AsyncMock,
            return_value={},
        ), patch(
            "src.features.world_monitor.services.fetch_articles_by_ids",
            new_callable=AsyncMock,
            return_value={},
        ):
            resp = client_with_mock_db.get("/world-monitor/events")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 1
        assert body["data"][0]["event_type"] == "Piracy"
        assert body["data"][0]["threat_level"] == "HIGH"
        assert "locations" in body["data"][0]
        assert body["pagination"]["total"] == 1

    @pytest.mark.integration
    def test_rs02_get_event_detail_returns_200(
        self, client_with_mock_db, raw_event_doc, raw_article_doc
    ):
        with patch(
            "src.features.world_monitor.services.fetch_event_by_id",
            new_callable=AsyncMock,
            return_value=raw_event_doc,
        ), patch(
            "src.features.world_monitor.services.fetch_article_by_id",
            new_callable=AsyncMock,
            return_value=raw_article_doc,
        ):
            resp = client_with_mock_db.get(
                f"/world-monitor/events/{str(raw_event_doc['_id'])}"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["event_type"] == "Piracy"
        assert "structured_fields" in data
        assert data["linked_article_preview"] is not None

    @pytest.mark.integration
    def test_rs03_get_event_detail_returns_404_when_not_found(
        self, client_with_mock_db
    ):
        with patch(
            "src.features.world_monitor.services.fetch_event_by_id",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client_with_mock_db.get("/world-monitor/events/nonexistent")

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @pytest.mark.integration
    def test_rs04_get_articles_returns_200_with_mapped_fields(
        self, client_with_mock_db, raw_article_doc
    ):
        with patch(
            "src.features.world_monitor.services.fetch_articles",
            new_callable=AsyncMock,
            return_value={"documents": [raw_article_doc], "total": 1},
        ), patch(
            "src.features.world_monitor.services.fetch_events_by_article_ids",
            new_callable=AsyncMock,
            return_value={},
        ):
            resp = client_with_mock_db.get("/world-monitor/articles")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 1
        assert body["data"][0]["title"] == "Piracy Incident Reported Near Gulf of Aden"
        assert body["data"][0]["source"] == "Maritime News"

    @pytest.mark.integration
    def test_rs05_get_article_detail_returns_404_when_not_found(
        self, client_with_mock_db
    ):
        with patch(
            "src.features.world_monitor.services.fetch_article_by_id",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client_with_mock_db.get("/world-monitor/articles/nonexistent")

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @pytest.mark.integration
    def test_rs06_get_events_empty_list_returns_200(
        self, client_with_mock_db
    ):
        with patch(
            "src.features.world_monitor.services.fetch_events",
            new_callable=AsyncMock,
            return_value={"documents": [], "total": 0},
        ), patch(
            "src.features.world_monitor.services.build_event_query",
            new_callable=AsyncMock,
            return_value={},
        ), patch(
            "src.features.world_monitor.services.fetch_articles_by_ids",
            new_callable=AsyncMock,
            return_value={},
        ):
            resp = client_with_mock_db.get("/world-monitor/events")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["pagination"]["total"] == 0

    @pytest.mark.integration
    def test_rs07_response_has_json_content_type(
        self, client_with_mock_db, raw_event_doc
    ):
        with patch(
            "src.features.world_monitor.services.fetch_events",
            new_callable=AsyncMock,
            return_value={"documents": [raw_event_doc], "total": 1},
        ), patch(
            "src.features.world_monitor.services.build_event_query",
            new_callable=AsyncMock,
            return_value={},
        ), patch(
            "src.features.world_monitor.services.fetch_articles_by_ids",
            new_callable=AsyncMock,
            return_value={},
        ):
            resp = client_with_mock_db.get("/world-monitor/events")

        assert resp.headers["content-type"] == "application/json"

    @pytest.mark.integration
    def test_rs08_router_passes_query_params_to_service(
        self, client_with_mock_db
    ):
        with patch(
            "src.features.world_monitor.router.get_event_list",
            new_callable=AsyncMock,
            return_value={
                "data": [],
                "pagination": {"total": 0, "page": 2, "page_size": 24, "total_pages": 1},
            },
        ) as mock_service:
            resp = client_with_mock_db.get(
                "/world-monitor/events",
                params={"page": 2, "page_size": 24, "sort": "oldest", "keyword": "piracy"},
            )

        assert resp.status_code == 200
        call_kwargs = mock_service.call_args.kwargs
        assert call_kwargs["page"] == 2
        assert call_kwargs["page_size"] == 24
        assert call_kwargs["sort"] == "oldest"
        assert call_kwargs["keyword"] == "piracy"

    @pytest.mark.integration
    def test_rs09_response_model_filters_raw_fields(
        self, client_with_mock_db, raw_event_doc
    ):
        with patch(
            "src.features.world_monitor.services.fetch_events",
            new_callable=AsyncMock,
            return_value={"documents": [raw_event_doc], "total": 1},
        ), patch(
            "src.features.world_monitor.services.build_event_query",
            new_callable=AsyncMock,
            return_value={},
        ), patch(
            "src.features.world_monitor.services.fetch_articles_by_ids",
            new_callable=AsyncMock,
            return_value={},
        ):
            resp = client_with_mock_db.get("/world-monitor/events")

        data = resp.json()["data"][0]
        assert "extracted_data" not in data
        assert "article_id" not in data
        assert "_id" not in data

    @pytest.mark.integration
    def test_rs10_locations_are_floats_not_strings(
        self, client_with_mock_db, raw_event_doc
    ):
        with patch(
            "src.features.world_monitor.services.fetch_events",
            new_callable=AsyncMock,
            return_value={"documents": [raw_event_doc], "total": 1},
        ), patch(
            "src.features.world_monitor.services.build_event_query",
            new_callable=AsyncMock,
            return_value={},
        ), patch(
            "src.features.world_monitor.services.fetch_articles_by_ids",
            new_callable=AsyncMock,
            return_value={},
        ):
            resp = client_with_mock_db.get("/world-monitor/events")

        locations = resp.json()["data"][0]["locations"]
        assert len(locations) == 2
        assert isinstance(locations[0]["lat"], float)
        assert isinstance(locations[0]["lng"], float)
        assert locations[0]["lat"] == 12.5
        assert locations[0]["lng"] == 45.0

    @pytest.mark.integration
    def test_rs11_overview_summary_returns_200(
        self, client_with_mock_db
    ):
        with patch(
            "src.features.world_monitor.router.get_overview_summary",
            new_callable=AsyncMock,
            return_value={
                "active_events": 10,
                "critical_high_events": 3,
                "new_events_last_24h": 2,
                "distinct_regions": 5,
                "articles_ingested_today": 8,
                "active_areas": 4,
                "review_required_events": 1,
                "linked_article_events": 6,
                "avg_enrichment_lag_hours": None,
            },
        ):
            resp = client_with_mock_db.get("/world-monitor/overview/summary")

        assert resp.status_code == 200
        body = resp.json()
        assert body["active_events"] == 10
        assert body["critical_high_events"] == 3

    @pytest.mark.integration
    def test_rs12_invalid_page_returns_422(self, client_with_mock_db):
        resp = client_with_mock_db.get("/world-monitor/events", params={"page": 0})
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# Level 2: Service ↔ Client Integration
#   Mock: MongoDB collections (MagicMock + AsyncMock)
#   Real: Service → Client → Mapper
# ═══════════════════════════════════════════════════════════════════════════


class TestServiceClientIntegration:
    """SC-level: verify service → client → mapper pipeline with mocked MongoDB."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc01_get_event_list_calls_correct_collections(
        self, mock_db, raw_event_doc
    ):
        from src.features.world_monitor.services import get_event_list

        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])
        mock_db._events.count_documents = AsyncMock(return_value=1)

        result = await get_event_list(mock_db, page=1, page_size=12, sort="latest")

        mock_db._events.find.assert_called()
        assert result["pagination"]["total"] == 1
        assert len(result["data"]) == 1
        assert result["data"][0]["event_type"] == "Piracy"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc02_get_event_detail_returns_mapped_event(
        self, mock_db, raw_event_doc, raw_article_doc
    ):
        from src.features.world_monitor.services import get_event_detail

        mock_db._events.find_one = AsyncMock(return_value=raw_event_doc)
        mock_db._articles.find_one = AsyncMock(return_value=raw_article_doc)

        result = await get_event_detail(mock_db, str(raw_event_doc["_id"]))

        assert result is not None
        assert result["id"] == str(raw_event_doc["_id"])
        assert result["event_type"] == "Piracy"
        assert result["threat_level"] == "HIGH"
        assert len(result["locations"]) == 2
        assert result["linked_article_preview"] is not None
        assert "structured_fields" in result

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc03_get_event_detail_returns_none_when_not_found(self, mock_db):
        from src.features.world_monitor.services import get_event_detail

        mock_db._events.find_one = AsyncMock(return_value=None)

        result = await get_event_detail(mock_db, "nonexistent")
        assert result is None

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc04_get_article_list_returns_mapped_articles(
        self, mock_db, raw_article_doc
    ):
        from src.features.world_monitor.services import get_article_list

        mock_db._cursor.to_list = AsyncMock(return_value=[raw_article_doc])
        mock_db._articles.count_documents = AsyncMock(return_value=1)

        result = await get_article_list(mock_db, page=1, page_size=12, sort="latest")

        assert len(result["data"]) == 1
        assert result["data"][0]["title"] == "Piracy Incident Reported Near Gulf of Aden"
        assert result["data"][0]["source"] == "Maritime News"
        assert result["data"][0]["linked_event_count"] == 0

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc05_get_article_detail_returns_with_linked_events(
        self, mock_db, raw_article_doc, raw_event_doc
    ):
        from src.features.world_monitor.services import get_article_detail

        mock_db._articles.find_one = AsyncMock(return_value=raw_article_doc)
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        result = await get_article_detail(mock_db, str(raw_article_doc["_id"]))

        assert result is not None
        assert result["linked_event_count"] == 1
        assert len(result["linked_events"]) == 1
        assert "processed_content" in result
        assert "raw_content" in result

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc06_get_metadata_returns_sorted_values(self, mock_db):
        from src.features.world_monitor.services import get_metadata

        result = await get_metadata(mock_db)

        assert result["event_types"] == ["Conflict", "Piracy"]
        assert result["threat_levels"] == ["CRITICAL", "HIGH"]
        assert result["sources"] == ["Maritime News"]
        assert result["processing_statuses"] == ["enriched"]
        assert len(result["sort_options"]) == 2

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc07_get_map_data_returns_markers(
        self, mock_db, raw_event_doc
    ):
        from src.features.world_monitor.services import get_map_data

        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        result = await get_map_data(mock_db)

        assert result["total_events"] == 1
        assert result["total_markers"] == 2
        assert len(result["data"]) == 2
        assert result["data"][0]["location"]["lat"] == 12.5

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc08_get_overview_summary_counts_correctly(
        self, mock_db, raw_event_doc
    ):
        from src.features.world_monitor.services import get_overview_summary

        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])
        mock_db._articles.count_documents = AsyncMock(return_value=1)

        result = await get_overview_summary(mock_db)

        assert result["active_events"] == 1
        assert result["critical_high_events"] == 1
        assert result["linked_article_events"] == 1
        assert result["articles_ingested_today"] == 1

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_sc09_get_overview_distributions(self, mock_db, raw_event_doc):
        from src.features.world_monitor.services import get_overview_distributions

        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        result = await get_overview_distributions(mock_db)

        assert "severity" in result
        assert "event_types" in result
        assert "sources" in result
        assert len(result["severity"]) == 4

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc10_get_overview_hotspots_groups_by_location(
        self, mock_db, raw_event_doc
    ):
        from src.features.world_monitor.services import get_overview_hotspots

        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        result = await get_overview_hotspots(mock_db)

        assert len(result) >= 1
        assert result[0]["location_name"] == "Gulf of Aden"
        assert result[0]["event_count"] == 1

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc11_get_overview_trends_groups_by_date(
        self, mock_db, raw_event_doc
    ):
        from src.features.world_monitor.services import get_overview_trends

        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        result = await get_overview_trends(mock_db, days=7)

        assert len(result) >= 1
        assert all("bucket" in item for item in result)

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sc12_empty_events_returns_empty_list(self, mock_db):
        from src.features.world_monitor.services import get_event_list

        mock_db._cursor.to_list = AsyncMock(return_value=[])
        mock_db._events.count_documents = AsyncMock(return_value=0)

        result = await get_event_list(mock_db, page=1, page_size=12, sort="latest")

        assert result["data"] == []
        assert result["pagination"]["total"] == 0


# ═══════════════════════════════════════════════════════════════════════════
# Level 3: Full Pipeline Integration
#   Mock: get_db dependency → mock_db
#   Real: TestClient → Router → Service → Client → Mapper → response_model
# ═══════════════════════════════════════════════════════════════════════════


class TestFullPipelineIntegration:
    """FP-level: verify the entire request/response cycle end-to-end."""

    @pytest.mark.integration
    def test_fp01_get_events_full_pipeline_200(self, client_with_mock_db, mock_db, raw_event_doc):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])
        mock_db._events.count_documents = AsyncMock(return_value=1)

        resp = client_with_mock_db.get("/world-monitor/events")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 1
        assert body["data"][0]["event_type"] == "Piracy"
        assert body["data"][0]["threat_level"] == "HIGH"
        assert len(body["data"][0]["locations"]) == 2
        assert body["pagination"]["total"] == 1

    @pytest.mark.integration
    def test_fp02_get_event_detail_full_pipeline_200(
        self, client_with_mock_db, mock_db, raw_event_doc, raw_article_doc
    ):
        mock_db._events.find_one = AsyncMock(return_value=raw_event_doc)
        mock_db._articles.find_one = AsyncMock(return_value=raw_article_doc)

        resp = client_with_mock_db.get(
            f"/world-monitor/events/{str(raw_event_doc['_id'])}"
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["event_type"] == "Piracy"
        assert data["linked_article_preview"] is not None
        assert "structured_fields" in data
        assert isinstance(data["locations"][0]["lat"], float)

    @pytest.mark.integration
    def test_fp03_get_event_detail_404_when_not_found(self, client_with_mock_db, mock_db):
        mock_db._events.find_one = AsyncMock(return_value=None)

        resp = client_with_mock_db.get("/world-monitor/events/nonexistent")

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @pytest.mark.integration
    def test_fp04_get_articles_full_pipeline_200(
        self, client_with_mock_db, mock_db, raw_article_doc
    ):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_article_doc])
        mock_db._articles.count_documents = AsyncMock(return_value=1)

        resp = client_with_mock_db.get("/world-monitor/articles")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 1
        assert body["data"][0]["title"] == "Piracy Incident Reported Near Gulf of Aden"
        assert body["data"][0]["source"] == "Maritime News"

    @pytest.mark.integration
    def test_fp05_get_article_detail_full_pipeline_200(
        self, client_with_mock_db, mock_db, raw_article_doc, raw_event_doc
    ):
        mock_db._articles.find_one = AsyncMock(return_value=raw_article_doc)
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        resp = client_with_mock_db.get(
            f"/world-monitor/articles/{str(raw_article_doc['_id'])}"
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Piracy Incident Reported Near Gulf of Aden"
        assert data["linked_event_count"] == 1
        assert "processed_content" in data
        assert "raw_content" in data

    @pytest.mark.integration
    def test_fp06_get_article_detail_404_when_not_found(self, client_with_mock_db, mock_db):
        mock_db._articles.find_one = AsyncMock(return_value=None)

        resp = client_with_mock_db.get("/world-monitor/articles/nonexistent")

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @pytest.mark.integration
    def test_fp07_get_events_empty_list_200(self, client_with_mock_db, mock_db):
        mock_db._cursor.to_list = AsyncMock(return_value=[])
        mock_db._events.count_documents = AsyncMock(return_value=0)

        resp = client_with_mock_db.get("/world-monitor/events")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["pagination"]["total"] == 0

    @pytest.mark.integration
    def test_fp08_response_has_json_content_type(self, client_with_mock_db):
        resp = client_with_mock_db.get("/world-monitor/filters/metadata")

        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/json"

    @pytest.mark.integration
    def test_fp09_get_metadata_full_pipeline_200(self, client_with_mock_db):
        resp = client_with_mock_db.get("/world-monitor/filters/metadata")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["event_types"] == ["Conflict", "Piracy"]
        assert body["threat_levels"] == ["CRITICAL", "HIGH"]
        assert body["sources"] == ["Maritime News"]
        assert body["processing_statuses"] == ["enriched"]
        assert len(body["sort_options"]) == 2

    @pytest.mark.integration
    def test_fp10_get_map_data_full_pipeline_200(
        self, client_with_mock_db, mock_db, raw_event_doc
    ):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        resp = client_with_mock_db.get("/world-monitor/events/map")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total_events"] == 1
        assert body["total_markers"] == 2
        assert len(body["data"]) == 2
        assert isinstance(body["data"][0]["location"]["lat"], float)

    @pytest.mark.integration
    def test_fp11_overview_summary_full_pipeline_200(
        self, client_with_mock_db, mock_db, raw_event_doc
    ):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])
        mock_db._articles.count_documents = AsyncMock(return_value=1)

        resp = client_with_mock_db.get("/world-monitor/overview/summary")

        assert resp.status_code == 200
        body = resp.json()
        assert body["active_events"] == 1
        assert body["critical_high_events"] == 1
        assert body["articles_ingested_today"] == 1

    @pytest.mark.integration
    def test_fp12_overview_recent_full_pipeline_200(
        self, client_with_mock_db, mock_db, raw_event_doc
    ):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        resp = client_with_mock_db.get("/world-monitor/overview/recent")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 1

    @pytest.mark.integration
    def test_fp13_overview_distributions_full_pipeline_200(
        self, client_with_mock_db, mock_db, raw_event_doc
    ):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        resp = client_with_mock_db.get("/world-monitor/overview/distributions")

        assert resp.status_code == 200
        body = resp.json()
        assert "severity" in body
        assert "event_types" in body
        assert "sources" in body

    @pytest.mark.integration
    def test_fp14_overview_hotspots_full_pipeline_200(
        self, client_with_mock_db, mock_db, raw_event_doc
    ):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        resp = client_with_mock_db.get("/world-monitor/overview/hotspots")

        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        assert len(body) >= 1
        assert body[0]["location_name"] == "Gulf of Aden"

    @pytest.mark.integration
    def test_fp15_overview_trends_full_pipeline_200(
        self, client_with_mock_db, mock_db, raw_event_doc
    ):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])

        resp = client_with_mock_db.get("/world-monitor/overview/trends")

        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        assert len(body) >= 1
        assert "bucket" in body[0]

    @pytest.mark.integration
    def test_fp16_invalid_page_returns_422(self, client_with_mock_db):
        resp = client_with_mock_db.get("/world-monitor/events", params={"page": 0})
        assert resp.status_code == 422

    @pytest.mark.integration
    def test_fp17_invalid_page_size_returns_422(self, client_with_mock_db):
        resp = client_with_mock_db.get("/world-monitor/events", params={"page_size": 200})
        assert resp.status_code == 422

    @pytest.mark.integration
    def test_fp18_response_model_filters_raw_mongo_fields(
        self, client_with_mock_db, mock_db, raw_event_doc
    ):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])
        mock_db._events.count_documents = AsyncMock(return_value=1)

        resp = client_with_mock_db.get("/world-monitor/events")

        data = resp.json()["data"][0]
        assert "_id" not in data
        assert "extracted_data" not in data
        assert "article_id" not in data

    @pytest.mark.integration
    def test_fp19_query_params_passed_through_full_pipeline(
        self, client_with_mock_db, mock_db, raw_event_doc
    ):
        mock_db._cursor.to_list = AsyncMock(return_value=[raw_event_doc])
        mock_db._events.count_documents = AsyncMock(return_value=1)

        resp = client_with_mock_db.get(
            "/world-monitor/events",
            params={
                "keyword": "piracy",
                "event_types": "Piracy",
                "threat_levels": "HIGH",
                "page": 1,
                "page_size": 12,
                "sort": "latest",
            },
        )

        assert resp.status_code == 200
        mock_db._events.find.assert_called()
