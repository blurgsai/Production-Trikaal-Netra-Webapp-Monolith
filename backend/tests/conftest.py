import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio

# ── Set required env vars BEFORE any app imports ──
os.environ.setdefault("MONGO_URI", "mongodb://test:test@localhost:27017")
os.environ.setdefault("MONGO_DB", "test_db")
os.environ.setdefault("JWT_SECRET", "test_jwt_secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("CLICKHOUSE_USER", "default")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")
os.environ.setdefault("CLICKHOUSE_HOST", "localhost")
os.environ.setdefault("CLICKHOUSE_PORT", "8123")

# Ensure backend/ is on sys.path so `src` resolves
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture
def mock_http_client():
    """A mocked httpx.AsyncClient with async context support."""
    client = MagicMock()
    client.get = AsyncMock()
    client.post = AsyncMock()
    # httpx.AsyncClient is also an async context manager
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    return client


@pytest.fixture
def sample_trajectory_raw():
    """Tab-separated raw ClickHouse trajectory response.
    Real format: lat\\tlon\\tts (TabSeparated)
    Real data observed: lat ~13.6-18.98, lon ~65.2-73.8
    """
    return (
        "15.903896666666666\t65.26356333333334\t2024-12-04 17:50:30\n"
        "15.89908\t65.26729833333333\t2024-12-04 17:49:29\n"
        "15.894265\t65.271035\t2024-12-04 17:48:29\n"
    )


@pytest.fixture
def sample_playback_raw():
    """Tab-separated raw ClickHouse playback response.
    Real format: vessel_id\\tts\\tlat\\tlon\\theading (TabSeparated)
    Real data observed: vessel_ids are large ints, heading=0
    """
    return (
        "366500659123456789\t2024-12-04 17:50:30\t15.903896666666666\t65.26356333333334\t0\n"
        "366500659123456789\t2024-12-04 17:49:29\t15.89908\t65.26729833333333\t0\n"
        "366168522123456789\t2024-12-04 17:50:30\t15.894265\t65.271035\t0\n"
    )


@pytest.fixture
def sample_polygon_geojson():
    """A simple square polygon around the real data area (lat 15-16, lon 65-66)."""
    return {
        "type": "Polygon",
        "coordinates": [[
            [65.0, 15.0],
            [66.0, 15.0],
            [66.0, 16.0],
            [65.0, 16.0],
            [65.0, 15.0],
        ]],
    }


# ── World Monitor fixtures ──

from bson import ObjectId  # noqa: E402


@pytest.fixture
def sample_event_doc():
    """A raw MongoDB event document for world_monitor_events collection."""
    return {
        "_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"),
        "event_id": "evt-001",
        "event_type": "Piracy",
        "threat_level": "HIGH",
        "summary": "Suspicious vessel activity near Gulf of Aden",
        "reasoning": "Multiple fast boats approached a cargo vessel.",
        "relevance_score": 0.85,
        "enriched_at": "2025-01-15T10:30:00Z",
        "article_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0e2"),
        "location": [
            {
                "name": "Gulf of Aden",
                "geometry": {
                    "type": "Point",
                    "coordinates": [45.0, 12.5],
                },
            },
            {
                "name": "Bab-el-Mandeb",
                "geometry": {
                    "type": "Point",
                    "coordinates": [43.3, 12.6],
                },
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
def sample_article_doc():
    """A raw MongoDB article document for world_monitor_articles collection."""
    return {
        "_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0e2"),
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
                "geometry": {
                    "type": "Point",
                    "coordinates": [45.0, 12.5],
                },
            },
        ],
    }


@pytest.fixture
def sample_event_docs(sample_event_doc):
    """Multiple raw event documents for batch tests."""
    second = dict(sample_event_doc)
    second["_id"] = ObjectId("65f1a2b3c4d5e6f7a8b9c0d3")
    second["event_id"] = "evt-002"
    second["threat_level"] = "CRITICAL"
    second["event_type"] = "Conflict"
    return [sample_event_doc, second]


@pytest.fixture
def mock_db():
    """A mocked Motor MongoDB database with collection support."""
    db = MagicMock()
    events_collection = MagicMock()
    articles_collection = MagicMock()
    db.get_collection = MagicMock(
        side_effect=lambda name: events_collection
        if name == "world_monitor_events"
        else articles_collection
    )
    db._events = events_collection
    db._articles = articles_collection
    return db


@pytest.fixture
def mock_cursor():
    """A mocked Motor cursor that supports sort/skip/limit/to_list chaining."""
    cursor = MagicMock()
    cursor.sort = MagicMock(return_value=cursor)
    cursor.skip = MagicMock(return_value=cursor)
    cursor.limit = MagicMock(return_value=cursor)
    cursor.to_list = AsyncMock(return_value=[])
    return cursor
