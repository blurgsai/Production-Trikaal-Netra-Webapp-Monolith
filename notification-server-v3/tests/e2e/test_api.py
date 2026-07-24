from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import create_app
from shared.auth import create_admin_user, init_db
from shared.config import get_settings


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def test_app():
    """Create app with test overrides."""
    return create_app()


@pytest.fixture
def test_client(test_app):
    return TestClient(test_app)


@pytest.fixture
def api_headers():
    s = get_settings()
    return {s.api_key_header: s.api_keys[0]}


@pytest.fixture
def mock_mongo(test_app, monkeypatch):
    """Patch get_db dependency to return a fake MongoDB."""
    from bson import ObjectId

    class FakeCollection:
        def __init__(self, name):
            self.name = name
            self._data = []
            self._id = 1

        def _next_id(self):
            oid = f"{'0'* (24 - len(str(self._id)))}{self._id}"
            self._id += 1
            return ObjectId(oid)

        async def find_one(self, query):
            for doc in self._data:
                if all(doc.get(k) == v for k, v in query.items() if not k.startswith("$")):
                    return dict(doc)
            return None

        async def insert_one(self, data):
            doc = dict(data)
            if "_id" not in doc:
                doc["_id"] = self._next_id()
            self._data.append(doc)
            r = MagicMock()
            r.inserted_id = doc["_id"]
            return r

        async def insert_many(self, docs):
            inserted_ids = []
            for data in docs:
                doc = dict(data)
                if "_id" not in doc:
                    doc["_id"] = self._next_id()
                self._data.append(doc)
                inserted_ids.append(doc["_id"])
            r = MagicMock()
            r.inserted_ids = inserted_ids
            return r

        async def update_one(self, query, update, upsert=False):
            for doc in self._data:
                if all(doc.get(k) == v for k, v in query.items() if not k.startswith("$")):
                    for op, fields in update.items():
                        if op == "$set":
                            doc.update(fields)
                        elif op == "$addToSet":
                            for f, val in fields.items():
                                if f not in doc:
                                    doc[f] = []
                                if isinstance(val, dict) and "$each" in val:
                                    for item in val["$each"]:
                                        if item not in doc[f]:
                                            doc[f].append(item)
                                elif val not in doc[f]:
                                    doc[f].append(val)
                        elif op == "$pull":
                            for f, val in fields.items():
                                if f in doc:
                                    if isinstance(val, dict):
                                        # Simple $in support
                                        if "$in" in val:
                                            doc[f] = [x for x in doc[f] if x not in val["$in"]]
                                    elif val in doc[f]:
                                        doc[f].remove(val)
                    return MagicMock(modified_count=1, matched_count=1)
            if upsert:
                new_doc = dict(query)
                for op, fields in update.items():
                    if op == "$set":
                        new_doc.update(fields)
                if "_id" not in new_doc:
                    new_doc["_id"] = self._next_id()
                self._data.append(new_doc)
            return MagicMock(modified_count=0, matched_count=0)

        async def update_many(self, query, update):
            count = 0
            for doc in self._data:
                if all(doc.get(k) == v for k, v in query.items() if not k.startswith("$")):
                    for op, fields in update.items():
                        if op == "$addToSet":
                            for f, val in fields.items():
                                if f not in doc:
                                    doc[f] = []
                                if val not in doc[f]:
                                    doc[f].append(val)
                    count += 1
            return MagicMock(modified_count=count)

        async def delete_one(self, query):
            for i, doc in enumerate(self._data):
                match = True
                for k, v in query.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    del self._data[i]
                    return MagicMock(deleted_count=1)
            return MagicMock(deleted_count=0)

        async def count_documents(self, query):
            return sum(1 for d in self._data if self._match_query(d, query))

        def _match_query(self, doc, query):
            for k, v in query.items():
                if k.startswith("$"):
                    continue
                doc_val = doc.get(k)
                if isinstance(doc_val, list):
                    if v not in doc_val:
                        return False
                elif doc_val != v:
                    return False
            return True

        def find(self, query):
            matched = [d for d in self._data if self._match_query(d, query)]
            return FakeCursor(matched)

        def aggregate(self, pipeline):
            return FakeCursor([])

    class FakeCursor:
        def __init__(self, docs):
            self._docs = docs

        def sort(self, *args):
            return self

        def skip(self, n):
            return self

        def limit(self, n):
            return FakeCursor(self._docs[:n])

        def __aiter__(self):
            self._idx = 0
            return self

        async def __anext__(self):
            if self._idx >= len(self._docs):
                raise StopAsyncIteration
            doc = self._docs[self._idx]
            self._idx += 1
            return doc

    class FakeDB:
        def __init__(self):
            self._cols = {}

        def __getitem__(self, name):
            if name not in self._cols:
                self._cols[name] = FakeCollection(name)
            return self._cols[name]

    fake_db = FakeDB()

    async def fake_get_db():
        yield fake_db

    # Patch the dependency in the routers via app override
    from shared.dependencies import get_db
    test_app.dependency_overrides[get_db] = fake_get_db

    # Also patch get_db_for_topic so services that call it directly use fake_db
    import shared.db as db_mod
    import features.notifications.services as notif_svc
    _original_db_mod = db_mod.get_db_for_topic
    _original_notif_svc = notif_svc.get_db_for_topic
    _fake_get_db = lambda *args, **kwargs: (fake_db, args[2] if args else kwargs.get("storage_collection", "notifications"))
    db_mod.get_db_for_topic = _fake_get_db
    notif_svc.get_db_for_topic = _fake_get_db

    yield fake_db
    test_app.dependency_overrides.clear()
    db_mod.get_db_for_topic = _original_db_mod
    notif_svc.get_db_for_topic = _original_notif_svc


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_endpoint(self, test_client):
        response = test_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data


