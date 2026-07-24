# POC-Omnisense-RAG-Base: AI Coding Agent Guide

## Project Overview

**POC-Omnisense-RAG-Base** is a **reusable microservice** for building conversational RAG (Retrieval-Augmented Generation) systems. It connects LLMs to multiple data sources (MongoDB, ClickHouse, text files) via the Model Context Protocol (MCP), enabling external applications to query and analyze data across heterogeneous sources while maintaining conversation memory.

**Architecture**: Designed as a stateless microservice that can be deployed and configured for any RAG use case. External applications integrate by:
1. **Configuring** the service with specific data sources
2. **Calling** the exposed API endpoints for chat interactions

The included Streamlit chat app simulates how external applications interact with this microservice.

**Key principle**: All external data access happens through MCP tools, never direct database calls from the API layer.

## Two-Phase Microservice Architecture

### Phase 1: Configuration Generation
Before deploying the RAG service, external applications must generate a configuration file defining their data sources.

**Tool**: Streamlit app at `config_generation_app/app.py` (run via `make config`)

**Output**: `proper_config.yaml` specifying:
- Enabled RAG sources (mongo, clickhouse, text_files)
- Connection parameters for each source
- Available tools per source
- Database schemas and documentation

**Who does this**: Application developers/DevOps engineers (one-time setup)

### Phase 2: RAG Service Deployment
Once configured, the microservice runs as a stateless backend accepting chat requests.

**Components**:
- **MCP Tool Server** (`:5000`) - Executes queries against configured sources
- **FastAPI Chat Service** (`:8000`) - Manages sessions, routes to LLM, maintains conversation memory
- **Supporting Infrastructure** - MongoDB (sessions), Chroma (vectors), ClickHouse (analytics)

**Who does this**: External applications calling the API endpoints

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ External Application / Streamlit UI (chat_app.py)              │
│ Makes HTTP requests to /chat, /stream endpoints                │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ FastAPI Chat Service (api.py) - :8000                           │
│  - Session management (MongoDB)                                 │
│  - LLMClientWithMCP integration                                 │
│  - Memory windowing (MEMORY_WINDOW_SIZE=8)                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP/Streamable-HTTP
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ MCP Tool Server (tool_server/server.py) - :5000                │
│  - RAG Sources from proper_config.yaml                         │
│  - (mongo, clickhouse, text_files)                              │
│  - Each source exposes tools & resources                        │
└──────────────────────────────────────────────────────────────────┘
          │              │              │
      ─────────────────────────────────────
      ▼                  ▼                ▼
  MongoDB         ClickHouse           Chroma
  (Sessions       (Analytics &      (Vector DB)
   & Messages)     Metrics)
```

## Critical Workflows

### Development Startup (`make chat`)
1. **Infrastructure**: Starts Docker (MongoDB, ClickHouse) + Chroma on :8080
2. **Tool Server**: Runs `python run_server.py` (spawns MCP server)
3. **API**: Runs `python api.py` (FastAPI on :8000)
4. **UI**: Launches Streamlit chat_app.py

All logs written to `./logs/` directory. **Wait 2-3 seconds between service starts** to avoid port conflicts.

### Configuration Generation (`make config`)
- Streamlit app at `config_generation_app/app.py`
- Generates `proper_config.yaml` defining enabled RAG sources, tools, and schemas
- Not needed for chat workflow—use existing `proper_config.yaml`

### Shutdown (`make stop`)
Cleans up all processes; **verify with `lsof -i :5000` and `lsof -i :8000`** after stopping.

## Project-Specific Patterns

### 1. **LLM Provider Abstraction** (`llm_client_with_mcp.py`)
- Unified interface for Ollama and Google Gemini via OpenAI SDK
- Provider determined by model name via `get_provider_for_model()`
- Configuration: `provider_model_mapping` dict + `.env`

```python
# Always check allowed_models before using a model
provider = get_provider_for_model(model_name)  # Returns "ollama" or "gemini"
```

### 2. **Memory Management** (Windowing)
- **Threshold**: Messages ≥ `MEMORY_THRESHOLD` (default 12) trigger summarization
- **Window**: Only last `MEMORY_WINDOW_SIZE` (default 8) messages sent to LLM
- **Summary**: One-time summary of dropped messages; updated incrementally
- Config via `.env`: `MEMORY_THRESHOLD`, `MEMORY_WINDOW_SIZE`, `MEMORY_SUMMARY_MODEL`
- Located in: `llm_client_with_mcp.py` → `_process_memory()`, `_should_summarize()`

### 3. **Session Persistence** (MongoDB)
- Sessions stored in `chat-db.sessions` (created by `ChatMongoClient`)
- Messages in `chat-db.messages` with `session_id` indexed
- Message schema: `{role: "user|assistant", content: str, session_id, timestamp}`
- Session schema: `{_id, title, created_at, updated_at}`
- BSON ObjectId serialized to string in API responses (see `JSONEncoder`)

### 4. **MCP Tool Execution Flow**
1. LLM receives tools schema + current message history
2. LLM decides which tool(s) to call with arguments
3. `LLMClientWithMCP.run_tool_execution()` → `MCPClient.call_tool()`
4. Tool result injected into conversation as assistant message
5. Loop until LLM decides no more tools needed

**Key**: Tools are discovered dynamically from MCP server at startup via `list_tools()` and `list_resources()`.

## Core Files Reference

| File | Purpose |
|------|---------|
| `api.py` | FastAPI service with `/chat`, `/stream`, `/health` endpoints |
| `chat_app.py` | Streamlit UI; session management + message display |
| `llm_client_with_mcp.py` | LLM-MCP integration; memory windowing |
| `tool_client/client.py` | MCP HTTP Streamable client |
| `tool_server/server.py` | MCP server entry point |
| `core/clients/chat_db_client.py` | MongoDB session/message CRUD |
| `proper_config.yaml` | RAG source definitions (read by tool_server) |
| `Makefile` | Development commands (infra, start-services, chat, config, stop) |

## RAG Source Configuration (proper_config.yaml)

Each source (mongo, clickhouse, text_files) defines:
- **parameters**: Connection details + source-specific settings
- **selected_tools**: List of available MCP tools for that source
- **schema_resource**: Name, description, and full schema content

Example:
```yaml
mongo:
  parameters:
    connection_string: mongodb://user:pwd@host:27017/
  selected_tools:
    - name: retrieve_documents
      description: Query MongoDB for document retrieval
  schema_resource:
    name: mongo_schema
    description: MongoDB schema documentation
    content: |
      Database: trident-satint-dev
      Collections:
        - tasks (core tasking requests)
        - sub_tasks (granular acquisition/processing)
