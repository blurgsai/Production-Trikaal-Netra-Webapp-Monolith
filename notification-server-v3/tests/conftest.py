import asyncio
import os
import tempfile
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorDatabase

# Ensure src is on path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from shared.config import Settings, get_settings


# ---------------------------------------------------------------------------
# Settings / env overrides for tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def test_env():
    """Override settings for the entire test session."""
    os.environ["APP_NAME"] = "Notification Server Test"
    os.environ["APP_VERSION"] = "3.0.0-test"
    os.environ["MONGODB_URI"] = "mongodb://localhost:27017"
    os.environ["MONGODB_DB"] = "notification_server_test"
    os.environ["API_KEYS"] = '["test-api-key"]'
    os.environ["SECRET_KEY"] = "test-secret-32chars-long!!"
    os.environ["SQLITE_PATH"] = "test_admin.db"
    os.environ["REDIS_URL"] = ""
    os.environ["SMTP_USER"] = ""
    # Clear lru_cache so new env vars are picked up
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def settings(test_env):
    return get_settings()


# ---------------------------------------------------------------------------
# MongoDB mocks
# ---------------------------------------------------------------------------

class MockCollection:
    """A mock MongoDB collection with async methods."""

    def __init__(self, name: str, data: list | None = None):
        self.name = name
        self._docs = list(data) if data else []
        self._id_counter = 1

    def _next_id(self):
        oid = f"{'0' * (24 - len(str(self._id_counter)))}{self._id_counter}"
        self._id_counter += 1
        return oid

    async def find_one(self, query: dict) -> dict | None:
        for doc in self._docs:
            if self._match(doc, query):
                return dict(doc)
        return None

    async def insert_one(self, data: dict):
        doc = dict(data)
        if "_id" not in doc:
            doc["_id"] = self._next_id()
        self._docs.append(doc)
        mock_result = MagicMock()
        mock_result.inserted_id = doc["_id"]
        return mock_result

    async def insert_many(self, docs: list):
        inserted_ids = []
        for data in docs:
            doc = dict(data)
            if "_id" not in doc:
                doc["_id"] = self._next_id()
            self._docs.append(doc)
            inserted_ids.append(doc["_id"])
        mock_result = MagicMock()
        mock_result.inserted_ids = inserted_ids
        return mock_result

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        matched = False
        for doc in self._docs:
            if self._match(doc, query):
                matched = True
                self._apply_update(doc, update)
                break
        if not matched and upsert:
            new_doc = dict(query)
            self._apply_update(new_doc, update)
            if "_id" not in new_doc:
                new_doc["_id"] = self._next_id()
            self._docs.append(new_doc)
        mock_result = MagicMock()
        mock_result.modified_count = 1 if matched else 0
        mock_result.matched_count = 1 if matched else 0
        mock_result.upserted_id = None
        return mock_result

    async def update_many(self, query: dict, update: dict):
        count = 0
        for doc in self._docs:
            if self._match(doc, query):
                self._apply_update(doc, update)
                count += 1
        mock_result = MagicMock()
        mock_result.modified_count = count
        return mock_result

    async def delete_one(self, query: dict):
        for i, doc in enumerate(self._docs):
            if self._match(doc, query):
                del self._docs[i]
                mock_result = MagicMock()
                mock_result.deleted_count = 1
                return mock_result
        mock_result = MagicMock()
        mock_result.deleted_count = 0
        return mock_result

    async def count_documents(self, query: dict) -> int:
        return sum(1 for doc in self._docs if self._match(doc, query))

    def find(self, query: dict):
        matched = [d for d in self._docs if self._match(d, query)]
        return MockCursor(matched)

    def aggregate(self, pipeline: list):
        # Simplified aggregation mock for common pipelines
        return MockCursor(self._docs)

    def _match(self, doc: dict, query: dict) -> bool:
        for k, v in query.items():
            if k == "$or":
                if not any(self._match(doc, part) for part in v):
                    return False
                continue
            if k.startswith("$"):
                continue  # skip complex operators for simplicity
            doc_val = doc.get(k)
            # Handle ObjectId vs string comparison
            if hasattr(v, "__str__") and str(v) != v:  # ObjectId
                if str(doc_val) != str(v):
                    return False
            elif doc_val != v:
                return False
        return True

    def _apply_update(self, doc: dict, update: dict):
        for op, fields in update.items():
            if op == "$set":
                doc.update(fields)
            elif op == "$addToSet":
                for field, val in fields.items():
                    if field not in doc:
                        doc[field] = []
                    if isinstance(val, dict) and "$each" in val:
                        for item in val["$each"]:
                            if item not in doc[field]:
                                doc[field].append(item)
                    elif val not in doc[field]:
                        doc[field].append(val)
            elif op == "$pull":
                for field, val in fields.items():
                    if isinstance(val, dict) and "$in" in val:
                        doc[field] = [x for x in doc.get(field, []) if x not in val["$in"]]
                    else:
                        doc[field] = [x for x in doc.get(field, []) if x != val]


class MockCursor:
    def __init__(self, docs: list):
        self._docs = docs
        self._sort = None
        self._skip_n = 0
        self._limit_n = None

    def sort(self, key, direction):
        self._sort = (key, direction)
        return self

    def skip(self, n: int):
        self._skip_n = n
        return self

    def limit(self, n: int):
        self._limit_n = n
        return self

    def __aiter__(self):
        docs = list(self._docs)
        if self._sort:
            key, direction = self._sort
            docs = sorted(docs, key=lambda x: x.get(key) or "", reverse=(direction == -1))
        docs = docs[self._skip_n:]
        if self._limit_n is not None:
            docs = docs[:self._limit_n]
        self._iter_docs = docs
        self._idx = 0
        return self

    async def __anext__(self):
        if self._idx >= len(self._iter_docs):
            raise StopAsyncIteration
        doc = self._iter_docs[self._idx]
        self._idx += 1
        return doc


class _MockDB:
    def __init__(self) -> None:
        self._collections: dict[str, MockCollection] = {}

    def __getitem__(self, name: str):
        if name not in self._collections:
            self._collections[name] = MockCollection(name)
        return self._collections[name]


@pytest.fixture
def mock_db() -> AsyncIOMotorDatabase:
    """Return a mock MongoDB database with empty collections."""
    return _MockDB()  # type: ignore[return-value]


@pytest.fixture
def mock_db_with_data() -> AsyncIOMotorDatabase:
    """Return a mock MongoDB database pre-seeded with some data."""
    return _MockDB()  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# FastAPI app / client fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def app(test_env):
    from main import create_app
    return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest_asyncio.fixture
async def async_client(app) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def api_key_headers(settings):
    return {settings.api_key_header: settings.api_keys[0]}


@pytest.fixture
def admin_user(test_env):
    """Create an admin user in the test SQLite DB and yield it."""
    import asyncio
    import os
    from shared.auth import create_admin_user, init_db
    from shared.config import get_settings
    # Ensure clean state
    db_path = get_settings().sqlite_path
    if os.path.exists(db_path):
        os.remove(db_path)
    get_settings.cache_clear()
    old_loop = asyncio._get_running_loop()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(init_db())
        user = loop.run_until_complete(create_admin_user("admin", "admin123"))
        yield user
    finally:
        loop.close()
        if old_loop is not None:
            asyncio.set_event_loop(old_loop)
        else:
            asyncio.set_event_loop(None)
        if os.path.exists(db_path):
            os.remove(db_path)


# ---------------------------------------------------------------------------
# Event loop policy for pytest-asyncio
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
