# Infrastructure Architecture

## Overview

The microservice consists of **infrastructure services** (databases, vector store, LLM) and **application services** (MCP server, API, UIs). This document explains how they interact.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User Interface Layer                                   │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  Chat UI         │  │  Config Generator│             │
│  │  (Streamlit)     │  │  (Streamlit)     │             │
│  │  :8501           │  │  :8502           │             │
│  └────────┬─────────┘  └──────────────────┘             │
└───────────┼────────────────────────────────────────────┘
            │ HTTP
┌───────────▼────────────────────────────────────────────┐
│  Application Service Layer                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API (FastAPI)                                   │   │
│  │  - Session Management                            │   │
│  │  - Message Streaming                             │   │
│  │  - Health Checks                                 │   │
│  │  :8000                                           │   │
│  └────────────┬──────────────────────┬──────────────┘   │
└───────────────┼──────────────────────┼──────────────────┘
                │                      │
      ┌─────────▼──────────┐  ┌────────▼──────────┐
      │ LLM Client + MCP   │  │ Tool Server       │
      │ - Request parsing  │  │ - Tool dispatch   │
      │ - Tool execution   │  │ - Resource mgmt   │
      │ - Response gen     │  │ :5000             │
      └────────────────────┘  └────────┬──────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────┐
        │                               │                       │
┌───────▼──────────┐  ┌────────────────▼────┐  ┌──────────────▼─┐
│  Databases       │  │  Data Query Layer   │  │  Vector Store  │
│  (MongoDB)       │  │  - MongoRAGSource   │  │  (Chroma)      │
│  - Sessions      │  │  - ClickhouseRAG    │  │  - Embeddings  │
│  - Messages      │  │  - TextSource       │  │  :8080         │
│  :27017          │  └─────────┬──────────┘  └────────────────┘
└──────────────────┘            │
                    ┌───────────┴──────────┐
                    │                      │
              ┌─────▼────────┐   ┌─────────▼─────┐
              │ ClickHouse   │   │ LLM Provider  │
              │ - Analytics  │   │ - Ollama      │
              │ - Metrics    │   │ - Gemini      │
              │ :8123        │   │ :11434        │
              └──────────────┘   └───────────────┘
```

---

## Service Components

### Infrastructure Services

#### MongoDB (Port 27017)
- **Purpose**: Session and message storage
- **Collections**:
  - `sessions` - Conversation metadata (title, created_at, updated_at)
  - `messages` - Individual messages with session_id, role, content, timestamp
- **Client**: `ChatMongoClient` in `core/clients/chat_db_client.py`
- **Deployment**: Docker container in both native and containerized modes

#### ClickHouse (Port 8123, 9000)
- **Purpose**: Analytics and metrics storage
- **Data**: Query performance metrics, usage statistics
- **RAG Source**: `ClickhouseRAGSource` in `tool_server/rag_sources/clickhouse.py`
- **Deployment**: Docker container in both modes

#### Chroma (Port 8080)
- **Purpose**: Vector database for semantic search and embeddings
- **Integration**: Used by text files RAG source for similarity search
- **Deployment**: Docker container in both modes

#### Ollama (Port 11434)
- **Purpose**: Local LLM inference (optional, used for testing)
- **Models**: qwen3-vl:2b (configurable)
- **GPU Support**: NVIDIA GPU recommended (optional)
- **Deployment**: Docker container in both modes

### Application Services

#### MCP Tool Server (Port 5000)
- **Purpose**: Model Context Protocol server exposing RAG tools and resources
- **Entry Point**: `tool_server/server.py`
- **RAG Sources**: Dynamically loaded from `proper_config.yaml`
  - **MongoRAGSource** - Query documents from MongoDB
  - **ClickhouseRAGSource** - Query analytics data
  - **TextSource** - Search text files with embeddings
- **Transport**: HTTP Streamable
- **Health Check**: `curl http://localhost:5000/mcp`

#### FastAPI Service (Port 8000)
- **Purpose**: REST API for chat interactions
- **Entry Point**: `api.py`
- **Key Components**:
  - **Session Management**: Create/load conversation sessions
  - **Message Streaming**: Server-Sent Events (SSE) for streaming responses
  - **LLM Integration**: Delegates to `LLMClientWithMCP`
- **Endpoints**:
  - `POST /chat` - Non-streaming chat
  - `POST /stream` - Streaming chat with SSE
  - `GET /health` - Health check
- **Health Check**: `curl http://localhost:8000/health`

#### Streamlit Chat UI (Port 8501)
- **Purpose**: User-facing chat interface
- **Entry Point**: `chat_app.py`
- **Features**: Session management, message history, streaming display
- **Connection**: HTTP to FastAPI on port 8000

#### Config Generator (Port 8502 Docker only)
- **Purpose**: Generate `proper_config.yaml` configuration file
- **Entry Point**: `config_generation_app/app.py`
- **Use Case**: Set up data sources and enable tools without code

---

## Data Flow

### Chat Message Processing

```
1. User sends message via Chat UI
   ↓
2. HTTP POST to FastAPI /stream endpoint
   ↓
3. API validates request, retrieves session/messages
   ↓
4. LLMClientWithMCP.run_conversation()
   ↓
5. Format message history (with memory windowing)
   ↓
6. Send to LLM with available tools (MCP tools schema)
   ↓
7. LLM decides:
   - Need more information? Call tool
   - Ready to respond? Generate final answer
   ↓
8. Tool calls forwarded to MCP Tool Server
   ↓
9. Tool Server routes to appropriate RAG source
   ↓
10. RAG source queries data (MongoDB/ClickHouse/Text)
   ↓
11. Results returned, injected into conversation
   ↓
12. Repeat until LLM generates final response
   ↓
13. Stream response back to Chat UI
   ↓
14. Store in MongoDB (session + messages)
```

---

## Configuration

Services are configured via:

1. **`.env` file** - LLM providers, model names, memory settings
2. **`proper_config.yaml`** - RAG sources, tools, schemas
3. **`docker-compose.yaml`** - Port mappings, volumes, environment variables
4. **Makefile** - Service startup orchestration

---

## Deployment Modes

### Native Mode
- Infrastructure: Docker containers
- Services: Local Python processes
- **Best for**: Development and debugging
- **Command**: `make chat`

### Containerized Mode
- Infrastructure + Services + UIs: All Docker containers
- **Best for**: Testing deployment, production-like environment
- **Command**: `make docker-chat`

---

## Service Dependencies

The following services must be healthy before starting dependents:

```
MongoDB ──┬──→ Tool Server ──→ FastAPI
          └─────────────────→ Chat UI

ClickHouse ──→ Tool Server

Chroma ──→ Tool Server (for text source)

Ollama ──→ (Optional) FastAPI
```

All services implement health checks via:
- **Native**: Process exit codes and curl checks
- **Docker**: Health check endpoints with timeouts and retries

See [Makefile](../../Makefile) and [DOCKERIZATION_GUIDE.md](../../DOCKERIZATION_GUIDE.md) for deployment details.