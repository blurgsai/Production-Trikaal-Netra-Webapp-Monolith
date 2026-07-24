# Code Base Architecture

This document explains the structure of POC-Omnisense-RAG-Base and how to extend it with new functionality. The codebase is divided into two main parts: the **Configuration Generation System** and the **RAG Service**.

---

## Part 1: Configuration Generation System

### Overview

The configuration generation system is a **Streamlit-based UI** (`config_generation_app/app.py`) that helps developers and DevOps engineers define RAG data sources without writing code. It generates a `proper_config.yaml` file that configures the RAG service.

**Important**: This is a **testing and configuration tool**, not part of the production service.

### Structure

```
config_generation_app/
├── app.py              # Streamlit UI for configuration generation
├── requirements.txt    # Dependencies for the config app
└── README.md          # Configuration app documentation
```

### How It Works

1. **User selects data sources** (MongoDB, ClickHouse, Text Files)
2. **User provides connection parameters** (connection strings, credentials, etc.)
3. **User uploads or defines schemas** for each source
4. **User selects which tools to enable** for each source
5. **App generates `proper_config.yaml`** defining the enabled sources and their configuration

### Key Components

#### 1. Source Definitions
Located in `app.py` under `AVAILABLE_SOURCES` dictionary:
- **MongoDB**: Connection string, tools (retrieve_documents, aggregate_data)
- **ClickHouse**: Host, port, credentials, tools (query_analytics, store_metrics)
- **Text Files**: File upload, tools (text_search, semantic_search)

#### 2. Session State Management
The app uses Streamlit session state to maintain:
- `selected_sources`: List of enabled data sources
- `source_configs`: Configuration for each source
- `uploaded_files`: Files uploaded by user
- `selected_provider`: LLM provider (Ollama or Gemini)
- `selected_model`: Specific LLM model

#### 3. Configuration Output
Generates `proper_config.yaml` with structure:
```yaml
enabled_sources:
  - mongo
  - clickhouse
  - text_files

mongo:
  parameters:
    connection_string: "mongodb://..."
  selected_tools:
    - name: retrieve_documents
      description: "..."
  schema_resource:
    name: mongo_schema
    content: |
      Database: ...
      Collections: ...

# Similar for clickhouse and text_files...
```

### Extending Configuration Options

To add a new data source to the configuration system:

1. **Add source definition** in `AVAILABLE_SOURCES` dict:
   ```python
   AVAILABLE_SOURCES["my_source"] = {
       "label": "My Data Source",
       "icon": "🔌",
       "parameters": {
           "param1": {"type": "text", "default": "...", "help": "..."},
       },
       "tools": [
           {"name": "tool1", "description": "..."},
       ],
       "schema_example": "Example schema..."
   }
   ```

2. **Implement corresponding RAG source** (see Part 2)

---

## Part 2: RAG Service Architecture

The RAG service is the **production system** that processes chat requests, manages sessions, and executes data queries. It consists of several interconnected modules.

### High-Level Architecture

```
api.py (FastAPI)
    ↓
llm_client_with_mcp.py (LLM + MCP Integration)
    ↓
tool_server/server.py (MCP Server)
    ↓
tool_server/rag_sources/ (RAG Source Implementations)
    ├── mongo.py
    ├── clickhouse.py
    ├── text_source.py
    └── base_class.py (Abstract Base)
    
core/ (Data Access & Utilities)
├── clients/chat_db_client.py (MongoDB Session/Message Storage)
├── schemas/chat.py (Data Models)
└── utils/logger.py (Logging)

source_core/text_processor.py (Text Chunking & Embedding)
```

### 1. API Layer (`api.py`)

**Purpose**: Expose REST endpoints for external applications

**Key Endpoints**:
- `POST /chat` - Non-streaming chat endpoint
- `POST /stream` - Streaming chat endpoint with Server-Sent Events
- `GET /health` - Health check

**Architecture**:
- Receives chat requests with session ID
- Validates requests
- Delegates to LLMClientWithMCP
- Returns responses (streaming or non-streaming)

**Extending**: To add new endpoints, add route handlers to `api.py` and leverage existing LLMClientWithMCP integration.

---

### 2. Core Modules (`core/`)

#### 2.1 Chat Database Client (`core/clients/chat_db_client.py`)

**Base Class**: `ChatMongoClient`

