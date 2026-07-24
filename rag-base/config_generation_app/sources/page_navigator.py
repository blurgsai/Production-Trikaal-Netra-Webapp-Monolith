"""Page Navigator source renderer."""
import streamlit as st
from typing import Dict, Any, List
from core.utils.logger import Logger
from .base import SourceRenderer

logger = Logger("page-navigator-source-renderer").get_logger()


class PageNavigatorRenderer(SourceRenderer):
    """Streamlit UI renderer for Page Navigator source configuration with dynamic operators and pages."""

    @property
    def source_type(self) -> str:
        return "page_navigator"

    @property
    def label(self) -> str:
        return "Page Navigator"

    @property
    def icon(self) -> str:
        return "🗺️"

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "llm_provider": {
                "type": "text",
                "default": "gemini",
                "help": "LLM provider (gemini or ollama)",
            },
            "llm_model": {
                "type": "text",
                "default": "gemini-3.1-flash-lite",
                "help": "LLM model name",
            },
            "base_url": {
                "type": "text",
                "default": "https://example.com",
                "help": "Base URL for generated page links",
            },
        }

    @property
    def tools(self) -> List[Dict[str, str]]:
        return [
            {
                "name": "generate_full_url",
                "description": "Generates a full URL based on the user query and page configuration",
            },
        ]

    @property
    def schema_example(self) -> str:
        return """Base URL: https://example.com

Pages: map, events
Attributes:
  - city (string), country (string)
  - MMSI (number), event_type (string), start_timestamp (datetime)

Global Operators:
  - String: eq, ne, contains, starts, ends
  - Number: eq, ne, gt, lt, gte, lte
  - Datetime: eq, gte, lte"""

    def render_form(self) -> None:
        """Render Page Navigator configuration form with dynamic operators, pages, and attributes."""
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
            
            # Initialize session state for this source if not exists
            state_key = f"{self.source_type}_state"
            if state_key not in st.session_state:
                st.session_state[state_key] = {
                    "global_operators": self._get_default_operators(),
                    "pages": {},
                }

            state = st.session_state[state_key]
            
            # If we have a pre-loaded config, merge it into state
            if pre_loaded_config:
                # Check for site_context at top level
                site_context = pre_loaded_config.get("site_context")
                # Or check inside parameters (common in YAML configs)
                if not site_context and "parameters" in pre_loaded_config:
                    site_context = pre_loaded_config["parameters"].get("site_context")
                
                if site_context:
                    if "global_operators" in site_context:
                        state["global_operators"] = site_context["global_operators"]
                    if "pages" in site_context:
                        state["pages"] = site_context["pages"]

            # Parameters section
            with st.expander("### Connection Parameters"):
                parameters = {}
                for param_name, param_config in self.parameters.items():
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

            # Global Operators section
            with st.expander("### Global Operators", expanded=True):
                st.info("Configure operators for different data types (string, number, datetime)")
                
                col1, col2, col3 = st.columns(3)
                
                # String operators
                with col1:
                    st.subheader("String Operators")
                    string_ops = state["global_operators"].get("string", {})
                    
                    string_operators = ["eq", "ne", "contains", "starts", "ends"]
                    for op_name in string_operators:
                        col_a, col_b = st.columns(2)
                        with col_a:
                            token = st.text_input(
                                f"{op_name} token",
                                value=string_ops.get(op_name, {}).get("token", "="),
                                key=f"{self.source_type}_string_{op_name}_token",
                            )
                        with col_b:
                            desc = st.text_input(
                                f"{op_name} desc",
                                value=string_ops.get(op_name, {}).get("description", ""),
                                key=f"{self.source_type}_string_{op_name}_desc",
                            )
                        
                        if op_name not in string_ops:
                            string_ops[op_name] = {}
                        string_ops[op_name]["token"] = token
                        string_ops[op_name]["template"] = f"{{key}}{token}{{value}}"
                        string_ops[op_name]["description"] = desc

                # Number operators
                with col2:
                    st.subheader("Number Operators")
                    number_ops = state["global_operators"].get("number", {})
                    
                    number_operators = ["eq", "ne", "gt", "lt", "gte", "lte"]
                    for op_name in number_operators:
                        col_a, col_b = st.columns(2)
                        with col_a:
                            token = st.text_input(
                                f"{op_name} token",
                                value=number_ops.get(op_name, {}).get("token", "="),
                                key=f"{self.source_type}_number_{op_name}_token",
                            )
                        with col_b:
                            desc = st.text_input(
                                f"{op_name} desc",
                                value=number_ops.get(op_name, {}).get("description", ""),
                                key=f"{self.source_type}_number_{op_name}_desc",
                            )
                        
                        if op_name not in number_ops:
                            number_ops[op_name] = {}
                        number_ops[op_name]["token"] = token
                        number_ops[op_name]["template"] = f"{{key}}{token}{{value}}"
                        number_ops[op_name]["description"] = desc

                # Datetime operators
                with col3:
                    st.subheader("Datetime Operators")
                    datetime_ops = state["global_operators"].get("datetime", {})
                    
                    datetime_operators = ["eq", "gte", "lte"]
                    for op_name in datetime_operators:
                        col_a, col_b = st.columns(2)
                        with col_a:
                            token = st.text_input(
                                f"{op_name} token",
                                value=datetime_ops.get(op_name, {}).get("token", "="),
                                key=f"{self.source_type}_datetime_{op_name}_token",
                            )
                        with col_b:
                            desc = st.text_input(
                                f"{op_name} desc",
                                value=datetime_ops.get(op_name, {}).get("description", ""),
                                key=f"{self.source_type}_datetime_{op_name}_desc",
                            )
                        
                        if op_name not in datetime_ops:
                            datetime_ops[op_name] = {}
                        datetime_ops[op_name]["token"] = token
                        datetime_ops[op_name]["template"] = f"{{key}}{token}{{iso_value}}"
                        datetime_ops[op_name]["description"] = desc

            # Pages section
            with st.expander("### Pages Configuration", expanded=True):
                st.info("Add pages and configure their attributes")
                
                # Add new page
                col1, col2 = st.columns([3, 1])
                with col1:
                    new_page_name = st.text_input(
                        "New page name",
                        key=f"{self.source_type}_new_page_name",
                        placeholder="e.g., 'events', 'map'",
                    )
                with col2:
                    if st.button("➕ Add Page", key=f"{self.source_type}_add_page"):
                        if new_page_name and new_page_name not in state["pages"]:
                            state["pages"][new_page_name] = {
                                "endpoint": f"/{new_page_name}",
                                "attributes": [],
                            }
                            st.rerun()
                        elif new_page_name in state["pages"]:
                            st.warning(f"Page '{new_page_name}' already exists")

                st.divider()

                # Render existing pages
                for page_name in list(state["pages"].keys()):
                    page_config = state["pages"][page_name]
                    
                    with st.expander(f"📄 {page_name.title()}", expanded=True):
                        col1, col2 = st.columns([3, 1])
                        
                        with col1:
                            endpoint = st.text_input(
                                "Endpoint",
                                value=page_config.get("endpoint", f"/{page_name}"),
                                key=f"{self.source_type}_{page_name}_endpoint",
                            )
                            page_config["endpoint"] = endpoint
                        
                        with col2:
                            if st.button("🗑️ Delete Page", key=f"{self.source_type}_{page_name}_delete"):
                                del state["pages"][page_name]
                                st.rerun()

                        st.subheader("Attributes")

                        # Add new attribute
                        col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
                        with col1:
                            attr_name = st.text_input(
                                "Attribute name",
                                key=f"{self.source_type}_{page_name}_new_attr_name",
                                placeholder="e.g., 'MMSI'",
                            )
                        with col2:
                            attr_type = st.selectbox(
                                "Type",
                                ["string", "number", "datetime"],
                                key=f"{self.source_type}_{page_name}_new_attr_type",
                            )
                        with col3:
                            attr_path = st.text_input(
                                "Path",
                                key=f"{self.source_type}_{page_name}_new_attr_path",
                                placeholder="e.g., 'MMSI'",
                            )
                        with col4:
                            if st.button("➕", key=f"{self.source_type}_{page_name}_add_attr"):
                                if attr_name and attr_path:
                                    page_config["attributes"].append({
                                        "name": attr_name,
                                        "path": attr_path,
                                        "type": attr_type,
                                        "description": "",
                                        "examples": [],
                                    })
                                    st.rerun()

                        st.divider()

                        # Render existing attributes
                        for idx, attr in enumerate(page_config.get("attributes", [])):
                            with st.container(border=True):
                                col1, col2, col3, col4, col5 = st.columns([2, 1, 1, 2, 0.5])
                                
                                with col1:
                                    attr["name"] = st.text_input(
                                        "Name",
                                        value=attr.get("name", ""),
                                        key=f"{self.source_type}_{page_name}_attr_{idx}_name",
                                    )
                                
                                with col2:
                                    attr["type"] = st.selectbox(
                                        "Type",
                                        ["string", "number", "datetime"],
                                        index=["string", "number", "datetime"].index(attr.get("type", "string")),
                                        key=f"{self.source_type}_{page_name}_attr_{idx}_type",
                                    )
                                
                                with col3:
                                    attr["path"] = st.text_input(
                                        "Path",
                                        value=attr.get("path", ""),
                                        key=f"{self.source_type}_{page_name}_attr_{idx}_path",
                                    )
                                
                                with col4:
                                    attr["description"] = st.text_input(
                                        "Description",
                                        value=attr.get("description", ""),
                                        key=f"{self.source_type}_{page_name}_attr_{idx}_description",
                                    )
                                
                                with col5:
                                    if st.button("🗑️", key=f"{self.source_type}_{page_name}_attr_{idx}_delete"):
                                        page_config["attributes"].pop(idx)
                                        st.rerun()
                                
                                # Examples section
                                examples_text = st.text_input(
                                    "Examples (comma-separated)",
                                    value=", ".join(str(e) for e in attr.get("examples", [])),
                                    key=f"{self.source_type}_{page_name}_attr_{idx}_examples",
                                )
                                if examples_text:
                                    attr["examples"] = [e.strip() for e in examples_text.split(",")]

            # Tools section
            with st.expander("### Tools"):
                # Determine which tools should be pre-selected
                pre_selected_tools = set()
                if pre_loaded_config and "selected_tools" in pre_loaded_config:
                    pre_selected_tools = {
                        tool.get("name") if isinstance(tool, dict) else tool
                        for tool in pre_loaded_config["selected_tools"]
                    }
                
                selected_tool_names = []
                for tool_info in self.tools:
                    is_selected = st.checkbox(
                        f"**{tool_info['name']}**",
                        value=tool_info["name"] in pre_selected_tools or True,
                        key=f"{self.source_type}_{tool_info['name']}_checkbox",
                    )
                    if is_selected:
                        selected_tool_names.append(tool_info["name"])
                    st.caption(tool_info.get("description", ""))

                tools_config = [
                    {
                        "name": tool_name,
                        "description": next(
                            (t["description"] for t in self.tools if t["name"] == tool_name),
                            "",
                        ),
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
                    label="Additional schema documentation",
                    value=default_schema,
                    height=200,
                    key=f"{self.source_type}_schema",
                )

            # Save configuration
            config = {
                "parameters": {
                    **parameters,
                    "site_context": {
                        "global_operators": state["global_operators"],
                        "pages": state["pages"],
                    },
                },
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
                    if self.source_type in st.session_state.selected_sources:
                        st.session_state.selected_sources.remove(self.source_type)
                    if self.source_type in st.session_state.source_configs:
                        del st.session_state.source_configs[self.source_type]
                    if state_key in st.session_state:
                        del st.session_state[state_key]
                    st.rerun()

    @staticmethod
    def _get_default_operators() -> Dict[str, Dict[str, Any]]:
        """Get default global operators configuration."""
        return {
            "string": {
                "eq": {
                    "token": "=",
                    "template": "{key}={value}",
                    "description": "Exact string match",
                },
                "ne": {
                    "token": "!=",
                    "template": "{key}!={value}",
                    "description": "String does not equal",
                },
                "contains": {
                    "token": "~",
                    "template": "{key}~{value}",
                    "description": "Substring search",
                },
                "starts": {
                    "token": "^",
                    "template": "{key}^{value}",
                    "description": "Prefix match",
                },
                "ends": {
                    "token": "$",
                    "template": "{key}${value}",
                    "description": "Suffix match",
                },
            },
            "number": {
                "eq": {
                    "token": "=",
                    "template": "{key}={value}",
                    "description": "Equal to",
                },
                "ne": {
                    "token": "!=",
                    "template": "{key}!={value}",
                    "description": "Not equal to",
                },
                "gt": {
                    "token": ">",
                    "template": "{key}>{value}",
                    "description": "Greater than",
                },
                "lt": {
                    "token": "<",
                    "template": "{key}<{value}",
                    "description": "Less than",
                },
                "gte": {
                    "token": ">=",
                    "template": "{key}>={value}",
                    "description": "Greater than or equal",
                },
                "lte": {
                    "token": "<=",
                    "template": "{key}<={value}",
                    "description": "Less than or equal",
                },
            },
            "datetime": {
                "eq": {
                    "token": "=",
                    "template": "{key}={iso_value}",
                    "description": "Exact datetime match",
                },
                "gte": {
                    "token": ">=",
                    "template": "{key}>={iso_value}",
                    "description": "On or after datetime",
                },
                "lte": {
                    "token": "<=",
                    "template": "{key}<={iso_value}",
                    "description": "On or before datetime",
                },
            },
        }
