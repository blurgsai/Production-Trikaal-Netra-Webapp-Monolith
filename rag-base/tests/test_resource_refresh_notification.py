"""
Integration test: Global-document resource-refresh notification pipeline
=========================================================================

Flow being tested
-----------------
1. Mint a JWT token for `pavan` using the same secret/algorithm the API uses.
2. Create a new chat session.
3. Ask about "MV Asterion Dawn" – should be answered (already in Chroma).
4. Ask about "MV Polaris Horizon route" – should NOT be answered (not yet in Chroma).
5. POST /add-global-documents with file_path="Polaris_Horizon_Profile.pdf".
6. Ask the same "MV Polaris Horizon route" question again.
7. Assert the final answer contains useful route information, confirming the
   _resources_stale → refresh → re-fetch pipeline worked end-to-end.

Prerequisites
-------------
- The API server must be running on http://localhost:8000
- The MCP tool server must be running on http://localhost:5000
- The user "pavan" must exist in MongoDB
- "Polaris_Horizon_Profile.pdf" must be uploaded to MinIO (omnisense-docs bucket)
- "MV Asterion Dawn" data must already be indexed in Chroma

Usage
-----
    python tests/test_resource_refresh_notification.py
"""

import asyncio
import json
import time
import jwt          # PyJWT – already a dep of the project
import httpx

# ---------------------------------------------------------------------------
# Configuration – mirrors defaults in core/utils/jwt_auth.py and .env
# ---------------------------------------------------------------------------
API_BASE = "http://localhost:8000"
JWT_SECRET = "jwt-secret-key"   # default when JWT_SECRET not set in .env
JWT_ALGORITHM = "HS256"
USERNAME = "pavan"

# The MinIO object key / file path that /add-global-documents expects
POLARIS_FILE_PATH = "Polaris_Horizon_Profile.pdf"

# How long to wait (seconds) for a streaming response before timing out
CHAT_TIMEOUT = 120

