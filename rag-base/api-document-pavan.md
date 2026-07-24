# Omnisense API Integration Document

This document outlines the API endpoints an external UI application must connect to when integrating with the Omnisense service. The system consists of an **External Authentication Service** and a **Chat API Service**.

---

## 1. Authentication Service
To perform actions on the Chat API, the client must first authenticate with the External Authentication Service to obtain a JWT token.

### Login / Authenticate
* **URL**: `${AUTH_SERVICE_URL}/users/login` (Default: `http://34.60.206.175:5000/users/login`)
* **Method**: `POST`
* **Content-Type**: `application/x-www-form-urlencoded` or Form Data
* **Request Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `username` | string | Yes | The user's username |
  | `password` | string | Yes | The user's password |

* **Response (JSON)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "username": "pavan"
  }
  ```

---

## 2. Chat API Service
All endpoints under the Chat API Service require JWT authentication. 
Include the JWT token in the request headers:
```http
Authorization: Bearer <jwt_token>
```

* **Base URL**: `${SERVICE_API_URL}` (Default: `http://192.168.51.131:8000`)

### 🔑 Health Check
Check the API and LLM client connectivity. No authentication required.
* **Endpoint**: `/health`
* **Method**: `GET`
* **Response (JSON)**:
  ```json
  {
    "status": "ok",
    "llm_client_connected": true
  }
  ```

---

### 📁 Session Management

#### Create Session
Create a new chat session for the authenticated user.
* **Endpoint**: `/sessions`
* **Method**: `POST`
* **Request Body (JSON)**:
  ```json
  {
    "title": "Optional session title",
    "summary": "Optional summary"
  }
  ```
* **Response (JSON)**:
  ```json
  {
    "session_id": "64bcde1234567890abcdef12",
    "title": "Chat 2026-07-21 13:15",
    "summary": null,
    "user_id": "64bcde1234567890abcdef10",
    "created_at": "2026-07-21T07:45:00.000Z"
  }
  ```

#### Get User Sessions
Get all sessions belonging to the authenticated user.
* **Endpoint**: `/sessions`
* **Method**: `GET`
* **Response (JSON)**:
  ```json
  [
    {
      "session_id": "64bcde1234567890abcdef12",
      "title": "Chat 2026-07-21 13:15",
      "summary": null,
      "updated_at": "2026-07-21T07:45:00.000Z",
      "created_at": "2026-07-21T07:45:00.000Z"
    }
  ]
  ```

#### Get Session Messages
Retrieve message history for a specific session.
* **Endpoint**: `/sessions/{session_id}/messages`
* **Method**: `GET`
* **Response (JSON)**:
  ```json
  [
    {
      "message_id": "64bcde1234567890abcdef15",
      "session_id": "64bcde1234567890abcdef12",
      "role": "user",
      "content": "Hello, how are you?",
      "created_at": "2026-07-21T07:45:10.000Z"
    },
    {
      "message_id": "64bcde1234567890abcdef16",
      "session_id": "64bcde1234567890abcdef12",
      "role": "assistant",
      "content": "I am doing well, how can I assist you today?",
      "created_at": "2026-07-21T07:45:15.000Z"
    }
  ]
  ```

---

### 💬 Chat & Streaming

#### Blocking Chat Response
Send a message and get the full, non-streamed response from the assistant.
* **Endpoint**: `/chat`
* **Method**: `POST`
* **Request Body (JSON)**:
  ```json
  {
    "session_id": "64bcde1234567890abcdef12",
    "message": "What is the capital of France?"
  }
  ```
* **Response (JSON)**:
  ```json
  {
    "message": "The capital of France is Paris.",
    "provider": "ollama",
    "session_id": "64bcde1234567890abcdef12",
    "message_id": "64bcde1234567890abcdef18"
  }
  ```

#### Streaming Chat Response
Stream responses using Server-Sent Events (SSE).
* **Endpoint**: `/stream`
* **Method**: `POST`
* **Request Body (JSON)**:
  ```json
  {
    "session_id": "64bcde1234567890abcdef12",
    "message": "Explain quantum computing in one sentence."
  }
  ```
* **Response**: `text/event-stream` returning chunk events in JSON Patch format:
  ```http
  data: {"p": "/message/content/0", "o": "append", "v": "Quantum "}
  data: {"p": "/message/content/1", "o": "append", "v": "computing "}
  data: [DONE]
  ```

---

### 📄 Document & RAG Management

#### Add Session Documents
Ingest a document relative to a specific session.
* **Endpoint**: `/add-session-documents`
* **Method**: `POST`
* **Request Body (JSON)**:
  ```json
  {
    "file_path": "/absolute/path/to/document.pdf",
    "session_id": "64bcde1234567890abcdef12"
  }
  ```
* **Response (JSON)**:
  ```json
  {
    "status": "ok",
    "message": "Document added successfully"
  }
  ```

#### Add Global Documents
Ingest a document available globally to the user across all sessions.
* **Endpoint**: `/add-global-documents`
* **Method**: `POST`
* **Request Body (JSON)**:
  ```json
  {
    "file_path": "/absolute/path/to/document.pdf",
    "file_name": "document.pdf",
    "description": "Important reference document",
    "session_id": "64bcde1234567890abcdef12" // Optional
  }
  ```
* **Response (JSON)**:
  ```json
  {
    "status": "ok",
    "message": "Document added successfully"
  }
  ```

#### Enable Document
Enable an ingested document source.
* **Endpoint**: `/enable-file`
* **Method**: `GET`
* **Request Body (JSON)**:
  ```json
  {
    "document_id": "64bcde1234567890abcdef20",
    "document_type": "session" // or "global"
  }
  ```
* **Response (JSON)**:
  ```json
  {
    "status": "ok",
    "message": "Document status toggled successfully"
  }
  ```

#### Disable Document
Disable an ingested document source.
* **Endpoint**: `/disable-file`
* **Method**: `GET`
* **Request Body (JSON)**:
  ```json
  {
    "document_id": "64bcde1234567890abcdef20",
    "document_type": "session" // or "global"
  }
  ```
* **Response (JSON)**:
  ```json
  {
    "status": "ok",
    "message": "Document status toggled successfully"
  }
  ```
