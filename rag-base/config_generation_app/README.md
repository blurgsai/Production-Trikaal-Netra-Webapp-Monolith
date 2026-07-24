# RAG Configuration Generator

A Streamlit-based UI application for generating RAG system configurations.

## Features

- **Source Selection**: Select from available database sources (MongoDB, ClickHouse) without duplication
- **Dynamic Forms**: Configure connection parameters for each selected source
- **Schema Management**: Define your database schemas and collections/tables
- **Tool Configuration**: Automatic tool configuration based on source type
- **YAML Generation**: Generate and download properly formatted configuration files

## Installation

```bash
pip install -r requirements.txt
```

## Usage

Run the Streamlit application:

```bash
streamlit run app.py
```

The app will open in your default browser at `http://localhost:8501`

## Workflow

1. **Select Sources**: Choose which database sources to configure (MongoDB, ClickHouse, etc.)
2. **Configure Each Source**:
   - Set connection parameters (host, port, database, credentials)
   - Review available tools
   - Define your database schema
3. **Generate Configuration**:
   - Preview the generated YAML
   - Download the `config.yaml` file to your desired location

## Configuration Structure

The generated YAML follows this structure:

```yaml
enabled_sources:
  - mongo
  - clickhouse

mongo:
  parameters:
    host: localhost
    port: 27017
    database: primary
    username: admin
    password: secret
  selected_tools:
    - name: retrieve_documents
      description: Query MongoDB for document retrieval
    - name: aggregate_data
      description: Run aggregation pipelines on MongoDB
  schema_resource:
    name: mongodb_schema
    description: Complete MongoDB schemas and collections
    content: |
      Database: primary
      Collections:
        - users (id, name, email, created_at)
        - orders (id, user_id, total, items, status)

clickhouse:
  parameters:
    host: localhost
    port: 9000
    database: default
    username: default
    password: ""
  selected_tools:
    - name: query_analytics
      description: Execute SELECT queries on ClickHouse
    - name: store_metrics
      description: Insert data into ClickHouse tables
  schema_resource:
    name: clickhouse_schema
    description: Complete ClickHouse tables and schema
    content: |
      Database: default
      Tables:
        - events (event_id, user_id, event_type, timestamp, properties)
```
