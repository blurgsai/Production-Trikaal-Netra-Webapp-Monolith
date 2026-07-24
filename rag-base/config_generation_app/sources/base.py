"""Base class for source renderers."""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from core.utils.logger import Logger

logger = Logger("source-renderer-base").get_logger()


class SourceRenderer(ABC):
    """Abstract base class for source configuration renderers.
    
    Each source renderer encapsulates:
    - Default values for its parameters
    - Tools available for that source
    - Schema example documentation
    - Streamlit UI rendering logic
    - Optional source-level YAML upload capability
    """

    @property
    @abstractmethod
    def source_type(self) -> str:
        """Unique identifier for this source (e.g., 'mongo', 'clickhouse', 'text_files')"""
        pass

    @property
    @abstractmethod
    def label(self) -> str:
        """Display label for this source (e.g., 'MongoDB')"""
        pass

    @property
    @abstractmethod
    def icon(self) -> str:
        """Emoji icon for this source (e.g., '🍃')"""
        pass

    @property
    @abstractmethod
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        """Parameter definitions with defaults and metadata.
        
        Returns dict in format:
        {
            "param_name": {
                "type": "text|number|password",
                "default": <value>,
                "help": "Help text"
            },
            ...
        }
        """
        pass

    @property
    @abstractmethod
    def tools(self) -> List[Dict[str, str]]:
        """Available tools for this source.
        
        Returns list of dicts:
        [
            {
                "name": "tool_name",
                "description": "Tool description"
            },
            ...
        ]
        """
        pass

    @property
    @abstractmethod
    def schema_example(self) -> str:
        """Example schema documentation for this source"""
        pass

    @abstractmethod
    def render_form(self) -> None:
        """Render Streamlit UI for this source's configuration.
        
        This method should:
        1. Create an expander with the source label
        2. Render parameter input fields
        3. Render tools selection section
        4. Render schema textarea
        5. Handle source-specific logic (file uploads, processing, etc.)
        6. Save configuration to st.session_state.source_configs[source_type]
        
        The method directly updates st.session_state and renders Streamlit components.
        """
        pass

    def render_source_upload(self) -> None:
        """Render optional source-level YAML/JSON upload widget.
        
        This method can be called from within render_form() to add a file upload
        that allows users to import source configuration from YAML/JSON.
        
        Implementation:
        1. Streamlit file_uploader for .yaml, .yml, .json files
        2. Parse uploaded file using parse_source_yaml_upload()
        3. Merge loaded config into form state
        4. Display validation errors if any
        5. Automatically populate form fields with loaded values
        
        Subclasses can override this to customize the upload behavior.
        """
        import streamlit as st
        import yaml
        import json
        from config_generation_app.text_processor import _validate_source_config
        from . import load_tool_registry
        
        with st.expander("📤 Import Source Configuration (Optional)", expanded=False):
            st.markdown(
                "Upload a YAML or JSON file to pre-populate this source's configuration"
            )
            
            uploaded_file = st.file_uploader(
                "Choose a source configuration file",
                type=["yaml", "yml", "json"],
                key=f"{self.source_type}_source_uploader",
                help=f"YAML/JSON containing {self.source_type} configuration"
            )
            
            if uploaded_file is not None:
                try:
                    content = uploaded_file.read().decode("utf-8")
                    
                    # Parse file (YAML or JSON)
                    if uploaded_file.name.endswith('.json'):
                        source_config = json.loads(content)
                    else:
                        source_config = yaml.safe_load(content)
                    
                    if not isinstance(source_config, dict):
                        st.error("❌ Uploaded file must contain a dictionary/object")
                        return
                    
                    # Validate against tool registry
                    tool_registry = load_tool_registry()
                    validation_error = _validate_source_config(
                        self.source_type,
                        source_config,
                        tool_registry
                    )
                    
                    if validation_error:
                        st.error(f"❌ Validation error: {validation_error}")
                        return
                    
                    # Store in session state for this source
                    # Subclasses can use st.session_state.source_uploads[self.source_type]
                    if "source_uploads" not in st.session_state:
                        st.session_state.source_uploads = {}
                    
                    st.session_state.source_uploads[self.source_type] = source_config
                    st.success(f"✅ Configuration loaded and validated")
                    st.info(
                        "✨ Form fields have been populated. "
                        "You can edit them or proceed to download."
                    )
                    logger.debug(
                        f"Source '{self.source_type}' config loaded from upload"
                    )
                    
                except json.JSONDecodeError as e:
                    st.error(f"❌ Invalid JSON: {str(e)}")
                except yaml.YAMLError as e:
                    st.error(f"❌ Invalid YAML: {str(e)}")
                except Exception as e:
                    st.error(f"❌ Error loading configuration: {str(e)}")
                    logger.error(f"Error loading source upload: {str(e)}")

    def validate_tools_against_registry(self, tool_registry: Dict[str, Any]) -> bool:
        """Validate that this source's tools exist in the tool registry.
        
        Args:
            tool_registry: Loaded tool_registry.yaml as dict
            
        Returns:
            True if all tools are found; False if any are missing
        """
        available_tools = tool_registry.get(self.source_type, {})
        tool_names = [tool["name"] for tool in self.tools]
        
        for tool_name in tool_names:
            if tool_name not in available_tools:
                logger.warning(
                    f"Tool '{tool_name}' for source '{self.source_type}' "
                    f"not found in tool_registry"
                )
                return False
        
        return True