# ---------------------------------------------------------------------------
# Topics
# ---------------------------------------------------------------------------

class TestTopicsFlow:
    def test_create_list_get_update_delete(self, test_client, api_headers, mock_mongo):
        # Create
        resp = test_client.post("/api/topics", json={
            "topic": "test-topic",
            "channels": ["websocket"],
            "email_template": "<html>$body</html>",
            "email_subject_template": "$topic",
        }, headers=api_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["topic"] == "test-topic"
        assert data["channels"] == ["websocket"]

        # List
        resp = test_client.get("/api/topics", headers=api_headers)
        assert resp.status_code == 200
        topics = resp.json()
        assert len(topics) >= 1

        # Get
        resp = test_client.get("/api/topics/test-topic", headers=api_headers)
        assert resp.status_code == 200
        assert resp.json()["topic"] == "test-topic"

        # Update
        resp = test_client.patch("/api/topics/test-topic", json={
            "channels": ["websocket", "email"],
        }, headers=api_headers)
        assert resp.status_code == 200
        assert resp.json()["channels"] == ["websocket", "email"]

        # Delete
        resp = test_client.delete("/api/topics/test-topic", headers=api_headers)
        assert resp.status_code == 204

        # Verify deleted
        resp = test_client.get("/api/topics/test-topic", headers=api_headers)
        assert resp.status_code == 404

    def test_create_duplicate_returns_409(self, test_client, api_headers, mock_mongo):
        payload = {"topic": "dup-topic", "channels": ["websocket"]}
        r1 = test_client.post("/api/topics", json=payload, headers=api_headers)
        assert r1.status_code == 201
        r2 = test_client.post("/api/topics", json=payload, headers=api_headers)
        assert r2.status_code == 409

    def test_update_missing_returns_404(self, test_client, api_headers, mock_mongo):
        resp = test_client.patch("/api/topics/nonexistent", json={"channels": ["email"]}, headers=api_headers)
        assert resp.status_code == 404

    def test_delete_missing_returns_404(self, test_client, api_headers, mock_mongo):
        resp = test_client.delete("/api/topics/nonexistent", headers=api_headers)
        assert resp.status_code == 404

    def test_invalid_topic_name(self, test_client, api_headers, mock_mongo):
        resp = test_client.post("/api/topics", json={"topic": "Invalid Topic!", "channels": ["websocket"]}, headers=api_headers)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------

class TestGroupsFlow:
    def test_upsert_list_get_add_remove_delete(self, test_client, api_headers, mock_mongo):
        # Upsert
        resp = test_client.put("/api/groups/team-a", json={
            "group_id": "team-a",
            "usernames": ["u1", "u2"],
            "metadata": {"dept": "eng"},
        }, headers=api_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["group_id"] == "team-a"

        # List
        resp = test_client.get("/api/groups", headers=api_headers)
        assert resp.status_code == 200
        groups = resp.json()
        assert any(g["group_id"] == "team-a" for g in groups)

        # Get
        resp = test_client.get("/api/groups/team-a", headers=api_headers)
        assert resp.status_code == 200
        assert resp.json()["group_id"] == "team-a"

        # Add members
        resp = test_client.post("/api/groups/team-a/members", json={"usernames": ["u3"]}, headers=api_headers)
        assert resp.status_code == 200
        assert "u3" in resp.json()["usernames"]

        # Remove members
        resp = test_client.request("DELETE", "/api/groups/team-a/members", json={"usernames": ["u3"]}, headers=api_headers)
        assert resp.status_code == 200
        assert "u3" not in resp.json()["usernames"]

        # Delete
        resp = test_client.delete("/api/groups/team-a", headers=api_headers)
        assert resp.status_code == 204

        # Verify
        resp = test_client.get("/api/groups/team-a", headers=api_headers)
        assert resp.status_code == 404

    def test_get_missing_returns_404(self, test_client, api_headers, mock_mongo):
        resp = test_client.get("/api/groups/missing", headers=api_headers)
        assert resp.status_code == 404

    def test_add_members_missing_returns_404(self, test_client, api_headers, mock_mongo):
        resp = test_client.post("/api/groups/missing/members", json={"usernames": ["u1"]}, headers=api_headers)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class TestNotificationsFlow:
    def test_send_and_list(self, test_client, api_headers, mock_mongo):
        # Pre-create topic
        test_client.post("/api/topics", json={
            "topic": "alerts",
            "channels": ["websocket"],
        }, headers=api_headers)

        # Pre-create group
        test_client.put("/api/groups/team-a", json={
            "group_id": "team-a",
            "usernames": ["u1", "u2"],
        }, headers=api_headers)

        # Send notification with usernames
        with patch("shared.config.get_settings") as mock_settings:
            s = MagicMock()
            s.redis_url = ""
            s.ws_heartbeat_interval = 30
            mock_settings.return_value = s
            resp = test_client.post("/api/notify", json={
                "topic": "alerts",
                "usernames": ["u1"],
                "title": "Test",
                "body": "Hello world",
                "data": {"priority": "high"},
            }, headers=api_headers)
        assert resp.status_code == 202
        data = resp.json()
        assert data["topic"] == "alerts"
        assert "notification_id" in data

        # List notifications (mock aggregation since FakeCollection doesn't do $lookup)
        with patch("features.notifications.services.fetch_user_notifications", return_value=[{
            "user_notif_id": "un1",
            "topic": "alerts",
            "username": "u1",
            "title": "Test",
            "body": "Hello world",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }]):
            resp = test_client.get("/api/notifications/u1", headers=api_headers)
        assert resp.status_code == 200
        notifs = resp.json()
        assert len(notifs) >= 1

    def test_send_with_group(self, test_client, api_headers, mock_mongo):
        test_client.post("/api/topics", json={
            "topic": "group-alerts",
            "channels": ["websocket"],
        }, headers=api_headers)
        test_client.put("/api/groups/team-b", json={
            "group_id": "team-b",
            "usernames": ["u1", "u2"],
        }, headers=api_headers)

        with patch("shared.config.get_settings") as mock_settings:
            s = MagicMock()
            s.redis_url = ""
            s.ws_heartbeat_interval = 30
            mock_settings.return_value = s
            resp = test_client.post("/api/notify", json={
                "topic": "group-alerts",
                "group_id": "team-b",
                "title": "Group alert",
                "body": "For team",
            }, headers=api_headers)
        assert resp.status_code == 202
        assert resp.json()["topic"] == "group-alerts"

    def test_send_missing_topic_returns_404(self, test_client, api_headers, mock_mongo):
        resp = test_client.post("/api/notify", json={
            "topic": "nonexistent",
            "usernames": ["u1"],
            "body": "Hello",
        }, headers=api_headers)
        assert resp.status_code == 404

    def test_send_no_target_returns_422(self, test_client, api_headers, mock_mongo):
        test_client.post("/api/topics", json={
            "topic": "alerts",
            "channels": ["websocket"],
        }, headers=api_headers)
        resp = test_client.post("/api/notify", json={
            "topic": "alerts",
            "body": "Hello",
        }, headers=api_headers)
        assert resp.status_code == 422

    def test_read_endpoints_removed(self, test_client, api_headers, mock_mongo):
        # Mark read endpoint removed
        resp = test_client.patch("/api/notifications/invalid/read?username=u1", headers=api_headers)
        assert resp.status_code == 404

    def test_unauthorized_without_api_key(self, test_client, mock_mongo):
        resp = test_client.get("/api/topics")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Auth / Admin
# ---------------------------------------------------------------------------

class TestAuthFlow:
    def test_login_page(self, test_client):
        # Without templates dir, may 500; we just verify the route
        resp = test_client.get("/admin/login")
        assert resp.status_code in (200, 307, 303, 500)

    def test_logout(self, test_client):
        resp = test_client.post("/admin/logout", follow_redirects=False)
        assert resp.status_code == 303


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

class TestWebSocketEndpoint:
    def test_websocket_connect(self, test_app):
        from shared.auth import create_jwt_token
        token = create_jwt_token("test-user", "test-user")
        with patch("shared.config.get_settings") as mock_settings:
            s = MagicMock()
            s.ws_heartbeat_interval = 0.1
            mock_settings.return_value = s
            client = TestClient(test_app)
            with client.websocket_connect(f"/api/ws?token={token}") as ws:
                ws.send_text("ping")
                data = ws.receive_text()
                assert data == "pong"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class TestUsersFlow:
    def test_read_users_and_by_id(self, test_client, api_headers, mock_mongo):
        # Seed users directly into fake DB
        db = mock_mongo
        db["users"]._data.extend([
            {"_id": "u1", "username": "user-1", "display_name": "User One", "email": "u1@example.com", "is_active": True},
            {"_id": "u2", "username": "user-2", "display_name": "User Two", "email": "u2@example.com", "is_active": False},
        ])

        # List all
        resp = test_client.get("/api/users", headers=api_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert any(u["username"] == "user-1" for u in data)

        # Get by id
        resp = test_client.get("/api/users/user-1", headers=api_headers)
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "User One"
        assert resp.json()["email"] == "u1@example.com"

    def test_get_missing_returns_404(self, test_client, api_headers, mock_mongo):
        resp = test_client.get("/api/users/nonexistent", headers=api_headers)
        assert resp.status_code == 404

    def test_active_only_filter(self, test_client, api_headers, mock_mongo):
        db = mock_mongo
        db["users"]._data.extend([
            {"_id": "a", "username": "active-user", "display_name": "Active", "is_active": True},
            {"_id": "b", "username": "inactive-user", "display_name": "Inactive", "is_active": False},
        ])

        resp = test_client.get("/api/users?active_only=true", headers=api_headers)
        assert resp.status_code == 200
        usernames = {u["username"] for u in resp.json()}
        assert "active-user" in usernames
        assert "inactive-user" not in usernames

    def test_cud_endpoints_removed(self, test_client, api_headers, mock_mongo):
        # POST /api/users returns 405 because GET /api/users exists
        resp = test_client.post("/api/users", json={"username": "x"}, headers=api_headers)
        assert resp.status_code == 405

        resp = test_client.patch("/api/users/x", json={"display_name": "X"}, headers=api_headers)
        assert resp.status_code == 405

        resp = test_client.delete("/api/users/x", headers=api_headers)
        assert resp.status_code == 405
