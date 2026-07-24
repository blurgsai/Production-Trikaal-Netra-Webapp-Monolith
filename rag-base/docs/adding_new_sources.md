# Adding a New Source to the Configuration App

This guide explains how to add a new data source to the RAG configuration generation app after the refactoring to use modular source renderers.

## Overview

The configuration app now uses a modular architecture where each data source (MongoDB, ClickHouse, Text Files, etc.) is implemented as a separate `SourceRenderer` class. This makes it easy to add new sources without modifying existing code.

## Step-by-Step Guide

### 1. Create a New Renderer Module

Create a new Python file in `config_generation_app/sources/` named after your source.

**File: `config_generation_app/sources/your_source.py`**

```python
"""Your Source renderer."""
import streamlit as st
from typing import Dict, Any, List
from core.utils.logger import Logger
from .base import SourceRenderer

logger = Logger("your-source-renderer").get_logger()


class YourSourceRenderer(SourceRenderer):
    """Streamlit UI renderer for Your Source configuration."""

    @property
    def source_type(self) -> str:
        """Unique identifier for this source."""
        return "your_source"

    @property
    def label(self) -> str:
        """Display name in the UI."""
        return "Your Source"

    @property
    def icon(self) -> str:
        """Emoji icon for visual identification."""
        return "🔌"  # Choose an appropriate emoji

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        """Connection parameters with defaults.
        
        Return format:
        {
            "param_name": {
                "type": "text|number|password",
                "default": <value>,
                "help": "Description shown to user"
            }
        }
        """
        return {
            "host": {
                "type": "text",
                "default": "localhost",
                "help": "Your Source host address",
            },
            "port": {
                "type": "number",
                "default": 5432,
                "help": "Your Source port number",
            },
            "username": {
                "type": "text",
                "default": "admin",
                "help": "Username for authentication",
            },
            "password": {
                "type": "password",
                "default": "",
                "help": "Password for authentication",
            },
        }

    @property
    def tools(self) -> List[Dict[str, str]]:
        """Available tools for this source.
        
        Return format:
        [
            {
                "name": "tool_name",
                "description": "What this tool does"
            }
        ]
        
        Note: Tool names must match those defined in tool_registry.yaml
        """
        return [
            {
                "name": "query_source",
                "description": "Execute queries against Your Source",
            },
            {
                "name": "store_data",
                "description": "Store data in Your Source",
            },
        ]

    @property
    def schema_example(self) -> str:
        """Example schema documentation for users.
        
        This appears in the "Source Context" section and helps users
        understand what their schema should contain.
        """
        return """Database: mydb
Tables:
  - users (id, name, email, created_at)
  - transactions (id, user_id, amount, status)
  - products (id, name, price, stock)
  
Connection timeout: 30 seconds
Max connections: 10"""

    def render_form(self) -> None:
        """Render the Streamlit UI for this source configuration.
        
        This method is called by config_app.py to display the configuration
        form. It should:
        1. Create an expander with source label
        2. Render parameter input fields
        3. Render tools selection
        4. Render schema textarea
        5. Handle any source-specific logic (file uploads, processing, etc.)
        6. Save configuration to st.session_state.source_configs[source_type]
        """
        with st.expander(f"{self.icon} Configure {self.label}", expanded=True):
            
            # Parameters section
            with st.expander("### Connection Parameters"):
                parameters = {}

                param_cols = st.columns(2)
                for idx, (param_name, param_config) in enumerate(
                    self.parameters.items()
                ):
                    col = param_cols[idx % 2]
                    with col:
                        if param_config["type"] == "text":
                            parameters[param_name] = st.text_input(
                                label=param_name.replace("_", " ").title(),
                                value=param_config["default"],
                                help=param_config["help"],
                                key=f"{self.source_type}_{param_name}",
                            )
                        elif param_config["type"] == "password":
                            parameters[param_name] = st.text_input(
                                label=param_name.replace("_", " ").title(),
                                value=param_config["default"],
                                type="password",
                                help=param_config["help"],
                                key=f"{self.source_type}_{param_name}",
                            )
                        elif param_config["type"] == "number":
                            parameters[param_name] = st.number_input(
                                label=param_name.replace("_", " ").title(),
                                value=int(param_config["default"]),
                                help=param_config["help"],
                                key=f"{self.source_type}_{param_name}",
                            )

            # Tools section
            with st.expander("### Tools"):
                from . import load_tool_registry

                tool_registry = load_tool_registry()
                available_tools = tool_registry.get(self.source_type, {})

                selected_tool_names = []

                # Render checkboxes for each available tool
                for tool_name, tool_info in available_tools.items():
                    is_selected = st.checkbox(
                        f"**{tool_name}**",
                        value=True,
                        help=tool_info.get("description", ""),
                        key=f"{self.source_type}_{tool_name}_checkbox",
                    )
                    if is_selected:
                        selected_tool_names.append(tool_name)

                    st.caption(tool_info.get("description", ""))

                # Build selected tools list for config
                tools_config = [
                    {
                        "name": tool_name,
                        "description": available_tools[tool_name].get("description", ""),
                    }
                    for tool_name in selected_tool_names
                ]

            # Schema section
            with st.expander("### Source Context"):
                schema_content = st.text_area(
                    label="Add information about your source schema/structure",
                    value=self.schema_example,
                    height=200,
                    key=f"{self.source_type}_schema",
                )

            # SOURCE-SPECIFIC LOGIC HERE
            # (e.g., file uploads, custom processing, etc.)
            # See TextFilesRenderer in text_files.py for an example

            # Save configuration
            config = {
                "parameters": parameters,
                "selected_tools": tools_config,
                "schema_resource": {
                    "name": f"{self.source_type}_schema",
                    "description": f"Complete {self.label} schema documentation",
                    "content": schema_content,
                },
            }

            st.session_state.source_configs[self.source_type] = config

            # Confirmation buttons
            col1, col2 = st.columns([0.5, 0.5])
            with col1:
                if st.button(
                    f"✅ Confirm {self.label}",
                    use_container_width=True,
                    key=f"confirm_{self.source_type}",
                ):
                    st.success(f"{self.label} configuration saved!")
            with col2:
                if st.button(
                    f"❌ Remove {self.label}",
                    use_container_width=True,
                    key=f"remove_btn_{self.source_type}",
                ):
                    st.session_state.selected_sources.remove(self.source_type)
                    if self.source_type in st.session_state.source_configs:
                        del st.session_state.source_configs[self.source_type]
                    st.rerun()
```

