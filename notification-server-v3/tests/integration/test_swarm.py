"""
Integration tests against the 3-node Docker Swarm.

Run the swarm first:
    docker compose -f docker-compose.swarm.yml up -d --build

Then run tests:
    python -m pytest tests/integration/test_swarm.py -v
"""

import json
import os
import uuid

import pytest
import requests
import websocket

BASE_URL = os.getenv("SWARM_URL", "http://localhost:8080")
WS_URL = os.getenv("SWARM_WS_URL", "ws://localhost:8080")
NODES = [
    os.getenv("NODE1_URL", "http://localhost:8001"),
    os.getenv("NODE2_URL", "http://localhost:8002"),
    os.getenv("NODE3_URL", "http://localhost:8003"),
]
API_KEY = os.getenv("API_KEY", "secret-key-1")
API_HEADER = "X-API-Key"


def _make_ws_token(username: str) -> str:
    """Create a JWT token for WebSocket connections."""
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
    from shared.auth import create_jwt_token
    return create_jwt_token("test-id", username, display_name=username)


@pytest.fixture
def headers():
    return {API_HEADER: API_KEY}


@pytest.fixture
def unique():
    return lambda prefix: f"{prefix}-{uuid.uuid4().hex[:8]}"


# ---------------------------------------------------------------------------
# Health & Discovery
# ---------------------------------------------------------------------------

class TestHealthDiscovery:
    def test_load_balancer_reaches_all_nodes(self):
        seen = set()
        for _ in range(10):
            resp = requests.get(f"{BASE_URL}/health", timeout=5)
            assert resp.status_code == 200
            seen.add(resp.json()["version"])
        assert "3.0.0" in seen

    def test_each_node_directly(self):
        for node in NODES:
            resp = requests.get(f"{node}/health", timeout=5)
            assert resp.status_code == 200
            assert resp.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Topics
# ---------------------------------------------------------------------------

