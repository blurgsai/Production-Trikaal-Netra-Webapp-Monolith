"""Unit tests for src.features.world_monitor.clients — MongoDB query functions."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

from src.features.world_monitor.clients import (
    _escape_keyword,
    _parse_iso_datetime,
    _sort_spec,
    _split_csv,
    build_event_query,
    build_pagination,
    fetch_all_events,
    fetch_article_by_id,
    fetch_articles,
    fetch_articles_by_ids,
    fetch_event_by_id,
    fetch_events,
    fetch_events_by_article_ids,
    fetch_map_events,
    fetch_metadata,
    fetch_recent_events,
    fetch_today_article_count,
    fetch_vessels_by_name,
)


class TestParseIsoDatetime:
    def test_parses_iso_string_with_z(self):
        result = _parse_iso_datetime("2025-01-15T10:30:00Z")
        assert result is not None
        assert result.year == 2025
        assert result.tzinfo is not None

    def test_parses_iso_string_with_offset(self):
        result = _parse_iso_datetime("2025-01-15T10:30:00+00:00")
        assert result is not None
        assert result.tzinfo is not None

    def test_parses_naive_datetime_string(self):
        result = _parse_iso_datetime("2025-01-15T10:30:00")
        assert result is not None
        assert result.tzinfo is not None

    def test_parses_aware_datetime(self):
        from datetime import datetime, timezone

        dt = datetime(2025, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        result = _parse_iso_datetime(dt)
        assert result == dt

    def test_returns_none_for_none(self):
        assert _parse_iso_datetime(None) is None

    def test_returns_none_for_invalid_string(self):
        assert _parse_iso_datetime("not-a-date") is None

    def test_returns_none_for_unsupported_type(self):
        assert _parse_iso_datetime(12345) is None


class TestEscapeKeyword:
    def test_escapes_regex_special_chars(self):
        result = _escape_keyword("test.*+?()[]{}")
        assert "test" in result
        assert "\\" in result

    def test_strips_whitespace(self):
        assert _escape_keyword("  test  ") == "test"


class TestSplitCsv:
    def test_splits_comma_separated(self):
        assert _split_csv("a,b,c") == ["a", "b", "c"]

    def test_strips_whitespace(self):
        assert _split_csv(" a , b , c ") == ["a", "b", "c"]

    def test_filters_empty_items(self):
        assert _split_csv("a,,b,") == ["a", "b"]

    def test_returns_empty_for_none(self):
        assert _split_csv(None) == []

    def test_returns_empty_for_empty_string(self):
        assert _split_csv("") == []


class TestSortSpec:
    def test_latest(self):
        assert _sort_spec("latest") == [("enriched_at", -1), ("_id", -1)]

    def test_oldest(self):
        assert _sort_spec("oldest") == [("enriched_at", 1), ("_id", 1)]

    def test_most_relevant(self):
        assert _sort_spec("most_relevant") == [
            ("relevance_score", -1),
            ("enriched_at", -1),
            ("_id", -1),
        ]

    def test_most_severe(self):
        assert _sort_spec("most_severe") == [
            ("threat_level", -1),
            ("relevance_score", -1),
            ("enriched_at", -1),
        ]

    def test_unknown_defaults_to_latest(self):
        assert _sort_spec("unknown") == [("enriched_at", -1), ("_id", -1)]


class TestBuildPagination:
    def test_valid_pagination(self):
        result = build_pagination(page=1, page_size=12, total=100)
        assert result["total"] == 100
        assert result["page"] == 1
        assert result["page_size"] == 12
        assert result["total_pages"] == 9

    def test_zero_total_returns_one_page(self):
        result = build_pagination(page=1, page_size=12, total=0)
        assert result["total_pages"] == 1

    def test_exact_division(self):
        result = build_pagination(page=1, page_size=10, total=100)
        assert result["total_pages"] == 10

    def test_partial_last_page(self):
        result = build_pagination(page=1, page_size=10, total=95)
        assert result["total_pages"] == 10


class TestFetchMetadata:
    @pytest.mark.asyncio
    async def test_returns_sorted_values(self, mock_db):
        mock_db._events.distinct = AsyncMock(side_effect=[["Piracy", "Conflict"], ["HIGH"]])
        mock_db._articles.distinct = AsyncMock(side_effect=[["News", "RSS"], ["enriched"]])

        result = await fetch_metadata(mock_db)

        assert result["event_types"] == ["Conflict", "Piracy"]
        assert result["threat_levels"] == ["HIGH"]
        assert result["sources"] == ["News", "RSS"]
        assert result["processing_statuses"] == ["enriched"]

    @pytest.mark.asyncio
    async def test_filters_none_values(self, mock_db):
        mock_db._events.distinct = AsyncMock(side_effect=[[None, "Piracy"], [None, "HIGH"]])
        mock_db._articles.distinct = AsyncMock(side_effect=[[None, "News"], [None, "enriched"]])

        result = await fetch_metadata(mock_db)

        assert None not in result["event_types"]
        assert None not in result["sources"]


class TestBuildEventQuery:
    @pytest.mark.asyncio
    async def test_empty_query_returns_empty_dict(self, mock_db):
        result = await build_event_query(mock_db)
        assert result == {}

    @pytest.mark.asyncio
    async def test_keyword_adds_regex_clause(self, mock_db):
        result = await build_event_query(mock_db, keyword="piracy")
        assert "$and" in result
        assert "$or" in result["$and"][0]

    @pytest.mark.asyncio
    async def test_event_types_adds_in_clause(self, mock_db):
        result = await build_event_query(mock_db, event_types="Piracy,Conflict")
        assert "$and" in result
        assert any(
            "event_type" in clause and "$in" in clause.get("event_type", {})
            for clause in result["$and"]
        )

    @pytest.mark.asyncio
    async def test_threat_levels_adds_in_clause(self, mock_db):
        result = await build_event_query(mock_db, threat_levels="HIGH,CRITICAL")
        assert "$and" in result
        assert any(
            "threat_level" in clause and "$in" in clause.get("threat_level", {})
            for clause in result["$and"]
        )

    @pytest.mark.asyncio
    async def test_has_linked_article_true(self, mock_db):
        result = await build_event_query(mock_db, has_linked_article=True)
        assert "$and" in result
        clause = result["$and"][0]
        assert "article_id" in clause
        assert clause["article_id"]["$exists"] is True

    @pytest.mark.asyncio
    async def test_has_linked_article_false(self, mock_db):
        result = await build_event_query(mock_db, has_linked_article=False)
        assert "$and" in result
        clause = result["$and"][0]
        assert "$or" in clause

    @pytest.mark.asyncio
    async def test_date_range_adds_enriched_at_clause(self, mock_db):
        result = await build_event_query(
            mock_db,
            date_from="2025-01-01T00:00:00Z",
            date_to="2025-01-31T23:59:59Z",
        )
        assert "$and" in result
        enriched_clauses = [c for c in result["$and"] if "enriched_at" in c]
        assert len(enriched_clauses) == 1
        assert "$gte" in enriched_clauses[0]["enriched_at"]
        assert "$lte" in enriched_clauses[0]["enriched_at"]

    @pytest.mark.asyncio
    async def test_sources_resolves_article_ids(self, mock_db, mock_cursor):
        mock_db._articles.find = MagicMock(return_value=mock_cursor)
        mock_cursor.to_list = AsyncMock(
            return_value=[{"_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0e2")}]
        )
        result = await build_event_query(mock_db, sources="News,RSS")
        assert "$and" in result
        article_clauses = [
            c for c in result["$and"]
            if "article_id" in c and "$in" in c.get("article_id", {})
        ]
        assert len(article_clauses) == 1

    @pytest.mark.asyncio
    async def test_combined_filters(self, mock_db, mock_cursor):
        mock_db._articles.find = MagicMock(return_value=mock_cursor)
        result = await build_event_query(
            mock_db,
            keyword="piracy",
            event_types="Piracy",
            threat_levels="HIGH",
            has_linked_article=True,
        )
        assert "$and" in result
        assert len(result["$and"]) == 4


class TestFetchEvents:
    @pytest.mark.asyncio
    async def test_returns_documents_and_total(self, mock_db, mock_cursor, sample_event_doc):
        mock_cursor.to_list = AsyncMock(return_value=[sample_event_doc])
        mock_db._events.find = MagicMock(return_value=mock_cursor)
        mock_db._events.count_documents = AsyncMock(return_value=1)

        result = await fetch_events(mock_db, {}, page=1, page_size=12, sort="latest")

        assert result["total"] == 1
        assert len(result["documents"]) == 1

    @pytest.mark.asyncio
    async def test_calculates_skip(self, mock_db, mock_cursor, sample_event_doc):
        mock_cursor.to_list = AsyncMock(return_value=[sample_event_doc])
        mock_db._events.find = MagicMock(return_value=mock_cursor)
        mock_db._events.count_documents = AsyncMock(return_value=1)

        await fetch_events(mock_db, {}, page=3, page_size=12, sort="latest")

        mock_cursor.skip.assert_called_with(24)


class TestFetchMapEvents:
    @pytest.mark.asyncio
    async def test_returns_documents(self, mock_db, mock_cursor, sample_event_doc):
        mock_cursor.to_list = AsyncMock(return_value=[sample_event_doc])
        mock_db._events.find = MagicMock(return_value=mock_cursor)

        result = await fetch_map_events(mock_db, {})

        assert len(result) == 1


class TestFetchEventById:
    @pytest.mark.asyncio
    async def test_valid_objectid(self, mock_db, sample_event_doc):
        mock_db._events.find_one = AsyncMock(return_value=sample_event_doc)
        result = await fetch_event_by_id(mock_db, "65f1a2b3c4d5e6f7a8b9c0d1")
        assert result is not None

    @pytest.mark.asyncio
    async def test_event_id_string_fallback(self, mock_db, sample_event_doc):
        mock_db._events.find_one = AsyncMock(return_value=sample_event_doc)
        result = await fetch_event_by_id(mock_db, "evt-001")
        assert result is not None

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        mock_db._events.find_one = AsyncMock(return_value=None)
        result = await fetch_event_by_id(mock_db, "nonexistent")
        assert result is None


class TestFetchArticleById:
    @pytest.mark.asyncio
    async def test_valid_objectid(self, mock_db, sample_article_doc):
        mock_db._articles.find_one = AsyncMock(return_value=sample_article_doc)
        result = await fetch_article_by_id(mock_db, "65f1a2b3c4d5e6f7a8b9c0e2")
        assert result is not None

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        mock_db._articles.find_one = AsyncMock(return_value=None)
        result = await fetch_article_by_id(mock_db, "nonexistent")
        assert result is None


class TestFetchArticles:
    @pytest.mark.asyncio
    async def test_with_search(self, mock_db, mock_cursor, sample_article_doc):
        mock_cursor.to_list = AsyncMock(return_value=[sample_article_doc])
        mock_db._articles.find = MagicMock(return_value=mock_cursor)
        mock_db._articles.count_documents = AsyncMock(return_value=1)

        result = await fetch_articles(
            mock_db, search="piracy", source=None, processing_status=None,
            page=1, page_size=12, sort="latest",
        )

        assert result["total"] == 1

    @pytest.mark.asyncio
    async def test_with_source_filter(self, mock_db, mock_cursor, sample_article_doc):
        mock_cursor.to_list = AsyncMock(return_value=[sample_article_doc])
        mock_db._articles.find = MagicMock(return_value=mock_cursor)
        mock_db._articles.count_documents = AsyncMock(return_value=1)

        result = await fetch_articles(
            mock_db, search=None, source="Maritime News", processing_status=None,
            page=1, page_size=12, sort="latest",
        )

        assert result["total"] == 1

    @pytest.mark.asyncio
    async def test_oldest_sort(self, mock_db, mock_cursor, sample_article_doc):
        mock_cursor.to_list = AsyncMock(return_value=[sample_article_doc])
        mock_db._articles.find = MagicMock(return_value=mock_cursor)
        mock_db._articles.count_documents = AsyncMock(return_value=1)

        await fetch_articles(
            mock_db, search=None, source=None, processing_status=None,
            page=1, page_size=12, sort="oldest",
        )

        sort_args = mock_cursor.sort.call_args[0][0]
        assert sort_args == [("published", 1), ("_id", 1)]


class TestFetchArticlesByIds:
    @pytest.mark.asyncio
    async def test_empty_input(self, mock_db):
        result = await fetch_articles_by_ids(mock_db, [])
        assert result == {}

    @pytest.mark.asyncio
    async def test_none_ids_filtered(self, mock_db):
        result = await fetch_articles_by_ids(mock_db, [None, None])
        assert result == {}

    @pytest.mark.asyncio
    async def test_returns_dict_keyed_by_id(self, mock_db, mock_cursor, sample_article_doc):
        mock_cursor.to_list = AsyncMock(return_value=[sample_article_doc])
        mock_db._articles.find = MagicMock(return_value=mock_cursor)

        result = await fetch_articles_by_ids(
            mock_db, [ObjectId("65f1a2b3c4d5e6f7a8b9c0e2")]
        )

        assert str(sample_article_doc["_id"]) in result


class TestFetchEventsByArticleIds:
    @pytest.mark.asyncio
    async def test_empty_input(self, mock_db):
        result = await fetch_events_by_article_ids(mock_db, [])
        assert result == {}

    @pytest.mark.asyncio
    async def test_groups_by_article_id(self, mock_db, mock_cursor, sample_event_doc):
        mock_cursor.to_list = AsyncMock(return_value=[sample_event_doc])
        mock_db._events.find = MagicMock(return_value=mock_cursor)

        result = await fetch_events_by_article_ids(
            mock_db, [ObjectId("65f1a2b3c4d5e6f7a8b9c0e2")]
        )

        assert str(sample_event_doc["article_id"]) in result


class TestFetchRecentEvents:
    @pytest.mark.asyncio
    async def test_returns_recent(self, mock_db, mock_cursor, sample_event_doc):
        mock_cursor.to_list = AsyncMock(return_value=[sample_event_doc])
        mock_db._events.find = MagicMock(return_value=mock_cursor)

        result = await fetch_recent_events(mock_db, limit=5)

        assert len(result) == 1
        mock_cursor.limit.assert_called_with(5)


class TestFetchVesselsByName:
    @pytest.mark.asyncio
    async def test_queries_vessel_state_collection_case_insensitive(self, mock_cursor):
        docs = [
            {"vesselId": 101, "identification": {"shipName": "MV Star", "mmsi": 123456789}},
        ]
        mock_cursor.to_list = AsyncMock(return_value=docs)
        vessel_state_collection = MagicMock()
        vessel_state_collection.find = MagicMock(return_value=mock_cursor)
        db = MagicMock()
        db.get_collection = MagicMock(return_value=vessel_state_collection)

        result = await fetch_vessels_by_name(db, "star", limit=10)

        assert result == docs
        db.get_collection.assert_called_with("vessel_state")
        query_arg = vessel_state_collection.find.call_args[0][0]
        assert query_arg["identification.shipName"]["$options"] == "i"
        mock_cursor.limit.assert_called_with(10)

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_match(self, mock_cursor):
        mock_cursor.to_list = AsyncMock(return_value=[])
        vessel_state_collection = MagicMock()
        vessel_state_collection.find = MagicMock(return_value=mock_cursor)
        db = MagicMock()
        db.get_collection = MagicMock(return_value=vessel_state_collection)

        result = await fetch_vessels_by_name(db, "nonexistent-vessel")

        assert result == []


class TestFetchAllEvents:
    @pytest.mark.asyncio
    async def test_returns_all(self, mock_db, mock_cursor, sample_event_docs):
        mock_cursor.to_list = AsyncMock(return_value=sample_event_docs)
        mock_db._events.find = MagicMock(return_value=mock_cursor)

        result = await fetch_all_events(mock_db)

        assert len(result) == 2


class TestFetchTodayArticleCount:
    @pytest.mark.asyncio
    async def test_returns_count(self, mock_db):
        mock_db._articles.count_documents = AsyncMock(return_value=5)
        result = await fetch_today_article_count(mock_db)
        assert result == 5