### 2. Register the Renderer in the Sources Module

Update `config_generation_app/sources/__init__.py` to register your new renderer:

```python
from .your_source import YourSourceRenderer

# Add to SOURCE_RENDERERS dict
SOURCE_RENDERERS: Dict[str, Type[SourceRenderer]] = {
    "mongo": MongoRenderer,
    "clickhouse": ClickHouseRenderer,
    "text_files": TextFilesRenderer,
    "your_source": YourSourceRenderer,  # ← Add this line
}
```

### 3. Define Tools in `tool_registry.yaml`

Add entries for your source's tools in the root `tool_registry.yaml` file:

```yaml
your_source:
  query_source:
    description: "Execute queries against Your Source"
    parameters:
      query:
        type: string
        description: "SQL or query language for Your Source"
  store_data:
    description: "Store data in Your Source"
    parameters:
      table:
        type: string
        description: "Target table name"
```

The tool names here must match the `"name"` field in your renderer's `tools` property.

### 4. (Optional) Update Configuration Schema

If your source has special configuration requirements, add it to `proper_config.yaml`:

```yaml
your_source:
  parameters:
    host: "your-server.example.com"
    port: 5432
    username: "admin"
    password: "${SECURE_PASSWORD}"
  selected_tools:
    - name: query_source
      description: "Execute queries against Your Source"
    - name: store_data
      description: "Store data in Your Source"
  schema_resource:
    name: your_source_schema
    description: "Your Source schema documentation"
    content: |
      Database: production
      Tables:
        - users (id, name, email)
        - transactions (id, user_id, amount)
```

## Example: Simple Database Source

Here's a practical example for PostgreSQL:

```python
"""PostgreSQL source renderer."""
import streamlit as st
from typing import Dict, Any, List
from core.utils.logger import Logger
from .base import SourceRenderer

logger = Logger("postgres-source-renderer").get_logger()


class PostgresRenderer(SourceRenderer):
    @property
    def source_type(self) -> str:
        return "postgres"

    @property
    def label(self) -> str:
        return "PostgreSQL"

    @property
    def icon(self) -> str:
        return "🐘"

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "host": {
                "type": "text",
                "default": "localhost",
                "help": "PostgreSQL host",
            },
            "port": {
                "type": "number",
                "default": 5432,
                "help": "PostgreSQL port",
            },
            "database": {
                "type": "text",
                "default": "postgres",
                "help": "Database name",
            },
            "username": {
                "type": "text",
                "default": "postgres",
                "help": "Database username",
            },
            "password": {
                "type": "password",
                "default": "",
                "help": "Database password",
            },
        }

    @property
    def tools(self) -> List[Dict[str, str]]:
        return [
            {
                "name": "execute_query",
                "description": "Execute SQL queries on PostgreSQL",
            },
            {
                "name": "get_schema",
                "description": "Retrieve table schemas and metadata",
            },
        ]

    @property
    def schema_example(self) -> str:
        return """Database: myapp_prod
Tables:
  - users (id SERIAL, name VARCHAR, email VARCHAR, created_at TIMESTAMP)
  - orders (id SERIAL, user_id INT, total DECIMAL, status VARCHAR)
  - products (id SERIAL, name VARCHAR, price DECIMAL, stock INT)
  
Connection: psycopg2
SSL: optional"""

    def render_form(self) -> None:
        # (Same as YourSourceRenderer example above)
        pass
```

