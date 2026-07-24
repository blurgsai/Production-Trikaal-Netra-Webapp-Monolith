"""MongoDB source renderer."""
import streamlit as st
from typing import Dict, Any, List
from core.utils.logger import Logger
from .base import SourceRenderer

logger = Logger("mongo-source-renderer").get_logger()


class MongoRenderer(SourceRenderer):
    """Streamlit UI renderer for MongoDB source configuration."""

    @property
    def source_type(self) -> str:
        return "mongo"

    @property
    def label(self) -> str:
        return "MongoDB"

    @property
    def icon(self) -> str:
        return "🍃"

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "connection_string": {
                "type": "text",
                "default": "mongodb://mongo:27017",
                "help": "MongoDB connection string",
            },
        }

    @property
    def tools(self) -> List[Dict[str, str]]:
        return [
            {
                "name": "mongo_find",
                "description": "Find documents matching a filter in a collection",
            },
            {
                "name": "mongo_aggregate",
                "description": "Perform data aggregation with pipeline",
            },
            {
                "name": "mongo_count",
                "description": "Count documents matching a filter",
            },
            {
                "name": "mongo_explain",
                "description": "Get query execution plan and statistics",
            },
            {
                "name": "mongo_list_databases",
                "description": "List all databases on the MongoDB server",
            },
            {
                "name": "mongo_list_collections",
                "description": "List all collections in a database",
            },
            {
                "name": "mongo_collection_schema",
                "description": "Infer collection schema from sample documents",
            },
        ]

    @property
    def schema_example(self) -> str:
        return """Database: primary
Collections:
  - users (id, name, email, created_at)
  - orders (id, user_id, total, items, status)
  - products (id, name, price, category, stock)"""

    def render_form(self) -> None:
        """Render MongoDB configuration form."""
        with st.expander(
            f"{self.icon} Configure {self.label}", expanded=True
        ):
            # Source upload section
            self.render_source_upload()
            
            # Check if we have a pre-loaded config from main YAML upload
            pre_loaded_config = None
            if "source_uploads" in st.session_state:
                pre_loaded_config = st.session_state.source_uploads.get(self.source_type)
            
            # Or from YAML upload via source_configs
            if not pre_loaded_config and "source_configs" in st.session_state:
                pre_loaded_config = st.session_state.source_configs.get(self.source_type)
            
            # Parameters section
            with st.expander("### Connection Parameters"):
                parameters = {}

                param_cols = st.columns(1)
                for idx, (param_name, param_config) in enumerate(
                    self.parameters.items()
                ):
                    col = param_cols[idx % 1]
                    with col:
                        # Use pre-loaded value if available
                        default_value = param_config["default"]
                        if pre_loaded_config and "parameters" in pre_loaded_config:
                            default_value = pre_loaded_config["parameters"].get(
                                param_name, default_value
                            )
                        
                        if param_config["type"] == "text":
                            parameters[param_name] = st.text_input(
                                label=param_name.replace("_", " ").title(),
                                value=default_value,
                                help=param_config["help"],
                                key=f"{self.source_type}_{param_name}",
                            )
                        elif param_config["type"] == "password":
                            parameters[param_name] = st.text_input(
                                label=param_name.replace("_", " ").title(),
                                value=default_value,
                                type="password",
                                help=param_config["help"],
                                key=f"{self.source_type}_{param_name}",
                            )
                        elif param_config["type"] == "number":
                            parameters[param_name] = st.number_input(
                                label=param_name.replace("_", " ").title(),
                                value=int(default_value),
                                help=param_config["help"],
                                key=f"{self.source_type}_{param_name}",
                            )

            # Tools section
            with st.expander("### Tools"):
                from . import load_tool_registry
                
                tool_registry = load_tool_registry()
                available_tools = tool_registry.get(self.source_type, {})

                selected_tool_names = []
                
                # Determine which tools should be pre-selected
                pre_selected_tools = set()
                if pre_loaded_config and "selected_tools" in pre_loaded_config:
                    pre_selected_tools = {
                        tool.get("name") if isinstance(tool, dict) else tool
                        for tool in pre_loaded_config["selected_tools"]
                    }

                # Render checkboxes for each available tool
                for tool_name, tool_info in available_tools.items():
                    is_selected = st.checkbox(
                        f"**{tool_name}**",
                        value=tool_name in pre_selected_tools or True,
                        help=tool_info.get("description", ""),
                        key=f"{self.source_type}_{tool_name}_checkbox",
                    )
                    if is_selected:
                        selected_tool_names.append(tool_name)

                    # Show description
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
                default_schema = self.schema_example
                if pre_loaded_config and "schema_resource" in pre_loaded_config:
                    default_schema = pre_loaded_config["schema_resource"].get(
                        "content", self.schema_example
                    )
                
                schema_content = st.text_area(
                    label="Add information about your source schema/structure",
                    value=default_schema,
                    height=200,
                    key=f"{self.source_type}_schema",
                )

            # Save configuration
            config = {
                "parameters": parameters,
                "selected_tools": tools_config,
                "schema_resource": {
                    "name": f"{self.source_type}_schema",
                    "description": f"Complete {self.label} schemas and collections",
                    "content": schema_content,
                },
            }

            st.session_state.source_configs[self.source_type] = config

            # Options
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
