# Serving the Microservice

## Overview

The microservice supports two deployment modes:

1. **Native Development** - Local Python with Docker infrastructure
2. **Containerized** - Full Docker-based deployment

Both modes use the same `Makefile` for consistent workflows.

---

## Native Development Workflow (Recommended for Development)

Run services locally while databases run in Docker.

### Quick Start

```bash
# Start infrastructure (MongoDB, ClickHouse, Chroma, Ollama)
make infra

# Start tool server and API (local Python in background)
make start-services

# Run chat UI (local Python, foreground)
make chat
```

### Individual Components

```bash
# Start only infrastructure
make infra

# Start tool server + API
make start-services

# Run chat application
make chat

# Run config generator (separate terminal)
make config
```

### Stopping

```bash
make stop
```

### Service Ports (Native)

| Service | Port | URL |
|---------|------|-----|
| Chat UI | 8501 | http://localhost:8501 |
| API | 8000 | http://localhost:8000 |
| Tool Server | 5000 | http://localhost:5000 |
| MongoDB | 27017 | localhost:27017 |
| ClickHouse | 8123 | http://localhost:8123 |
| Chroma | 8080 | http://localhost:8080 |
| Ollama | 11434 | http://localhost:11434 |

---

## Containerized Workflow (Docker-based)

Run everything in containers. Recommended for testing exact deployment behavior.

### Quick Start

```bash
# Build all images (one time)
make build-all

# Start everything (full stack)
make docker-chat
```

### Staged Deployment

```bash
# Stage 1: Start infrastructure only
make docker-infra

# Stage 2: Add MCP server + FastAPI (separate terminal)
make docker-services

# Stage 3: Add chat UI (separate terminal)
make docker-chat
```

### Monitoring & Debugging

```bash
# View all service logs
make docker-logs

# View specific service logs
make docker-logs-service SERVICE=api

# Check service health
make docker-health
```

### Cleanup

```bash
# Stop containers
make docker-stop

# Stop and remove containers, volumes, images
make docker-clean
```

---

## Environment Configuration

Both workflows use `.env` file for configuration:

```bash
# Required
GOOGLE_API_KEY=your-api-key

# Optional (defaults shown)
GEMINI_MODEL_NAME=gemini-2.5-flash-lite
OLLAMA_MODEL_NAME=qwen3-vl:2b
MEMORY_THRESHOLD=12
MEMORY_WINDOW_SIZE=8
```

---

## Troubleshooting

### Port Conflicts

```bash
# Check which process is using port 8000
lsof -i :8000

# Kill specific process
kill -9 <PID>
```

### Service Won't Start

```bash
# View logs
make docker-logs-service SERVICE=api

# Health check
curl http://localhost:8000/health
```

### Clean State

```bash
# Full reset
make docker-clean
make build-all
make docker-chat
```

---

## Tips

- **Development**: Use `make chat` (native) for fastest iteration
- **Testing**: Use `make docker-chat` to test exact deployment
- **Debugging**: Use `make docker-logs` to track service behavior

For advanced Docker customization, see [DOCKERIZATION_GUIDE.md](../../DOCKERIZATION_GUIDE.md).