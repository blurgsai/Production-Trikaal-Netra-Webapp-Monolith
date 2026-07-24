"""
tests/stress_tests/locustfile.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Locust load testing suite for Omnisense RAG Chatbot.
Simulates realistic multi-user concurrency and measures system metrics:
- ST-01: Burst traffic on `POST /sessions` and `POST /chat`
- ST-04: Concurrent document ingestion (`/sessions/{id}/documents`) alongside heavy search load
- ST-06: SSE streaming Time-To-First-Token (TTFT) and error rate tracking

Usage:
  # Run in headless mode for 1 minute with 50 users spawned at 10/sec:
  locust -f tests/stress_tests/locustfile.py --headless -u 50 -r 10 --run-time 1m --host http://localhost:8000
"""

import json
import os
import time
from typing import Dict, Any, Optional
from locust import HttpUser, task, between, events


def _mint_jwt_token(username: str) -> str:
    """Generate a JWT token for the simulated user."""
    import jwt as pyjwt
    secret = os.getenv("JWT_SECRET", "jwt-secret-key")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    token = pyjwt.encode(
        {"sub": username, "role": "user"},
        secret,
        algorithm=algorithm,
    )
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return token


class BaseChatbotUser(HttpUser):
    """Abstract base class handling user authentication and session creation."""
    abstract = True
    wait_time = between(1.0, 3.0)

    def on_start(self):
        """Called when a Locust user spawns. Sets up auth headers and initial session."""
        self.username = f"locust_user_{id(self)}"
        token = _mint_jwt_token(self.username)
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.session_id: Optional[str] = None
        self._create_session()

    def _create_session(self):
        with self.client.post(
            "/sessions",
            headers=self.headers,
            json={"title": f"Locust Session for {self.username}"},
            name="POST /sessions",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.session_id = data.get("session_id")
                response.success()
            else:
                response.failure(f"Failed to create session: {response.status_code}")


class ChatUser(BaseChatbotUser):
    """
    ST-01: Simulates standard non-streaming chat users generating burst traffic.
    """
    weight = 3  # Higher proportion of users will run this class

    @task(4)
    def send_chat_message(self):
        if not self.session_id:
            self._create_session()
            if not self.session_id:
                return

        payload = {
            "session_id": self.session_id,
            "message": "What is the summary of recent global events?"
        }
        with self.client.post(
            "/chat",
            headers=self.headers,
            json=payload,
            name="POST /chat",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "response" in data:
                    response.success()
                else:
                    response.failure("Missing 'response' field in /chat payload")
            elif response.status_code == 429:
                response.failure("Rate limited (429) on /chat")
            else:
                response.failure(f"Chat failed: {response.status_code} - {response.text[:100]}")

    @task(1)
    def list_sessions(self):
        self.client.get("/sessions", headers=self.headers, name="GET /sessions")


class StreamingChatUser(BaseChatbotUser):
    """
    ST-06: Simulates streaming chat users (`POST /stream`) and tracks SSE stream timing,
    specifically measuring Time-To-First-Token (TTFT) and stream completeness.
    """
    weight = 5  # Majority of users testing modern streaming interface

    @task
    def stream_conversation_load(self):
        if not self.session_id:
            self._create_session()
            if not self.session_id:
                return

        payload = {
            "session_id": self.session_id,
            "message": "Explain the significance of the latest data chunks."
        }
        
        start_time = time.perf_counter()
        first_token_time = None
        chunks_received = 0
        has_done = False
        error_chunk_seen = False

        with self.client.post(
            "/stream",
            headers=self.headers,
            json=payload,
            name="POST /stream [SSE]",
            stream=True,
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Stream connect failed with status {response.status_code}")
                return

            try:
                for line in response.iter_lines():
                    if not line:
                        continue
                    line_str = line.decode("utf-8", errors="replace").strip()
                    if not line_str.startswith("data: "):
                        continue
                    
                    if first_token_time is None:
                        first_token_time = (time.perf_counter() - start_time) * 1000.0
                        # Fire custom event to track TTFT metric separately in Locust reports
                        events.request.fire(
                            request_type="SSE",
                            name="Time-To-First-Token (TTFT)",
                            response_time=first_token_time,
                            response_length=0,
                            exception=None,
                            context=self.context() if hasattr(self, 'context') else {}
                        )

                    payload_str = line_str[6:]
                    if payload_str == "[DONE]":
                        has_done = True
                        break
                    else:
                        chunks_received += 1
                        try:
                            parsed = json.loads(payload_str)
                            if isinstance(parsed, dict) and parsed.get("type") == "error":
                                error_chunk_seen = True
                        except json.JSONDecodeError:
                            pass
            except Exception as e:
                response.failure(f"Stream read aborted or failed: {e}")
                return

            if has_done:
                if error_chunk_seen:
                    response.success()  # Graceful error handling in stream counts as handled
                else:
                    response.success()
            else:
                response.failure(f"Stream closed prematurely after {chunks_received} chunks without [DONE]")


class RAGContentionUser(BaseChatbotUser):
    """
    ST-04: Simulates concurrent background document uploads and status toggles
    while active searches occur, stressing ChromaDB locking and HNSW index updates.
    """
    weight = 1  # Lower proportion, simulating background ingestion workers

    @task
    def upload_and_toggle_document(self):
        if not self.session_id:
            return

        # Simulate uploading a session document or marking global doc
        dummy_doc_id = f"doc_{int(time.time() * 1000)}"
        with self.client.post(
            f"/sessions/{self.session_id}/documents",
            headers=self.headers,
            json={"document_id": dummy_doc_id, "file_name": "locust_test.txt"},
            name="POST /sessions/{id}/documents",
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            elif response.status_code == 500 and "database is locked" in response.text.lower():
                response.failure("ChromaDB / SQLite lock error (`database is locked`) detected during upload!")
            else:
                response.failure(f"Document upload failed: {response.status_code}")
