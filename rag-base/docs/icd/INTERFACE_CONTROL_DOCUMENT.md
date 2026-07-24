# MAIN ICD
## POC-Omnisense-RAG-Base Microservice
### For API Users (Deployed Service)

**Version**: 2.0  
**Date**: February 18, 2026  
**Status**: Active  
**Audience**: External applications using the deployed microservice

---

## 1. Overview

**POC-Omnisense-RAG-Base** is a RAG (Retrieval-Augmented Generation) microservice that enables conversational AI through REST API endpoints. The service maintains conversation history, retrieves data from multiple sources, and streams LLM responses in real-time.

### Default Service Location
- **API Base URL**: `http://localhost:8000`
- **Health Check**: `GET /health`

### Key Capabilities
- **Stateless REST API**: Easy integration for any application
- **Session management**: Persistent conversation history per user/session
- **Real-time streaming**: Server-Sent Events for token-by-token responses
- **Automatic memory management**: Conversation windowing and summarization
- **Multi-source data access**: Query MongoDB, ClickHouse, text files via transparent tool integration

---

## 2. Database Schemas

### 2.1 Sessions Collection

**Purpose**: Stores conversation sessions with metadata

**Collection Name**: `sessions`

**Schema:**
```json
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "title": String,
  "summary": String (optional),
  "updated_at": ISODate,
  "created_at": ISODate
}
```

**Example:**
```json
{
  "_id": "65f7a3d9c1e2b4a5f6g7h8i9",
  "user_id": "55f7a3d9c1e2b4a5f6g7h8i0",
  "title": "Q1 Planning Discussion",
  "summary": "Discussed quarterly objectives and resource allocation",
  "updated_at": "2026-02-18T15:30:00Z",
  "created_at": "2026-02-15T10:00:00Z"
}
```

---

### 2.2 Messages Collection

**Purpose**: Stores individual messages within sessions

**Collection Name**: `messages`

**Schema:**
```json
{
  "_id": ObjectId,
  "session_id": ObjectId,
  "role": String (enum: "system", "user", "assistant", "tool"),
  "content": String,
  "created_at": ISODate
}
```

**Examples:**
```json
{
  "_id": "65f7a3d9c1e2b4a5f6g7h8ja",
  "session_id": "65f7a3d9c1e2b4a5f6g7h8i9",
  "role": "user",
  "content": "What are our Q1 revenue targets?",
  "created_at": "2026-02-18T10:15:00Z"
}
```

```json
{
  "_id": "65f7a3d9c1e2b4a5f6g7h8jb",
  "session_id": "65f7a3d9c1e2b4a5f6g7h8i9",
  "role": "assistant",
  "content": "Based on the analytics data, Q1 targets are: Northeast Region $2.5M, Southeast Region $1.8M...",
  "created_at": "2026-02-18T10:15:15Z"
}
```

---

## 3. API Reference

### 3.1 Health Check

**Endpoint**: `GET /health`

**Purpose**: Verify microservice is operational

**Response** (200 OK):
```json
{
  "llm_client_connected": true,
  "mcp_server_connected": true
}
```

**Usage**:
```bash
curl http://localhost:8000/health
```

---

### 3.2 Chat Endpoint

**Endpoint**: `POST /chat`

**Purpose**: Send a message and receive complete LLM response

**Request**:
```json
{
  "session_id": "65f7a3d9c1e2b4a5f6g7h8i9"
}
```

**Response** (200 OK):
```json
{
  "message": "Based on the analytics, Q1 targets are $2.5M for Northeast, $1.8M for Southeast...",
  "provider": "gemini",
  "session_id": "65f7a3d9c1e2b4a5f6g7h8i9",
  "message_id": "65f7a3d9c1e2b4a5f6g7h8jb"
}
```

**Error Response** (500 Internal Server Error):
```json
{
  "detail": "LLM Client not connected. Make sure MCP server is running."
}
```

**Python Example**:
```python
import requests

response = requests.post(
    "http://localhost:8000/chat",
    json={"session_id": "65f7a3d9c1e2b4a5f6g7h8i9"}
)
result = response.json()
print(result["message"])
```

---