**Purpose**: Manage MongoDB operations for sessions and messages

**Key Methods**:
```python
insert_message(message: Message) -> ObjectId
insert_user_message(content: str, session_id: str|ObjectId) -> ObjectId
insert_assistant_message(content: str, session_id: str|ObjectId) -> ObjectId
get_message(session_id: str|ObjectId, last_n: int = 10) -> List[Message]
insert_session(user_id: str|ObjectId, title: str) -> dict
get_session(session_id: str|ObjectId) -> dict
get_sessions_by_user(user_id: str|ObjectId) -> List[dict]
```

**Collections**:
- `sessions`: Stores conversation sessions with metadata
- `messages`: Stores individual messages per session

**How to Extend**:
- This class is concrete and typically doesn't require subclassing
- To add new query methods, add them directly to `ChatMongoClient`
- Example: Adding session search/filtering methods

```python
def search_sessions_by_title(self, title_query: str) -> List[dict]:
    """Search sessions by title pattern"""
    return list(self.sessions_collection.find(
        {"title": {"$regex": title_query, "$options": "i"}}
    ))
```

#### 2.2 Chat Schemas (`core/schemas/chat.py`)

**Base Classes**: `User`, `Session`, `Role`, `Message`

**Purpose**: Define data models using Pydantic

**Key Models**:
```python
class Role(Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"

class Message(BaseModel):
    session_id: ObjectId
    role: Role
    content: str
    created_at: datetime

class Session(BaseModel):
    _id: Optional[ObjectId] = None
    user_id: ObjectId
    title: str
    summary: Optional[str] = ""
    created_at: datetime
    updated_at: datetime
```

**How to Extend**:
- Add new fields to models as needed
- Maintain backward compatibility in MongoDB
- Example: Adding message metadata

```python
class Message(BaseModel):
    session_id: ObjectId
    role: Role
    content: str
    created_at: datetime
    metadata: Optional[dict] = None  # New field
    tool_used: Optional[str] = None   # New field
```

#### 2.3 Logger Utility (`core/utils/logger.py`)

**Base Class**: `Logger`

**Purpose**: Centralized logging with color formatting

**Usage**:
```python
from core.utils.logger import Logger

logger = Logger("my_module").get_logger()
logger.info("Information message")
logger.error("Error message")
```

---

### 3. Source Core (`source_core/`)

#### 3.1 Text Processor (`source_core/text_processor.py`)

**Base Class**: `TextProcessor`

**Purpose**: Process text documents, chunk them, and store embeddings in Chroma

**Key Methods**:
```python
process_documents(file_paths: List[str]) -> None
load_from_paths(paths: List[str]) -> Chroma
search(query: str, k: int = 5) -> List[dict]
add_documents(documents: List[str], ids: List[str] = None) -> None
```

**Configuration**:
```python
processor = TextProcessor(
    collection_name="documents",
    chroma_host="localhost",
    chroma_port=8080,
    chunk_size=1000,
    chunk_overlap=200,
    ollama_model="nomic-embed-text"
)
```

**How to Extend**:
- Override `process_documents()` for custom preprocessing
- Add new chunking strategies by modifying text splitter parameters
- Implement semantic processing before storing

Example custom processor:
```python
class CustomTextProcessor(TextProcessor):
    def process_documents(self, file_paths):
        # Custom preprocessing logic
        documents = self._preprocess(file_paths)
        # Then use parent's processing
        return super().process_documents(documents)
```

---

### 4. Tool Server & RAG Sources (`tool_server/`)

The tool server implements the **Model Context Protocol (MCP)** and exposes data source tools to the LLM.

#### 4.1 Base Class (`tool_server/rag_sources/base_class.py`)

**Abstract Base Class**: `RAGSource`

**Purpose**: Define interface for all data sources

**Key Abstract Methods**:

```python
class RAGSource(ABC):
    
    @property
    @abstractmethod
    def tool_set_description(self) -> str:
        """Return description of all tools provided by this source"""
        pass
    
    def get_tools(self, mcp: FastMCP, tools: List[ToolDefinition]) -> List[Callable]:
        """Register and return tool handlers"""
        pass
    
    def get_resources(self, mcp: FastMCP, resources: List[ResourceDefinition]) -> List[Callable]:
        """Register and return resource handlers"""
        pass
```