## Architecture Notes

### Base Class: `SourceRenderer`

Located in `config_generation_app/sources/base.py`, this abstract class defines the interface all sources must implement:

- **Properties**: Define metadata (source_type, label, icon, parameters, tools, schema_example)
- **Methods**: `render_form()` - handles all Streamlit UI rendering
- **Validation**: `validate_tools_against_registry()` - cross-checks tools against tool_registry.yaml

### Registry: `SOURCE_RENDERERS`

Located in `config_generation_app/sources/__init__.py`, this dict maps source types to renderer classes. When `config_app.py` starts, it calls `get_all_renderers()` to instantiate all sources.

### Dynamic Configuration

`config_app.py` builds `AVAILABLE_SOURCES` dynamically by:
1. Importing `get_all_renderers()` from the sources module
2. Iterating through each renderer instance
3. Extracting metadata (label, icon, parameters, tools, schema)
4. Storing the renderer instance for later UI rendering

### Session State Flow

```
User adds source → render_source_selector()
                ↓
        User picks source type
                ↓
    render_source_config_form(source_type)
                ↓
    Gets renderer from AVAILABLE_SOURCES[source_type]["renderer"]
                ↓
    Calls renderer.render_form()
                ↓
    Renderer saves config to st.session_state.source_configs[source_type]
                ↓
    User downloads config.yaml (contains all saved configs)
```

## Testing Your New Source

1. **Syntax check**: Run `python -m py_compile config_generation_app/sources/your_source.py`

2. **Import test**: 
   ```bash
   python -c "from config_generation_app.sources import get_all_renderers; renderers = get_all_renderers(); print(renderers.keys())"
   ```

3. **UI test**: Run the Streamlit app and verify your source appears in the Sources Manager sidebar

## Common Patterns

### Adding Source-Specific UI Elements

For sources with special requirements (like Text Files with file uploads):

```python
def render_form(self) -> None:
    with st.expander(f"{self.icon} Configure {self.label}", expanded=True):
        
        # Custom section BEFORE standard sections
        if self.source_type == "text_files":
            uploaded_files = st.file_uploader(
                label="Select files",
                type=["txt", "md", "json"],
                accept_multiple_files=True,
                key=f"{self.source_type}_files",
            )
            if uploaded_files:
                st.session_state.uploaded_files[self.source_type] = uploaded_files
        
        # ... rest of standard form rendering
```

### Parameter Type Support

The renderer framework supports three parameter types:

| Type | Streamlit Widget | Example |
|------|------------------|---------|
| `"text"` | `st.text_input()` | Hostname, database name |
| `"number"` | `st.number_input()` | Port, timeout, max connections |
| `"password"` | `st.text_input(type="password")` | Password, API key |

Add more types by extending the parameter rendering logic in `render_form()`.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Source doesn't appear in UI | Not registered in `SOURCE_RENDERERS` | Add to `config_generation_app/sources/__init__.py` |
| Tool validation warnings | Tools not in `tool_registry.yaml` | Define tools in `tool_registry.yaml` with matching names |
| Import errors | Circular imports from config_app | Use `from . import load_tool_registry` instead of `from config_app` |
| Session state not saving | `render_form()` doesn't set `st.session_state.source_configs[source_type]` | Ensure config dict is saved before returning from `render_form()` |

## Related Files

- **Template**: [config_generation_app/sources/mongo.py](../config_generation_app/sources/mongo.py)
- **Base class**: [config_generation_app/sources/base.py](../config_generation_app/sources/base.py)
- **Registry**: [config_generation_app/sources/__init__.py](../config_generation_app/sources/__init__.py)
- **Main app**: [config_app.py](../config_app.py)
- **Tool registry**: [tool_registry.yaml](../tool_registry.yaml)