### 3.3 Stream Endpoint

**Endpoint**: `POST /stream`

**Purpose**: Stream LLM response token-by-token using Server-Sent Events

**Request**:
```json
{
  "session_id": "65f7a3d9c1e2b4a5f6g7h8i9"
}
```

**Response** (200 OK): JSON stream with JSON Patch-like format
```
{"p": "/message/content/0", "o": "append", "v": "Based"}
{"p": "/message/content/1", "o": "append", "v": " "}
{"p": "/message/content/2", "o": "append", "v": "on"}
{"p": "/message/content/3", "o": "append", "v": " "}
{"p": "/message/content/4", "o": "append", "v": "the"}
{"p": "/message/content/5", "o": "append", "v": " "}
{"p": "/message/content/6", "o": "append", "v": "analytics"}
...
[DONE]
```

**Format Notes:**
- `p` (path): JSON Patch-style path indicating where content is appended
- `o` (operation): Always `"append"` for streaming content chunks
- `v` (value): The actual text content chunk
- Stream terminates with `[DONE]` marker
- Each line is a complete JSON object or the string `[DONE]`

**Python Example (Streaming)**:
```python
import requests
import json

response = requests.post(
    "http://localhost:8000/stream",
    json={"session_id": "65f7a3d9c1e2b4a5f6g7h8i9"},
    stream=True
)

full_message = ""
for line in response.iter_lines():
    if not line:
        continue
    
    line_str = line.decode('utf-8') if isinstance(line, bytes) else line
    
    if line_str == "[DONE]":
        break
    
    try:
        event = json.loads(line_str)
        if event.get('o') == 'append' and '/content' in event.get('p', ''):
            text_chunk = event.get('v', '')
            full_message += text_chunk
            print(text_chunk, end="", flush=True)
    except json.JSONDecodeError:
        continue

print(f"\n✓ Full message saved to session automatically")
```

---

## 4. Common Workflows

### 4.1 Retrieving Sessions

**Diagram**: [diagram-retrieve-chats.mmd](../diagram-retrieve-chats.mmd)

**Flow**:
1. Query MongoDB sessions collection by user_id
2. Return array of session objects with metadata

**Implementation**:
```python
# Query sessions directly from ChatDB
def get_user_sessions(user_id: str):
    sessions = db.sessions.find(
        {"user_id": ObjectId(user_id)},
        sort=[("updated_at", -1)]
    )
    return [session for session in sessions]

# Example usage
sessions = get_user_sessions("55f7a3d9c1e2b4a5f6g7h8i0")
for session in sessions:
    print(f"  {session['title']} - {session['updated_at']}")
```

---

### 4.2 Sending a Message & Receiving Response

**Diagram**: [diagram-stream-message.mmd](../diagram-stream-message.mmd)

**Flow**:
1. POST message to `/stream` endpoint with session_id
2. Microservice inserts user message to ChatDB
3. Microservice queries conversation history
4. Microservice processes through LLM with MCP tools
5. Microservice streams tokens back via Server-Sent Events
6. Microservice inserts final assistant message to ChatDB

**Implementation**:
```python
import requests
import json

# Start streaming response
response = requests.post(
    "http://localhost:8000/stream",
    json={"session_id": "65f7a3d9c1e2b4a5f6g7h8i9"},
    stream=True
)

# Process streamed content chunks
full_message = ""
for line in response.iter_lines():
    if not line:
        continue
    
    line_str = line.decode('utf-8') if isinstance(line, bytes) else line
    
    # Check for stream terminator
    if line_str == "[DONE]":
        print("\n✓ Message saved to session automatically")
        break
    
    # Parse JSON Patch-like format
    try:
        event = json.loads(line_str)
        if event.get('o') == 'append' and '/content' in event.get('p', ''):
            text_chunk = event.get('v', '')
            if text_chunk:
                full_message += text_chunk
                print(text_chunk, end="", flush=True)
    except json.JSONDecodeError:
        pass
```

---

## 5. Error Handling

### Common Issues