**Key Properties**:
```python
@property
def source_type(self) -> SourceType:
    """Returns the source type enum (mongo, clickhouse, text_files)"""
    
def get_config(self) -> dict:
    """Load source-specific config from proper_config.yaml"""
```

**Data Classes**:
```python
@dataclass
class ToolDefinition:
    name: str                    # Tool name (e.g., "mongo_find")
    handler: Callable           # Async function that implements tool
    description: Optional[str]   # Tool description for LLM
    title: Optional[str]        # Display title
    structured_output: Optional[bool]  # Whether output is structured

@dataclass
class ResourceDefinition:
    name: str         # Resource name
    uri: str          # MCP resource URI
    handler: Callable # Async function that provides resource
```

#### 4.2 MongoDB Source (`tool_server/rag_sources/mongo.py`)

**Base Class**: `MongoRAGSource(RAGSource)`

**Purpose**: Expose MongoDB query tools to LLM

**Implemented Tools**:
- `mongo_find()` - Find documents by filter
- `mongo_aggregate()` - Run aggregation pipelines
- `mongo_count()` - Count matching documents
- `mongo_explain()` - Get query execution plan
- `mongo_list_databases()` - List all databases
- `mongo_list_collections()` - List collections in database

**Key Implementation Pattern**:
```python
class MongoRAGSource(RAGSource):
    def __init__(self):
        self._source_type = SourceType.mongo
        self.config = self.get_config()
        # Initialize MongoDB client
        self.client = MongoClient(self.connection_string)
    
    @property
    def tool_set_description(self) -> str:
        return "MongoDB RAG Source Tools: find, aggregate, count, explain..."
    
    async def find_tool(self, database: str, collection: str, filter: str = "{}"):
        """Async tool that queries MongoDB"""
        db = self.client[database]
        documents = list(db[collection].find(json.loads(filter)))
        return {"documents": documents}
```

**How to Extend**:
To add new MongoDB tools:

1. **Implement tool method**:
```python
async def my_new_tool(self, database: str, collection: str, param: str):
    """Tool: Description of what my_new_tool does"""
    # Implementation
    return result
```

2. **Register in `get_tools()`** (called by server.py):
```python
tools = [
    ToolDefinition(
        name="mongo_my_new_tool",
        handler=self.my_new_tool,
        description="What this tool does"
    ),
    # ... other tools
]
return self.get_tools(mcp, tools)
```

#### 4.3 ClickHouse Source (`tool_server/rag_sources/clickhouse.py`)

**Base Class**: `ClickhouseRAGSource(RAGSource)`

**Purpose**: Expose ClickHouse analytics tools to LLM

**Implemented Tools**:
- `clickhouse_query()` - Execute SELECT queries
- `clickhouse_insert()` - Insert data
- `clickhouse_schema()` - Get table schemas

**Pattern is identical to MongoDB** - implement async tool methods and register them.

#### 4.4 Text Source (`tool_server/rag_sources/text_source.py`)

**Base Class**: `TextSource(RAGSource)`

**Purpose**: Search and retrieve text documents

**Uses**: `source_core.text_processor.TextProcessor` for semantic search

**Implemented Tools**:
- `text_search()` - Semantic search across documents
- `text_list_documents()` - List available documents

#### 4.5 MCP Server (`tool_server/server.py`)

**Purpose**: Initialize and run the MCP server that exposes all tools

**Flow**:
```python
def main():
    # 1. Load configuration
    config = load_config()  # Reads proper_config.yaml
    
    # 2. Initialize FastMCP server
    mcp = FastMCP("omnisense-rag", port=5000)
    
    # 3. Load RAG sources based on config
    rag_sources = load_rag_sources(config)
    
    # 4. Register tools and resources from each source
    for source in rag_sources:
        tools = source.get_tools(mcp)
        resources = source.get_resources(mcp)
    
    # 5. Run server
    mcp.run(transport="streamable-http")
```

**How Configuration Drives Source Loading**:
```python
def load_rag_sources(config: dict) -> list:
    enabled_sources = config.get("enabled_sources", [])  # From proper_config.yaml
    source_mapping = {
        "mongo": MongoRAGSource,
        "clickhouse": ClickhouseRAGSource,
        "text_files": TextSource,
    }
    
    rag_sources = []
    for source_type in enabled_sources:
        source = source_mapping[source_type]()  # Instantiate based on config
        rag_sources.append(source)
    
    return rag_sources
```