```

## Debugging & Testing

### Health Check
```bash
curl http://localhost:8000/health
# Response: {"llm_client_connected": true, "mcp_server_connected": true}
```

### View Logs
```bash
tail -f ./logs/tool_server.log      # MCP server activity
tail -f ./logs/api.log              # FastAPI + LLM calls
```

### Test Session Creation
```python
from core.clients.chat_db_client import ChatMongoClient
db = ChatMongoClient()
session = db.insert_session("Test Chat")
db.insert_message(session["_id"], "user", "Hello")
messages = db.get_message(session["_id"], last_n=10)
```

### Run Test Suite
```bash
python tests/test_api_sessions.py     # Multi-turn conversation tests
python tests/test_mcp_client.py       # Direct MCP client testing
```

## Environment Variables

Critical for AI work on this project:

```env
# LLM Selection
GOOGLE_API_KEY=...                    # For Gemini
GEMINI_MODEL_NAME=gemini-2.5-flash-lite
OLLAMA_MODEL_NAME=qwen3-vl:2b

# Service URLs
MCP_SERVER_URL=http://localhost:5000/mcp
SERVICE_API_URL=http://localhost:8000

# Memory Management
MEMORY_THRESHOLD=12                   # Messages before summarization
MEMORY_WINDOW_SIZE=8                  # Max messages in context window
MEMORY_SUMMARY_MODEL=gemini-2.5-flash-lite

# MongoDB (Session Storage)
MONGO_HOST=localhost
MONGO_USERNAME=chat-admin
MONGO_PASSWORD=chat-pwd-123
MONGO_DB_NAME=chat-db
```

## Common Implementation Tasks

### Adding a New Data Source
1. Create RAG source class in `tool_server/rag_sources/`
2. Define tools method returning list of Tool objects (name, description, input schema)
3. Define resources method returning Resource objects (uri, name, description)
4. Register in `tool_server/server.py` → `load_rag_sources()`
5. Add config entry to `proper_config.yaml` with parameters & schema

### Modifying Tool Behavior
- Tools execute in `MCPClient.call_tool()` context
- Arguments validated against MCP tool schema
- Errors caught and returned as tool execution failures to LLM
- LLM retries or adapts based on error message

### Extending Memory Logic
- Threshold check: `_should_summarize()` in `llm_client_with_mcp.py`
- Windowing: `_process_memory()` handles message truncation
- Summarization: `_create_incremental_summary()` uses selected MEMORY_SUMMARY_MODEL
- Always preserve dropped messages before summarization

## Branch & Conventions

### Package Management & Execution (MANDATORY)
- **Python**: 3.10+, managed via **UV** (not pip)
- **Installation**: Always use `uv pip install <package>` for adding dependencies
- **Execution**: Always use local `.venv` via `uv run` or `. .venv/bin/activate`
- **Never run Python directly** — use UV wrapper to ensure isolated environment
- **Examples**:
  - Adding packages: `uv pip install langchain`
  - Running files: `uv run python api.py`
  - Activating env: `. .venv/bin/activate && python script.py`

### Code Patterns
- **Current branch**: `feature-memory` (implements memory windowing)
- **Default branch**: `main`
- **Async patterns**: Heavy use of `asyncio`; all tool calls awaited
- **Error handling**: Exceptions caught, logged via `colorlog`, returned gracefully to API

## Known Limitations & Quirks

1. **Provider switching within session**: Changing LLM provider mid-conversation requires new session (model cache tied to provider)
2. **Memory summarization one-time**: Summary created once at threshold, then frozen (no incremental updates across multiple threshold crossings)
3. **MCP connection**: HTTP Streamable transport only (no STDIO for tool_server in this setup)
4. **ClickHouse queries**: No real-time streaming; results must fit in memory

---

**Last Updated**: Feb 2026 | **Branch**: feature-memory | **Maintainer Context**: RAG + MCP + Session Management
