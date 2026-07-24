# Customizable RAG Microservice

**POC-Omnisense-RAG-Base** is a reusable microservice for building conversational RAG (Retrieval-Augmented Generation) systems. It connects LLMs to multiple data sources via the Model Context Protocol (MCP), enabling applications to query data while maintaining conversation memory.

## Key Features

1. **Configurable Data Sources** - Connect MongoDB, ClickHouse, and text files without code
2. **LLM Provider Agnostic** - Support for Ollama and Google Gemini via unified interface
3. **Streaming Responses** - Server-Sent Events for real-time chat updates
4. **Session Management** - Built-in conversation history and persistence
5. **Dual Deployment Modes** - Native development or full containerization

---

## Quick Navigation

### For Developers

**Get Started:**
- [Serving the Microservice](usage/serving.md) - Start with `make chat` or `make docker-chat`
- [Configuration Guide](usage/configuration.md) - Set up data sources
- [Infrastructure Architecture](internals/infra.md) - Understand service interactions
- [Code Base Structure](internals/code_base.md) - Extend functionality

**Deployment:**
- [DOCKERIZATION_GUIDE.md](../DOCKERIZATION_GUIDE.md) - Advanced Docker customization, profiles, troubleshooting

### For Integration

- [Session Creation Protocol](icd/SESSION_CREATION_PROTOCOL.md) - Create conversation sessions
- [Message Retrieval Protocol](icd/MESSAGE_RETRIEVAL_PROTOCOL.md) - Fetch conversation history
- [Response Generation Protocol](icd/GENERATE_RESPONSE_PROTOCOL.md) - Stream chat responses
- [Interface Control Document](icd/INTERFACE_CONTROL_DOCUMENT.md) - API specification

---

## Development Considerations

The project is designed for **easy extension and parallel development**.

### Core Components

1. **ChatDB** - MongoDB for sessions, messages, and metadata
2. **API** - FastAPI for session management and streaming responses
3. **MCP Tool Server** - Model Context Protocol server for data access
4. **RAG Sources** - Pluggable data source connectors

### Two-Phase Architecture

**Phase 1: Configuration**
```bash
make config  # Generate proper_config.yaml with data sources
```

**Phase 2: Deployment**
```bash
make chat          # Start microservice (native)
make docker-chat   # Start microservice (containers)
```

---

## Quick Start

### Native Development (Fastest)

```bash
make infra              # Start databases
make start-services     # Start tool server + API (local Python)
make chat              # Run chat UI (local Python)
```

### Full Containerization

```bash
make build-all         # Build images (one time)
make docker-chat       # Start everything (containers)
```

### Staged Docker Deployment

```bash
make docker-infra      # Stage 1: Infrastructure
make docker-services   # Stage 2: MCP + API
make docker-chat       # Stage 3: Chat UI
```

---

## Project Structure

```
.
├── api.py                          # FastAPI service
├── chat_app.py                     # Streamlit chat UI
├── run_server.py                   # MCP server entry point
├── Makefile                        # Service orchestration
├── proper_config.yaml              # RAG source configuration
├── docker-compose.yaml             # Container definitions
│
├── tool_server/                    # MCP Tool Server
│   ├── Dockerfile
│   ├── requirements.txt
│   └── rag_sources/                # Data source implementations
│
├── config_generation_app/          # Configuration UI
│   ├── Dockerfile
│   └── requirements.txt
│
├── core/                           # Shared utilities
│   ├── clients/chat_db_client.py   # MongoDB operations
│   ├── schemas/                    # Pydantic models
│   └── utils/                      # Logging and helpers
│
├── tool_client/                    # MCP client library
├── source_core/                    # Text processing
└── docs/                           # Documentation
    ├── usage/                      # User guides
    ├── internals/                  # Architecture docs
    └── icd/                        # API specifications
```

---

## Environment Setup

Requirements:
- Python 3.10+
- Docker & Docker Compose
- UV (Python package manager)

Configuration (`.env` file):
```env
GOOGLE_API_KEY=your-key
GEMINI_MODEL_NAME=gemini-2.5-flash-lite
OLLAMA_MODEL_NAME=qwen3-vl:2b
```

---

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Chat UI | 8501 | http://localhost:8501 |
| API | 8000 | http://localhost:8000 |
| MCP Tool Server | 5000 | http://localhost:5000 |
| MongoDB | 27017 | localhost:27017 |
| ClickHouse | 8123 | http://localhost:8123 |
| Chroma | 8080 | http://localhost:8080 |
| Ollama | 11434 | http://localhost:11434 |

---

## Next Steps

1. **Start here**: [Serving the Microservice](usage/serving.md)
2. **Configure data**: [Configuration Guide](usage/configuration.md)
3. **Understand architecture**: [Infrastructure](internals/infra.md)
4. **Extend code**: [Code Base](internals/code_base.md)
5. **Advanced Docker**: [DOCKERIZATION_GUIDE.md](../DOCKERIZATION_GUIDE.md) 
