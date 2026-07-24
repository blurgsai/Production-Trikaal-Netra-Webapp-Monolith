from pymongo import MongoClient
import yaml

MONGO_URI = "mongodb://chat-admin:chat-pwd-123@localhost:27017/"
DATABASE_NAME = "dev"
SETTINGS_COLLECTION = "copilot_settings"
RAG_SOURCES_COLLECTION = "copilot_sources"

CONFIG = r"""selected_llm:
  provider: ollama
  model: qwen3-vl:2b
enabled_sources:
- mongo
- clickhouse
- text_files
- page_navigator
mongo:
  parameters:
    connection_string: mongodb://mongo:27017
    database_name: dev
  selected_tools:
  - name: mongo_find
    description: Find documents matching a filter in a collection
  - name: mongo_aggregate
    description: Perform data aggregation with pipeline
  - name: mongo_count
    description: Count documents matching a filter
  - name: mongo_explain
    description: Get query execution plan and statistics
  - name: mongo_list_databases
    description: List all databases on the MongoDB server
  - name: mongo_list_collections
    description: List all collections in a database
  - name: mongo_collection_schema
    description: Infer collection schema from sample documents
  schema_resource:
    name: mongo_schema
    description: Complete MongoDB schemas and collections for the dev database
    content: |
      Database: dev
      
      Collections:
        - world_monitor_articles
          Description: Articles and news content.
          Fields:
            - _id (ObjectId)
            - article_id (string)
            - author (string)
            - event_ids (array of ObjectIds)
            - image_url (string or null)
            - ingested_at (Date)
            - link (string)
            - location (array of objects containing geometry and name)
            - processing_status (string)
            - published (Date)
            - raw_content (string)
            - source (string)
            - source_type (string)
            - summary (string)
            - tags (array of strings)
            - title (string)
            - updated (Date)
        
        - world_monitor_events
          Description: Events extracted and enriched from articles.
          Fields:
            - _id (ObjectId)
            - article_id (ObjectId)
            - event_id (ObjectId)
            - event_type (string)
            - enriched_at (string)
            - extracted_data (array of objects containing detailed event info like threat_level, location, incident_type, significance, countries_involved, vessels_involved, damage, and impact_on_shipping)
            - location (array of objects containing geometry and name)
            - reasoning (string)
            - relevance_score (number or null)
            - summary (string)
            - threat_level (string)
            - user_ids (array of ObjectIds)
clickhouse:
  parameters:
    host: localhost
    port: 8123
    database: default
    username: default
    password: ''
  selected_tools:
  - name: query_analytics
    description: Execute SELECT queries on ClickHouse
  - name: store_metrics
    description: Insert data into ClickHouse tables
  schema_resource:
    name: clickhouse_schema
    description: Complete ClickHouse tables and schema
    content: "Database: default\nTables:\n  - events (event_id, user_id, event_type,\
      \ timestamp, properties)\n    Engine: MergeTree, Partitioned by (toYYYYMM(timestamp))\n\
      \  - metrics (metric_id, name, value, tags, recorded_at)\n    Engine: SummingMergeTree\n\
      \  - logs (log_id, level, message, service, timestamp)\n    Engine: MergeTree,\
      \ TTL 30 days"
text_files:
  parameters:
    collection_name: documents
    chunk_size: 1000
    chunk_overlap: 200
  selected_tools:
  - name: upload_documents
    description: Upload and process multiple text files into Chroma
  - name: search_documents
    description: Search stored documents using semantic similarity
  schema_resource:
    name: text_files_schema
    description: Text files source documentation and schema
    content: "Supported file types: .txt, .md, .pdf (text), .json (text content)\n\
      File handling:\n  - Multiple files can be uploaded simultaneously\n  - Each\
      \ file is split into chunks and embedded\n  - Chunks are stored with metadata\
      \ (filename, source)\n  - Full-text search available on all stored content"
page_navigator:
  parameters:
    llm_provider: gemini
    llm_model: gemini-2.5-flash-lite
    base_url: https://example.com
    site_context:
      global_operators:
        string:
          eq:
            token: '='
            template: '{key}={value}'
            description: Exact string match
          ne:
            token: '!='
            template: '{key}!={value}'
            description: String does not equal
          contains:
            token: '~'
            template: '{key}~{value}'
            description: Substring search
          starts:
            token: ^
            template: '{key}^{value}'
            description: Prefix match
          ends:
            token: $
            template: '{key}${value}'
            description: Suffix match
        number:
          eq:
            token: '='
            template: '{key}={value}'
            description: Equal to
          ne:
            token: '!='
            template: '{key}!={value}'
            description: Not equal to
          gt:
            token: '>'
            template: '{key}>{value}'
            description: Greater than
          lt:
            token: <
            template: '{key}<{value}'
            description: Less than
          gte:
            token: '>='
            template: '{key}>={value}'
            description: Greater than or equal
          lte:
            token: <=
            template: '{key}<={value}'
            description: Less than or equal
        datetime:
          eq:
            token: '='
            template: '{key}={iso_value}'
            description: Exact datetime match
          gte:
            token: '>='
            template: '{key}>={iso_value}'
            description: On or after datetime
          lte:
            token: <=
            template: '{key}<={iso_value}'
            description: On or before datetime
      pages: {}
  selected_tools:
  - name: generate_full_url
    description: Generates a full URL based on the user query and page configuration
  schema_resource:
    name: page_navigator_schema
    description: Complete Page Navigator schema documentation
    content: "Base URL: https://example.com\n\nPages: map, events\nAttributes:\n \
      \ - city (string), country (string)\n  - MMSI (number), event_type (string),\
      \ start_timestamp (datetime)\n\nGlobal Operators:\n  - String: eq, ne, contains,\
      \ starts, ends\n  - Number: eq, ne, gt, lt, gte, lte\n  - Datetime: eq, gte,\
      \ lte"
"""

config=yaml.safe_load(CONFIG)

client=MongoClient(MONGO_URI)
db=client[DATABASE_NAME]

db[SETTINGS_COLLECTION].replace_one(
    {"_id":"default"},
    {"_id":"default","selected_llm":config["selected_llm"]},
    upsert=True
)

for name in config.get("enabled_sources",[]):
    src=config[name]
    doc={
        "source_type":name,
        "enabled":True,
        "parameters":src.get("parameters",{}),
        "tools":src.get("selected_tools",[])
    }
    if "schema_resource" in src:
        doc["resources"]=[{"type":"schema",**src["schema_resource"]}]
    if "site_context" in src:
        doc["site_context"]=src["site_context"]
    db[RAG_SOURCES_COLLECTION].replace_one(
        {"source_type":name},
        doc,
        upsert=True
    )

print("Seed complete.")