---

### 5. LLM Integration (`llm_client_with_mcp.py`)

**Base Class**: `LLMClientWithMCP`

**Purpose**: Integrate LLM with MCP tools and manage conversation memory

**Key Methods**:
```python
async def send_message(
    prompt: str,
    session_id: str,
    model: str = None
) -> str:
    """Send message and get LLM response with tool execution"""

async def stream_message(
    prompt: str,
    session_id: str,
    model: str = None
) -> AsyncGenerator[str, None]:
    """Stream LLM response tokens"""

def run_tool_execution(tool_calls: List[dict]) -> dict:
    """Execute MCP tools called by LLM"""
```

**Memory Management**:
- Maintains conversation history in MongoDB
- Applies windowing: keeps last `MEMORY_WINDOW_SIZE` messages (default: 8)
- Triggers summarization at `MEMORY_THRESHOLD` (default: 12 messages)
- Stores summary of dropped messages for context

**How to Extend**:
- Modify `_process_memory()` for custom windowing logic
- Override `_create_incremental_summary()` for custom summarization
- Add new LLM providers via `get_provider_for_model()`

---

## Extension Workflow

### Adding a New Data Source

1. **Implement Configuration** (if not already in config app):
   - Add source definition to `AVAILABLE_SOURCES` in `config_generation_app/app.py`

2. **Implement RAG Source**:
   ```python
   # tool_server/rag_sources/my_source.py
   from tool_server.rag_sources.base_class import RAGSource, ToolDefinition
   
   class MyRAGSource(RAGSource):
       def __init__(self):
           self._source_type = SourceType.my_source  # Add enum
           self.config = self.get_config()
       
       @property
       def tool_set_description(self) -> str:
           return "Tools for my data source"
       
       async def my_tool(self, param: str):
           """Implement tool logic"""
           return result
   ```

3. **Register Source** in `tool_server/server.py`:
   ```python
   source_mapping = {
       "mongo": MongoRAGSource,
       "my_source": MyRAGSource,  # Add here
   }
   ```

4. **Update Configuration** in `proper_config.yaml`:
   ```yaml
   enabled_sources:
     - my_source
   
   my_source:
     parameters:
       param1: value1
     selected_tools:
       - name: my_tool
   ```

### Adding a New Tool to Existing Source

1. **Implement tool method** in source class (e.g., `MongoRAGSource`):
   ```python
   async def new_mongodb_tool(self, param: str):
       """Tool: Do something with param"""
       # Implementation
       return result
   ```

2. **Register tool** in `get_tools()` method

3. **Update tool registry** in `tool_registry.yaml` for discoverability

### Adding Custom Message Processing

1. **Extend `ChatMongoClient`** with new methods:
   ```python
   def custom_message_query(self, criteria: dict):
       return list(self.messages_collection.find(criteria))
   ```

2. **Use in `api.py`** or `llm_client_with_mcp.py`

---

## Key Design Patterns

### 1. Configuration-Driven Architecture
- Sources are dynamically loaded based on `proper_config.yaml`
- No code changes needed to enable/disable sources
- Configuration generated by Streamlit app

### 2. Abstract Base Classes
- `RAGSource` defines interface for all data sources
- Subclasses implement specific data store logic
- MCP integration handled by base class

### 3. Async Tool Execution
- All tool methods are async for non-blocking execution
- Tools integrate with MCP protocol
- LLM can call multiple tools in parallel

### 4. Session-Based Conversations
- All messages linked to sessions via `session_id`
- Memory windowing per session
- Session metadata persisted in MongoDB

---

## Summary

| Component | Purpose | Extension Point |
|-----------|---------|-----------------|
| `config_generation_app/app.py` | UI for config generation | Add new source types |
| `api.py` | REST endpoints | Add new endpoints/routes |
| `llm_client_with_mcp.py` | LLM + MCP integration | Custom memory management |
| `tool_server/server.py` | MCP server initialization | Register new sources |
| `tool_server/rag_sources/base_class.py` | RAG source interface | Implement new sources |
| `tool_server/rag_sources/*.py` | Data source implementations | Add tools per source |
| `core/clients/chat_db_client.py` | MongoDB access | Add query methods |
| `core/schemas/chat.py` | Data models | Extend models |
| `source_core/text_processor.py` | Text processing | Custom preprocessing | 