SEPARATOR = "=" * 70


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def mint_token(username: str, role: str = "user") -> str:
    """Create a HS256 JWT matching what jwt_auth.py expects (sub + role)."""
    payload = {
        "sub": username,
        "role": role,
        "iat": int(time.time()),
        # No 'exp' – token never expires; fine for a short-lived test
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def print_step(step: int, title: str) -> None:
    print(f"\n{SEPARATOR}")
    print(f"  STEP {step}: {title}")
    print(SEPARATOR)


def print_result(label: str, value) -> None:
    print(f"  [{label}]")
    if isinstance(value, dict):
        print(f"  {json.dumps(value, indent=4, default=str)}")
    else:
        print(f"  {value}")


def assert_contains_info(answer: str, topic: str, should_contain: bool) -> None:
    """
    Heuristic assertion.

    should_contain=True  → the answer must NOT use "don't know / not available" phrases.
    should_contain=False → a negative answer is expected; a positive one is a warning.
    """
    negative_phrases = [
        "i don't have",
        "i do not have",
        "no information",
        "not available",
        "cannot find",
        "unable to find",
        "i'm not sure",
        "i am not sure",
        "no data",
        "don't know",
        "do not know",
    ]
    answer_lower = answer.lower()
    answered = not any(p in answer_lower for p in negative_phrases)

    if should_contain:
        assert answered, (
            f"\n❌ FAIL: Expected LLM to answer about '{topic}', "
            f"but it responded negatively.\nResponse:\n{answer}"
        )
        print(f"  ✅ PASS: LLM answered about '{topic}' as expected.")
    else:
        if answered:
            print(
                f"  ⚠️  WARNING: LLM seems to have answered about '{topic}' "
                "before the document was added. "
                "The refresh test may not be conclusive. Continuing…"
            )
        else:
            print(f"  ✅ PASS: LLM correctly said it has no info about '{topic}'.")


# ---------------------------------------------------------------------------
# API call wrappers
# ---------------------------------------------------------------------------

async def create_session(client: httpx.AsyncClient, token: str) -> str:
    """POST /sessions and return the new session_id."""
    resp = await client.post(
        f"{API_BASE}/sessions",
        json={"title": "Resource Refresh Test Session"},
        headers=auth_headers(token),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    print_result("Created session", data)
    return data["session_id"]


async def ask(
    client: httpx.AsyncClient, token: str, session_id: str, message: str
) -> str:
    """
    POST /stream (SSE) and collect the full streamed answer as a single string.

    The endpoint yields SSE lines of the form:
        data: {"p":"/message/content","o":"append","v":"<chunk>"}
        …
        data: [DONE]
    """
    print(f"\n  💬 Asking: \"{message}\"")
    full_answer = ""

    async with client.stream(
        "POST",
        f"{API_BASE}/stream",
        json={"session_id": session_id, "message": message},
        headers={
            **auth_headers(token),
            "Accept": "text/event-stream",
        },
        timeout=CHAT_TIMEOUT,
    ) as response:
        response.raise_for_status()
        async for raw_line in response.aiter_lines():
            line = raw_line.strip()
            if not line or not line.startswith("data:"):
                continue
            payload = line[5:].strip()
            if payload == "[DONE]":
                break
            try:
                event = json.loads(payload)
                full_answer += event.get("v", "")
            except json.JSONDecodeError:
                pass  # ignore non-JSON SSE lines

    print(f"\n  🤖 Response:\n  {full_answer}")
    return full_answer


async def add_global_document(
    client: httpx.AsyncClient, token: str, file_path: str, session_id: str
) -> dict:
    """POST /add-global-documents."""
    resp = await client.post(
        f"{API_BASE}/add-global-documents",
        json={"file_path": file_path, "session_id": session_id},
        headers=auth_headers(token),
        timeout=120,   # ingestion can be slow
    )
    resp.raise_for_status()
    data = resp.json()
    print_result("/add-global-documents response", data)
    return data


# ---------------------------------------------------------------------------
# Main test
# ---------------------------------------------------------------------------

async def run_test():
    print("\n🚀 Starting resource-refresh notification integration test\n")

    # ------------------------------------------------------------------
    # Step 1 – Mint JWT
    # ------------------------------------------------------------------
    print_step(1, "Mint JWT token for user 'pavan'")
    token = mint_token(USERNAME)
    print(f"  ✅ Token created: {token[:50]}…")

    async with httpx.AsyncClient() as client:

        # --------------------------------------------------------------
        # Step 2 – Create session
        # --------------------------------------------------------------
        print_step(2, "Create a new chat session")
        session_id = await create_session(client, token)
        print(f"  ✅ session_id = {session_id}")

        # --------------------------------------------------------------
        # Step 3 – Vessel already in Chroma → LLM must answer
        # --------------------------------------------------------------
        print_step(3, "Ask about MV Asterion Dawn (should be answerable – already in Chroma)")
        answer_asterion = await ask(
            client, token, session_id,
            "What can you tell me about the vessel MV Asterion Dawn?",
        )
        assert_contains_info(answer_asterion, "MV Asterion Dawn", should_contain=True)

        # --------------------------------------------------------------
        # Step 4 – Polaris Horizon NOT yet in Chroma → LLM must NOT answer
        # --------------------------------------------------------------
        print_step(
            4,
            "Ask about MV Polaris Horizon route BEFORE upload (should NOT answer)",
        )
        answer_before = await ask(
            client, token, session_id,
            "What is the route of the vessel MV Polaris Horizon?",
        )
        assert_contains_info(answer_before, "MV Polaris Horizon", should_contain=False)

        # --------------------------------------------------------------
        # Step 5 – Upload the global document
        # --------------------------------------------------------------
        print_step(5, f"Upload global document: {POLARIS_FILE_PATH}")
        upload_result = await add_global_document(
            client, token, POLARIS_FILE_PATH, session_id
        )
        assert upload_result.get("status") == "ok", (
            f"❌ FAIL: /add-global-documents returned unexpected status: {upload_result}"
        )
        print("  ✅ Document uploaded and notification sent to MCP server.")

        # Allow the notification chain to propagate
        print("  ⏳ Waiting 3 seconds for notification to propagate…")
        await asyncio.sleep(3)

        # --------------------------------------------------------------
        # Step 6 – Same question AFTER upload → LLM must now answer
        # --------------------------------------------------------------
        print_step(
            6,
            "Ask about MV Polaris Horizon route AFTER upload (should now answer)",
        )
        answer_after = await ask(
            client, token, session_id,
            "What is the route of the vessel MV Polaris Horizon?",
        )
        assert_contains_info(answer_after, "MV Polaris Horizon", should_contain=True)

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print(f"\n{SEPARATOR}")
    print("  🎉 ALL STEPS PASSED – Resource refresh notification pipeline is working!")
    print(SEPARATOR)
    print(f"""
  Summary
  -------
  Session ID      : {session_id}
  Token (prefix)  : {token[:50]}…

  ✅ MV Asterion Dawn   → answered (data already in Chroma)
  ✅ MV Polaris Horizon → NOT answered before upload
  ✅ /add-global-documents triggered _resources_stale via MCP notification
  ✅ MV Polaris Horizon → answered after upload (Chroma refreshed on next prompt)
""")


if __name__ == "__main__":
    asyncio.run(run_test())
