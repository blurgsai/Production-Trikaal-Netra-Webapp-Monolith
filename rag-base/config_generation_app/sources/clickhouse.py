"""ClickHouse source renderer."""
import streamlit as st
from typing import Dict, Any, List
from core.utils.logger import Logger
from .base import SourceRenderer

logger = Logger("clickhouse-source-renderer").get_logger()


class ClickHouseRenderer(SourceRenderer):
    """Streamlit UI renderer for ClickHouse source configuration."""

    @property
    def source_type(self) -> str:
        return "clickhouse"

    @property
    def label(self) -> str:
        return "ClickHouse"

    @property
    def icon(self) -> str:
        return "🏠"

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "host": {
                "type": "text",
                "default": "localhost",
                "help": "ClickHouse host address",
            },
            "port": {"type": "number", "default": 8123, "help": "ClickHouse port"},
            "database": {
                "type": "text",
                "default": "default",
                "help": "Default database name",
            },
            "username": {
                "type": "text",
                "default": "default",
                "help": "ClickHouse username",
            },
            "password": {
                "type": "password",
                "default": "",
                "help": "ClickHouse password",
            },
        }

    @property
    def tools(self) -> List[Dict[str, str]]:
        return [
            {
                "name": "query_analytics",
                "description": "Execute SELECT queries on ClickHouse",
            },
            {
                "name": "store_metrics",
                "description": "Insert data into ClickHouse tables",
            },
        ]

    @property
    def schema_example(self) -> str:
        return """Database: default
Tables:
  - events (event_id, user_id, event_type, timestamp, properties)
    Engine: MergeTree, Partitioned by (toYYYYMM(timestamp))
  - metrics (metric_id, name, value, tags, recorded_at)
    Engine: SummingMergeTree
  - logs (log_id, level, message, service, timestamp)
    Engine: MergeTree, TTL 30 days"""

    def render_form(self) -> None:
        """Render ClickHouse configuration form."""
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

                param_cols = st.columns(2)
                for idx, (param_name, param_config) in enumerate(
                    self.parameters.items()
                ):
                    col = param_cols[idx % 2]
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
                    "description": f"Complete {self.label} tables and schema",
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