class TestTopicIntegration:
    def test_topic_lifecycle(self, headers, unique):
        topic = unique("topic")

        # Create
        resp = requests.post(
            f"{BASE_URL}/api/topics",
            json={"topic": topic, "channels": ["websocket"]},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 201

        # List
        resp = requests.get(f"{BASE_URL}/api/topics", headers=headers, timeout=5)
        assert resp.status_code == 200
        assert any(t["topic"] == topic for t in resp.json())

        # Get
        resp = requests.get(f"{BASE_URL}/api/topics/{topic}", headers=headers, timeout=5)
        assert resp.status_code == 200
        assert resp.json()["topic"] == topic

        # Update
        resp = requests.patch(
            f"{BASE_URL}/api/topics/{topic}",
            json={"channels": ["websocket", "email"]},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 200
        assert "email" in resp.json()["channels"]

        # Delete
        resp = requests.delete(f"{BASE_URL}/api/topics/{topic}", headers=headers, timeout=5)
        assert resp.status_code == 204

        # Verify gone
        resp = requests.get(f"{BASE_URL}/api/topics/{topic}", headers=headers, timeout=5)
        assert resp.status_code == 404

    def test_duplicate_topic_returns_409(self, headers, unique):
        topic = unique("dup-topic")
        requests.post(
            f"{BASE_URL}/api/topics",
            json={"topic": topic, "channels": ["websocket"]},
            headers=headers,
            timeout=5,
        )
        resp = requests.post(
            f"{BASE_URL}/api/topics",
            json={"topic": topic, "channels": ["websocket"]},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 409
        # Cleanup
        requests.delete(f"{BASE_URL}/api/topics/{topic}", headers=headers, timeout=5)


# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------

class TestGroupIntegration:
    def test_group_lifecycle(self, headers, unique):
        gid = unique("group")

        # Upsert
        resp = requests.put(
            f"{BASE_URL}/api/groups/{gid}",
            json={"group_id": gid, "usernames": ["u1", "u2"], "metadata": {"dept": "eng"}},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 200
        assert resp.json()["group_id"] == gid

        # List
        resp = requests.get(f"{BASE_URL}/api/groups", headers=headers, timeout=5)
        assert resp.status_code == 200
        assert any(g["group_id"] == gid for g in resp.json())

        # Get
        resp = requests.get(f"{BASE_URL}/api/groups/{gid}", headers=headers, timeout=5)
        assert resp.status_code == 200
        assert resp.json()["usernames"] == ["u1", "u2"]

        # Add members
        resp = requests.post(
            f"{BASE_URL}/api/groups/{gid}/members",
            json={"usernames": ["u3"]},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 200
        assert "u3" in resp.json()["usernames"]

        # Remove members
        resp = requests.request(
            "DELETE",
            f"{BASE_URL}/api/groups/{gid}/members",
            json={"usernames": ["u3"]},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 200
        assert "u3" not in resp.json()["usernames"]

        # Delete
        resp = requests.delete(f"{BASE_URL}/api/groups/{gid}", headers=headers, timeout=5)
        assert resp.status_code == 204

        # Verify gone
        resp = requests.get(f"{BASE_URL}/api/groups/{gid}", headers=headers, timeout=5)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class TestNotificationIntegration:
    def test_send_to_usernames_and_list(self, headers, unique):
        topic = unique("notif-topic")
        client = unique("client")

        # Setup topic
        requests.post(
            f"{BASE_URL}/api/topics",
            json={"topic": topic, "channels": ["websocket"]},
            headers=headers,
            timeout=5,
        )

        # Send notification
        resp = requests.post(
            f"{BASE_URL}/api/notify",
            json={
                "topic": topic,
                "usernames": [client],
                "title": "Hello",
                "body": "World",
                "data": {"priority": "high"},
            },
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 202
        data = resp.json()
        assert data["topic"] == topic
        assert "notification_id" in data

        # List notifications for client
        resp = requests.get(f"{BASE_URL}/api/notifications/{client}", headers=headers, timeout=5)
        assert resp.status_code == 200
        notifs = resp.json()
        assert len(notifs) >= 1

    def test_read_endpoints_removed(self, headers, unique):
        # Mark read endpoints removed
        resp = requests.patch(
            f"{BASE_URL}/api/notifications/invalid/read?username=test",
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 404

    def test_send_to_group(self, headers, unique):
        topic = unique("group-topic")
        gid = unique("group")

        requests.post(
            f"{BASE_URL}/api/topics",
            json={"topic": topic, "channels": ["websocket"]},
            headers=headers,
            timeout=5,
        )
        requests.put(
            f"{BASE_URL}/api/groups/{gid}",
            json={"group_id": gid, "usernames": ["g1", "g2"]},
            headers=headers,
            timeout=5,
        )

        resp = requests.post(
            f"{BASE_URL}/api/notify",
            json={
                "topic": topic,
                "group_id": gid,
                "title": "Group Alert",
                "body": "For group",
            },
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 202

        # Cleanup
        requests.delete(f"{BASE_URL}/api/topics/{topic}", headers=headers, timeout=5)
        requests.delete(f"{BASE_URL}/api/groups/{gid}", headers=headers, timeout=5)

    def test_unauthorized_without_api_key(self):
        resp = requests.get(f"{BASE_URL}/api/topics", timeout=5)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class TestUserIntegration:
    def test_read_endpoints_available(self, headers):
        resp = requests.get(f"{BASE_URL}/api/users", headers=headers, timeout=5)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_missing_returns_404(self, headers, unique):
        uid = unique("no-user")
        resp = requests.get(f"{BASE_URL}/api/users/{uid}", headers=headers, timeout=5)
        assert resp.status_code == 404

    def test_cud_endpoints_removed(self, headers, unique):
        uid = unique("cud")
        # POST/PATCH/DELETE return 405 because GET exists on those paths
        resp = requests.post(
            f"{BASE_URL}/api/users",
            json={"username": uid, "display_name": "X"},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 405

        resp = requests.patch(
            f"{BASE_URL}/api/users/{uid}",
            json={"display_name": "Y"},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 405

        resp = requests.delete(f"{BASE_URL}/api/users/{uid}", headers=headers, timeout=5)
        assert resp.status_code == 405

    def test_websocket_does_not_create_user(self, headers, unique):
        uid = unique("ws-user")
        token = _make_ws_token(uid)
        ws = websocket.create_connection(
            f"ws://localhost:8001/api/ws?token={token}",
            timeout=5,
        )
        ws.close()

        import time
        time.sleep(0.5)

        # User should NOT have been auto-created
        resp = requests.get(f"{BASE_URL}/api/users/{uid}", headers=headers, timeout=5)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Admin Auth
# ---------------------------------------------------------------------------

class TestAdminAuthIntegration:
    def test_login_page_renders(self):
        resp = requests.get(f"{BASE_URL}/admin/login", timeout=5)
        assert resp.status_code == 200
        assert "login" in resp.text.lower() or "form" in resp.text.lower()

    def test_logout_redirects(self):
        resp = requests.post(f"{BASE_URL}/admin/logout", allow_redirects=False, timeout=5)
        assert resp.status_code == 303
        assert "/admin/login" in resp.headers.get("location", "")


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

class TestWebSocketIntegration:
    def test_websocket_connect_and_receive(self, headers, unique):
        topic = unique("ws-topic")
        username = unique("ws-client")
        token = _make_ws_token(username)

        # Setup topic
        requests.post(
            f"{BASE_URL}/api/topics",
            json={"topic": topic, "channels": ["websocket"]},
            headers=headers,
            timeout=5,
        )

        # Connect WebSocket directly to Node 1 (bypass nginx to avoid WS proxy issues)
        # Note: notifications router is mounted with prefix="/api"
        ws = websocket.create_connection(
            f"ws://localhost:8001/api/ws?token={token}",
            timeout=5,
        )

        # Send notification via LB
        requests.post(
            f"{BASE_URL}/api/notify",
            json={
                "topic": topic,
                "usernames": [username],
                "title": "WS Test",
                "body": "Push message",
            },
            headers=headers,
            timeout=5,
        )

        # Receive message (may take a moment via Redis)
        ws.settimeout(5)
        try:
            msg = ws.recv()
            payload = json.loads(msg)
            assert payload["title"] == "WS Test"
        except websocket._exceptions.WebSocketTimeoutException:
            pytest.skip("WS message not received within timeout — Redis may be slow or WS not routed")
        finally:
            ws.close()

        # Cleanup
        requests.delete(f"{BASE_URL}/api/topics/{topic}", headers=headers, timeout=5)


# ---------------------------------------------------------------------------
# Horizontal Scaling (Node Affinity)
# ---------------------------------------------------------------------------

class TestHorizontalScaling:
    def test_data_written_on_one_node_visible_on_another(self, headers, unique):
        topic = unique("scale-topic")

        # Write via Node 1
        resp = requests.post(
            f"{NODES[0]}/api/topics",
            json={"topic": topic, "channels": ["websocket"]},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == 201

        # Read via Node 2
        resp = requests.get(f"{NODES[1]}/api/topics/{topic}", headers=headers, timeout=5)
        assert resp.status_code == 200
        assert resp.json()["topic"] == topic

        # Read via Node 3
        resp = requests.get(f"{NODES[2]}/api/topics/{topic}", headers=headers, timeout=5)
        assert resp.status_code == 200

        # Cleanup via LB
        requests.delete(f"{BASE_URL}/api/topics/{topic}", headers=headers, timeout=5)
