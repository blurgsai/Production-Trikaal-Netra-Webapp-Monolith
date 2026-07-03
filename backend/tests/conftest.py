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

# Ensure backend/ is on sys.path so `routes` and `shared` resolve
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