| Error | Meaning | Solution |
|-------|---------|----------|
| `{"detail": "LLM Client not connected..."}` | Microservice cannot reach LLM provider | Verify `/health` endpoint. Check network connectivity. Verify API keys in `.env` |
| `{"detail": "No session found with ID..."}` | Session ID doesn't exist in ChatDB | Verify session_id is valid. Create new session first. |
| `Connection refused (localhost:8000)` | Microservice not running | Contact DevOps team. Verify service is deployed and healthy. |
| `Connection refused (localhost:27017)` | ChatDB (MongoDB) unreachable | Contact DevOps team. Verify MongoDB service is running. |
| `Stream truncated (HTTP 500)` | LLM response generation failed | Check service logs. May indicate timeout or invalid data format. |

---

### Debugging

**Verify Service Health**:
```bash
curl -s http://localhost:8000/health | jq .
```

**Expected output**:
```json
{
  "llm_client_connected": true,
  "mcp_server_connected": true
}
```

**Manual API Test**:
```bash
# Test chat endpoint
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "65f7a3d9c1e2b4a5f6g7h8i9"}'

# Test stream endpoint (shows JSON Patch-like format)
curl -X POST http://localhost:8000/stream \
  -H "Content-Type: application/json" \
  -d '{"session_id": "65f7a3d9c1e2b4a5f6g7h8i9"}' \
  -N  # Disable buffering for stream

# Expected output sample:
# {"p": "/message/content/0", "o": "append", "v": "Based"}
# {"p": "/message/content/1", "o": "append", "v": " "}
# {"p": "/message/content/2", "o": "append", "v": "on"}
# ...
# [DONE]
```

**Contact Support**:
- If service is unavailable: Contact DevOps team
- If API returns errors: Check request format against API Reference
- For data issues: Verify session IDs and message content format

---

## 6. Integration Checklist

**Before Using the Microservice:**
- [ ] Verify service is running at configured URL
- [ ] Run health check: `GET /health`
- [ ] Create test session in MongoDB
- [ ] Send test message to verify streaming works
- [ ] Implement error handling in your application

**During Integration:**
- [ ] Handle both `/chat` (full response) and `/stream` (token-by-token) endpoints
- [ ] Parse Server-Sent Events format for streaming responses
- [ ] Store session_id from responses for conversation continuity
- [ ] Implement connection retry logic for failed requests
- [ ] Log API responses for debugging

**In Production:**
- [ ] Monitor `/health` endpoint regularly
- [ ] Implement circuit breaker for failed requests
- [ ] Cache session lists for performance
- [ ] Track response times and token throughput
- [ ] Set appropriate HTTP timeouts for streaming

---

## 7. FAQ

**Q: How do I start a new conversation?**  
A: Create a new session document in MongoDB sessions collection with a user_id and title. Use the returned session_id for subsequent `/chat` or `/stream` calls.

**Q: Can I use both `/chat` and `/stream` endpoints for the same session?**  
A: Yes. Both endpoints update the same MongoDB session and message collections. `/chat` waits for complete response, `/stream` returns tokens as they're generated.

**Q: How are conversations stored?**  
A: All messages are stored in MongoDB messages collection with the session_id. Retrieve them using `db.messages.find({"session_id": ObjectId})`.

**Q: What happens if the stream disconnects mid-response?**  
A: The partial response is NOT stored in ChatDB. You should retry the request. The microservice handles partial streaming failures gracefully.

**Q: Can I customize the LLM model or provider?**  
A: No. The microservice uses the LLM configured by DevOps at deployment time. For different models, contact your deployment team.

**Q: How long are conversations kept?**  
A: Messages are retained indefinitely in MongoDB unless your deployment policy specifies retention limits.

---

## 8. Version History

| Version | Date | Audience | Changes |
|---------|------|----------|---------|
| 2.1 | Mar 17, 2026 | API Users | Updated streaming format to JSON Patch-like schema ({"p", "o", "v"} instead of SSE tokens) |
| 2.0 | Feb 18, 2026 | API Users | Focused on deployed service usage (removed deployment instructions) |
| 1.0 | Feb 18, 2026 | All | Initial comprehensive ICD |

---

**Last Updated**: February 18, 2026  
**For Support**: Contact your DevOps/API team
