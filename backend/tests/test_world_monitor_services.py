"""Unit tests for src.features.world_monitor.services — business logic layer."""
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

from src.features.world_monitor.services import (
    get_article_detail,
    get_article_list,
    get_event_detail,
    get_event_list,
    get_map_data,
    get_metadata,
    get_overview_distributions,
    get_overview_hotspots,
    get_overview_recent,
    get_overview_summary,
    get_overview_trends,
)


class TestGetMetadata:
    @pytest.mark.asyncio
    async def test_adds_sort_options(self, mock_db):
        with patch(
            "src.features.world_monitor.services.fetch_metadata",
            new_callable=AsyncMock,
        ) as mock_fetch:
            mock_fetch.return_value = {
                "event_types": ["Piracy"],
                "threat_levels": ["HIGH"],
                "sources": ["News"],
                "processing_statuses": ["enriched"],
            }
            result = await get_metadata(mock_db)

            assert result["event_types"] == ["Piracy"]
            assert len(result["sort_options"]) == 2
            assert result["sort_options"][0]["value"] == "latest"


class TestGetEventList:
    @pytest.mark.asyncio
    async def test_returns_data_and_pagination(self, mock_db, sample_event_doc):
        with (
            patch(
                "src.features.world_monitor.services.build_event_query",
                new_callable=AsyncMock,
                return_value={},
            ),
            patch(
                "src.features.world_monitor.services.fetch_events",
                new_callable=AsyncMock,
                return_value={"documents": [sample_event_doc], "total": 1},
            ),
            patch(
                "src.features.world_monitor.services.fetch_articles_by_ids",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            result = await get_event_list(
                mock_db, page=1, page_size=12, sort="latest"
            )

            assert len(result["data"]) == 1
            assert result["pagination"]["total"] == 1
            assert result["pagination"]["page"] == 1

    @pytest.mark.asyncio
    async def test_passes_filters_to_query(self, mock_db, sample_event_doc):
        with (
            patch(
                "src.features.world_monitor.services.build_event_query",
                new_callable=AsyncMock,
                return_value={},
            ) as mock_query,
            patch(
                "src.features.world_monitor.services.fetch_events",
                new_callable=AsyncMock,
                return_value={"documents": [], "total": 0},
            ),
            patch(
                "src.features.world_monitor.services.fetch_articles_by_ids",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            await get_event_list(
                mock_db,
                keyword="piracy",
                event_types="Piracy",
                threat_levels="HIGH",
                page=1,
                page_size=12,
                sort="latest",
            )

            mock_query.assert_called_once()
            call_kwargs = mock_query.call_args.kwargs
            assert call_kwargs["keyword"] == "piracy"
            assert call_kwargs["event_types"] == "Piracy"


class TestGetMapData:
    @pytest.mark.asyncio
    async def test_returns_markers(self, mock_db, sample_event_doc):
        with (
            patch(
                "src.features.world_monitor.services.build_event_query",
                new_callable=AsyncMock,
                return_value={},
            ),
            patch(
                "src.features.world_monitor.services.fetch_map_events",
                new_callable=AsyncMock,
                return_value=[sample_event_doc],
            ),
        ):
            result = await get_map_data(mock_db)

            assert result["total_events"] == 1
            assert result["total_markers"] == len(result["data"])
            assert result["total_markers"] > 0


class TestGetEventDetail:
    @pytest.mark.asyncio
    async def test_returns_normalized_event(self, mock_db, sample_event_doc, sample_article_doc):
        with (
            patch(
                "src.features.world_monitor.services.fetch_event_by_id",
                new_callable=AsyncMock,
                return_value=sample_event_doc,
            ),
            patch(
                "src.features.world_monitor.services.fetch_article_by_id",
                new_callable=AsyncMock,
                return_value=sample_article_doc,
            ),
        ):
            result = await get_event_detail(mock_db, "65f1a2b3c4d5e6f7a8b9c0d1")

            assert result is not None
            assert result["id"] == str(sample_event_doc["_id"])
            assert "structured_fields" in result

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        with patch(
            "src.features.world_monitor.services.fetch_event_by_id",
            new_callable=AsyncMock,
            return_value=None,
        ):
            result = await get_event_detail(mock_db, "nonexistent")
            assert result is None

    @pytest.mark.asyncio
    async def test_no_article_fetch_when_no_article_id(self, mock_db, sample_event_doc):
        doc = dict(sample_event_doc)
        doc["article_id"] = None
        with (
            patch(
                "src.features.world_monitor.services.fetch_event_by_id",
                new_callable=AsyncMock,
                return_value=doc,
            ),
            patch(
                "src.features.world_monitor.services.fetch_article_by_id",
                new_callable=AsyncMock,
            ) as mock_article,
        ):
            await get_event_detail(mock_db, "evt-001")
            mock_article.assert_not_called()


class TestGetArticleList:
    @pytest.mark.asyncio
    async def test_returns_data_and_pagination(self, mock_db, sample_article_doc):
        with (
            patch(
                "src.features.world_monitor.services.fetch_articles",
                new_callable=AsyncMock,
                return_value={"documents": [sample_article_doc], "total": 1},
            ),
            patch(
                "src.features.world_monitor.services.fetch_events_by_article_ids",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            result = await get_article_list(
                mock_db, page=1, page_size=12, sort="latest"
            )

            assert len(result["data"]) == 1
            assert result["data"][0]["linked_event_count"] == 0
            assert result["pagination"]["total"] == 1


class TestGetArticleDetail:
    @pytest.mark.asyncio
    async def test_returns_detail_with_linked_events(self, mock_db, sample_article_doc, sample_event_doc):
        with (
            patch(
                "src.features.world_monitor.services.fetch_article_by_id",
                new_callable=AsyncMock,
                return_value=sample_article_doc,
            ),
            patch(
                "src.features.world_monitor.services.fetch_events_by_article_ids",
                new_callable=AsyncMock,
                return_value={str(sample_article_doc["_id"]): [sample_event_doc]},
            ),
        ):
            result = await get_article_detail(mock_db, "65f1a2b3c4d5e6f7a8b9c0e2")

            assert result is not None
            assert result["linked_event_count"] == 1
            assert len(result["linked_events"]) == 1
            assert "processed_content" in result

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        with patch(
            "src.features.world_monitor.services.fetch_article_by_id",
            new_callable=AsyncMock,
            return_value=None,
        ):
            result = await get_article_detail(mock_db, "nonexistent")
            assert result is None


class TestGetOverviewSummary:
    @pytest.mark.asyncio
    async def test_counts_events(self, mock_db, sample_event_docs):
        with (
            patch(
                "src.features.world_monitor.services.fetch_all_events",
                new_callable=AsyncMock,
                return_value=sample_event_docs,
            ),
            patch(
                "src.features.world_monitor.services.fetch_today_article_count",
                new_callable=AsyncMock,
                return_value=3,
            ),
        ):
            result = await get_overview_summary(mock_db)

            assert result["active_events"] == 2
            assert result["critical_high_events"] == 2
            assert result["articles_ingested_today"] == 3
            assert result["linked_article_events"] == 2

    @pytest.mark.asyncio
    async def test_empty_events(self, mock_db):
        with (
            patch(
                "src.features.world_monitor.services.fetch_all_events",
                new_callable=AsyncMock,
                return_value=[],
            ),
            patch(
                "src.features.world_monitor.services.fetch_today_article_count",
                new_callable=AsyncMock,
                return_value=0,
            ),
        ):
            result = await get_overview_summary(mock_db)

            assert result["active_events"] == 0
            assert result["critical_high_events"] == 0


class TestGetOverviewRecent:
    @pytest.mark.asyncio
    async def test_returns_recent_events(self, mock_db, sample_event_doc):
        with (
            patch(
                "src.features.world_monitor.services.fetch_recent_events",
                new_callable=AsyncMock,
                return_value=[sample_event_doc],
            ),
            patch(
                "src.features.world_monitor.services.fetch_articles_by_ids",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            result = await get_overview_recent(mock_db, limit=5)

            assert len(result) == 1
            assert result[0]["id"] == str(sample_event_doc["_id"])


class TestGetOverviewDistributions:
    @pytest.mark.asyncio
    async def test_distributions(self, mock_db, sample_event_docs):
        with (
            patch(
                "src.features.world_monitor.services.fetch_all_events",
                new_callable=AsyncMock,
                return_value=sample_event_docs,
            ),
            patch(
                "src.features.world_monitor.services.fetch_articles_by_ids",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            result = await get_overview_distributions(mock_db, source_limit=8)

            assert "severity" in result
            assert "event_types" in result
            assert "sources" in result
            assert len(result["severity"]) == 4

    @pytest.mark.asyncio
    async def test_source_limit(self, mock_db, sample_event_docs):
        with (
            patch(
                "src.features.world_monitor.services.fetch_all_events",
                new_callable=AsyncMock,
                return_value=sample_event_docs,
            ),
            patch(
                "src.features.world_monitor.services.fetch_articles_by_ids",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            result = await get_overview_distributions(mock_db, source_limit=3)
            assert len(result["sources"]) <= 3


class TestGetOverviewHotspots:
    @pytest.mark.asyncio
    async def test_groups_by_location(self, mock_db, sample_event_docs):
        with patch(
            "src.features.world_monitor.services.fetch_all_events",
            new_callable=AsyncMock,
            return_value=sample_event_docs,
        ):
            result = await get_overview_hotspots(mock_db, limit=8)

            assert len(result) >= 1
            assert result[0]["location_name"] == "Gulf of Aden"
            assert result[0]["event_count"] == 2
            assert result[0]["critical_high_count"] == 2

    @pytest.mark.asyncio
    async def test_limit_applied(self, mock_db, sample_event_docs):
        with patch(
            "src.features.world_monitor.services.fetch_all_events",
            new_callable=AsyncMock,
            return_value=sample_event_docs,
        ):
            result = await get_overview_hotspots(mock_db, limit=1)
            assert len(result) <= 1


class TestGetOverviewTrends:
    @pytest.mark.asyncio
    async def test_groups_by_date(self, mock_db, sample_event_docs):
        with patch(
            "src.features.world_monitor.services.fetch_all_events",
            new_callable=AsyncMock,
            return_value=sample_event_docs,
        ):
            result = await get_overview_trends(mock_db, days=7)

            assert len(result) >= 1
            assert all("bucket" in item for item in result)
            assert all("total_events" in item for item in result)

    @pytest.mark.asyncio
    async def test_days_limit(self, mock_db, sample_event_docs):
        with patch(
            "src.features.world_monitor.services.fetch_all_events",
            new_callable=AsyncMock,
            return_value=sample_event_docs,
        ):
            result = await get_overview_trends(mock_db, days=1)
            assert len(result) <= 1

    @pytest.mark.asyncio
    async def test_sorted_by_bucket(self, mock_db, sample_event_docs):
        with patch(
            "src.features.world_monitor.services.fetch_all_events",
            new_callable=AsyncMock,
            return_value=sample_event_docs,
        ):
            result = await get_overview_trends(mock_db, days=30)
            buckets = [item["bucket"] for item in result]
            assert buckets == sorted(buckets)
