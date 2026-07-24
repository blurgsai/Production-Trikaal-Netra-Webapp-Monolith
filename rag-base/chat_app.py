"""Simple Streamlit Chatbot using Chat API with JWT Authentication"""

import streamlit as st
import requests
import os
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Page configuration
st.set_page_config(
    page_title="Chat Bot",
    page_icon="💬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# API configuration
API_URL = os.getenv("SERVICE_API_URL", "http://localhost:8000")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:5000")

# API endpoints
SESSIONS_ENDPOINT = f"{API_URL}/sessions"
STREAM_ENDPOINT = f"{API_URL}/stream"
USERS_LOGIN_ENDPOINT = f"{AUTH_SERVICE_URL}/users/login"

# Initialize session state
if "current_session_id" not in st.session_state:
    st.session_state.current_session_id = None

if "messages" not in st.session_state:
    st.session_state.messages = []

if "session_title" not in st.session_state:
    st.session_state.session_title = "New Chat"

if "jwt_token" not in st.session_state:
    st.session_state.jwt_token = None

if "username" not in st.session_state:
    st.session_state.username = None

if "is_authenticated" not in st.session_state:
    st.session_state.is_authenticated = False


def login_user(username: str, password: str) -> bool:
    """Authenticate against external auth service and obtain JWT token.

    This app CANNOT generate or sign JWTs. It only verifies tokens
    by using them with the API, and obtains valid tokens from the
    external auth service.
    """
    try:
        response = requests.post(
            USERS_LOGIN_ENDPOINT,
            data={"username": username, "password": password},
            timeout=10,
        )

        if response.status_code != 200:
            try:
                err = response.json()
                detail = err.get("detail", "Login failed")
            except Exception:
                detail = response.text or "Login failed"
            st.error(f"Login failed: {detail}")
            return False

        data = response.json()
        token = data.get("token")

        if not token:
            st.error("Login failed: No token received from auth service")
            return False

        st.session_state.jwt_token = token
        st.session_state.username = data.get("username", username)
        st.session_state.is_authenticated = True
        return True

    except requests.exceptions.RequestException as e:
        st.error(f"Cannot reach auth service: {str(e)}")
        return False
    except Exception as e:
        st.error(f"Login failed: {str(e)}")
        return False


def logout_user():
    """Logout user and clear session"""
    st.session_state.jwt_token = None
    st.session_state.username = None
    st.session_state.is_authenticated = False
    st.session_state.current_session_id = None
    st.session_state.messages = []
    st.rerun()


def get_auth_headers():
    """Get authorization headers with JWT token"""
    if not st.session_state.jwt_token:
        return None
    return {
        "Authorization": f"Bearer {st.session_state.jwt_token}",
        "Content-Type": "application/json",
    }


def load_session_messages(session_id: str):
    """Load messages from a session via API"""
    headers = get_auth_headers()
    if not headers:
        return []

    try:
        response = requests.get(
            f"{API_URL}/sessions/{session_id}/messages", headers=headers, timeout=10
        )

        if response.status_code == 200:
            messages = response.json()
            return messages
        else:
            st.error(f"Failed to load messages: {response.status_code}")
            return []
    except Exception as e:
        st.error(f"Error loading messages: {str(e)}")
        return []


def get_all_sessions():
    """Fetch all sessions via API"""
    headers = get_auth_headers()
    if not headers:
        return []

    try:
        response = requests.get(SESSIONS_ENDPOINT, headers=headers, timeout=10)

        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Failed to fetch sessions: {response.status_code}")
            return []
    except Exception as e:
        st.error(f"Error fetching sessions: {str(e)}")
        return []


def create_new_session(title: str = None):
    """Create a new session via API"""
    headers = get_auth_headers()
    if not headers:
        st.error("Not authenticated")
        return None, None

    session_title = title or f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"

    try:
        response = requests.post(
            SESSIONS_ENDPOINT,
            headers=headers,
            json={"title": session_title, "summary": None},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            return data["session_id"], data["title"]
        else:
            st.error(f"Failed to create session: {response.status_code}")
            return None, None
    except Exception as e:
        st.error(f"Error creating session: {str(e)}")
        return None, None


def switch_session(session_id: str):
    """Switch to a different session"""
    st.session_state.current_session_id = str(session_id)

    # Find session in the list to get title
    sessions = get_all_sessions()
    for session in sessions:
        if session["session_id"] == session_id:
            st.session_state.session_title = session.get("title", "Chat")
            break

    # Load messages
    messages = load_session_messages(session_id)
    st.session_state.messages = [
        {"role": msg["role"], "content": msg["content"]} for msg in messages
    ]
    st.rerun()


def stream_response(session_id: str, user_message: str) -> tuple[str, bool]:
    """Stream response from API and return accumulated content and success status

    Parses JSON Patch-like format:
    - {"p": "/messsage/content", "o": "append", "v": "text"}  (content chunks)
    - "[DONE]" (stream end)

    Returns:
        (accumulated_content, success)
    """
    headers = get_auth_headers()
    if not headers:
        return "Not authenticated", False

    try:
        print(f"🔍 Making request to: {STREAM_ENDPOINT}")
        print(f"🔍 Session ID: {session_id}")
        print(f"🔍 Message: {user_message}")
        print(f"🔍 Headers: {headers}")

        response = requests.post(
            STREAM_ENDPOINT,
            headers=headers,
            json={"session_id": session_id, "message": user_message},
            timeout=300,
            stream=True,
        )

        print(f"🔍 Response status: {response.status_code}")
        print(f"🔍 Response headers: {response.headers}")

        if response.status_code != 200:
            error_detail = response.text
            return f"Error {response.status_code}: {error_detail}", False
        full_content = ""
        placeholder = st.empty()

        print(f"🔍 Starting to read stream...")

        for line in response.iter_lines():
            if isinstance(line, bytes):
                line = line.decode("utf-8")

            print(f"🔍 Stream line: {repr(line)}")

            if not line:
                # Skip empty lines
                continue

            # Handle SSE format (data: prefix)
            if line.startswith("data: "):
                line = line[6:]  # Remove "data: " prefix
                print(f"🔍 After data prefix: {repr(line)}")

            if line == "[DONE]":
                print(f"🔍 Stream ended with [DONE]")
                break

            try:
                event = json.loads(line)
                print(f"🔍 Parsed event: {event}")

                # Check for error responses
                if event.get("type") == "error":
                    error_msg = event.get("content", "Unknown error")
                    st.error(f"Stream error: {error_msg}")
                    return error_msg, False

                # Parse JSON Patch-like format: {"p": "/messsage/content", "o": "append", "v": "text"}
                if all(key in event for key in ["p", "o", "v"]):
                    if event["o"] == "append" and "/content" in event["p"]:
                        text = event["v"]
                        full_content += text
                        print(
                            f"🔍 Added text: {repr(text)}, total: {repr(full_content)}"
                        )
                        # Update display incrementally
                        with placeholder.container():
                            st.markdown(full_content)

            except json.JSONDecodeError as e:
                print(f"🔍 JSON decode error: {e}")
                continue

        print(f"🔍 Final content: {repr(full_content)}")
        return full_content, True
    except Exception as e:
        return f"Error: {str(e)}", False


# ============================================================================
# LOGIN / AUTHENTICATION
# ============================================================================
if not st.session_state.is_authenticated:
    st.title("🔐 Login")
    st.markdown(
        "Enter your credentials to obtain a JWT token from the authentication service."
    )

    with st.form("login_form"):
        username = st.text_input("Username", placeholder="Enter your username")
        password = st.text_input("Password", type="password", placeholder="Password")
        submit = st.form_submit_button("Login", use_container_width=True)

        if submit:
            if username and password:
                if login_user(username, password):
                    st.success(f"Welcome, {username}!")
                    st.rerun()
            else:
                st.error("Please enter both username and password")

    st.divider()
    st.caption(
        "This app does not generate or sign JWT tokens. It obtains a valid token by authenticating against the external auth service."
    )
    st.stop()

# ============================================================================
# SIDEBAR: Session Management
# ============================================================================
with st.sidebar:
    # User info and logout
    st.markdown(f"👤 **User:** {st.session_state.username}")
    if st.button("🚪 Logout", use_container_width=True):
        logout_user()

    st.divider()

    st.markdown("### 💾 Sessions")

    # New Session Button
    if st.button("➕ New Session", use_container_width=True, key="new_session_btn"):
        session_id, title = create_new_session()
        if session_id:
            st.success(f"Created: {title}")
            switch_session(session_id)

    st.divider()

    # Sessions List
    st.markdown("**Your Conversations**")
    sessions = get_all_sessions()

    if sessions:
        for session in sessions:
            session_id = session["session_id"]
            title = session.get("title", "Untitled")
            updated_str = session.get("updated_at", "")

            # Format time
            try:
                if updated_str:
                    updated = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
                    delta = (
                        datetime.now(updated.tzinfo) - updated
                        if updated.tzinfo
                        else datetime.now() - updated
                    )
                    minutes = int(delta.total_seconds() / 60)
                    if minutes < 1:
                        time_str = "now"
                    elif minutes < 60:
                        time_str = f"{minutes}m ago"
                    else:
                        time_str = updated.strftime("%b %d")
                else:
                    time_str = "now"
            except:
                time_str = "now"

            # Session button with styling
            col1, col2 = st.columns([0.85, 0.15])

            with col1:
                is_active = st.session_state.current_session_id == session_id
                btn_label = f"📌 {title}" if is_active else f"  {title}"

                if st.button(
                    btn_label,
                    key=f"session_{session_id}",
                    use_container_width=True,
                    disabled=is_active,
                ):
                    switch_session(session_id)

            with col2:
                st.caption(time_str)
    else:
        st.info("No conversations yet. Create one to get started!")


# ============================================================================
# MAIN CHAT AREA
# ============================================================================
st.title("💬 Chat Bot")

if not st.session_state.current_session_id:
    st.info("👈 Create a new session or select one from the sidebar to start chatting!")
else:
    # Display current session info
    st.markdown(f"**Session:** `{st.session_state.session_title}`")
    st.caption(f"ID: `{st.session_state.current_session_id}`")

    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input
    if prompt := st.chat_input("Type your message here..."):
        # Add user message to session state
        st.session_state.messages.append({"role": "user", "content": prompt})

        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)

        # Get response from API (streaming) - message is sent in stream_response
        with st.chat_message("assistant"):
            assistant_message, success = stream_response(
                st.session_state.current_session_id, prompt
            )

            if success and assistant_message:
                # Add to session state
                st.session_state.messages.append(
                    {"role": "assistant", "content": assistant_message}
                )
            else:
                st.error(f"Failed to get response: {assistant_message}")
