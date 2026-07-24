# Generating a Custom RAG Configuration

## Overview

The `proper_config.yaml` file defines which data sources the RAG system can access and which tools are enabled for each source. This guide explains how to generate and use it.

---

## Quick Start

### Native Mode (Recommended for Configuration)

```bash
# Start infrastructure first
make infra

# Run config generator in separate terminal
make config
```

Streamlit will open at `http://localhost:8500` or provide a URL in the terminal.

### Containerized Mode

```bash
# Start infrastructure
make docker-infra

# Run config generator
make docker-config
```

Access at `http://localhost:8502`

---

## Using the Config Generator

### Step 1: Select Data Sources

Choose which sources to enable:
- **MongoDB** - Document database queries
- **ClickHouse** - Analytics and metrics queries
- **Text Files** - Semantic search over documents

### Step 2: Configure Connection Parameters

For each source, provide:

#### MongoDB
```
Connection String: mongodb://user:pass@host:27017/
Database Name: my_database
```

#### ClickHouse
```
Host: localhost
Port: 9000
Username: default
Password: naji123
```

#### Text Files
```
Upload .txt or .pdf files via UI
Chunk size: 512 tokens (configurable)
Overlap: 128 tokens
```

### Step 3: Define Schemas

For MongoDB and ClickHouse, provide schema documentation:

```markdown
# MongoDB Schema
Database: my_database
Collections:
  - users
    * _id: ObjectId
    * name: string
    * email: string
```

### Step 4: Select Tools

Enable tools for each source:

**MongoDB Tools:**
- `retrieve_documents` - Query documents by filters
- `aggregate_data` - Run aggregation pipelines

**ClickHouse Tools:**
- `query_analytics` - Execute SQL queries
- `store_metrics` - Insert metrics data

**Text Files Tools:**
- `text_search` - Keyword search
- `semantic_search` - Similarity search with embeddings

### Step 5: Generate and Download

Click "Generate Configuration" to create `proper_config.yaml`.

---

## Using the Configuration

### Deploying with Configuration

**Place `proper_config.yaml` in project root** (it's already there with defaults).

When you start services, the configuration is automatically loaded:

```bash
# Native mode
make start-services  # Reads ./proper_config.yaml

# Docker mode
make docker-services  # Mounts ./proper_config.yaml
```

### Verifying Configuration

Check MCP server loaded tools correctly:

```bash
# Native: Check logs
tail -f ./logs/tool_server.log

# Docker: Check logs
make docker-logs-service SERVICE=tool-server
```

Look for lines like:
```
Loading 3 RAG sources: ['mongo', 'clickhouse', 'text_files']
Loaded 3 RAG sources successfully
```

### Testing Tools in Chat

Once configured, ask the chat UI to use the tools:

```
User: "Find all users named Alice in the database"

→ Chat uses MongoDB retrieve_documents tool
→ Returns matching documents
→ Generates response based on data
```

---

## Troubleshooting

### Configuration Not Loading

**Check file location:**
```bash
ls -la proper_config.yaml
```

**Check file syntax:**
```bash
python -m yaml proper_config.yaml
```

**Check tool server logs:**
```bash
make docker-logs-service SERVICE=tool-server
# Look for: "Failed to load mongo RAG source: ..."
```

### Tools Not Available in Chat

1. Verify configuration loaded:
   ```bash
   make docker-logs-service SERVICE=tool-server | grep "Registered"
   ```

2. Check API connected to tool server:
   ```bash
   make docker-logs-service SERVICE=api | grep "MCP server connected"
   ```

3. Restart services:
   ```bash
   make docker-stop
   make docker-services
   ```

### Database Connection Errors

**MongoDB:**
```
Error: "Connection refused"
→ Ensure MongoDB is running: docker compose ps mongo
→ Check credentials in proper_config.yaml
```

**ClickHouse:**
```
Error: "Cannot connect to ClickHouse"
→ Ensure ClickHouse is running: docker compose ps clickhouse
→ Verify host/port are correct
```

---

## Next Steps

- Start chat with configured sources: `make chat` or `make docker-chat`
- Monitor tool usage: Check logs while chatting
- Add new data sources: Modify `proper_config.yaml` and restart services