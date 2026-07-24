"""Text Files source renderer."""
import streamlit as st
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, List
from core.utils.logger import Logger
from config_generation_app.text_processor import TextProcessor
from .base import SourceRenderer

logger = Logger("text-files-source-renderer").get_logger()


class TextFilesRenderer(SourceRenderer):
    """Streamlit UI renderer for Text Files source configuration."""

    @property
    def source_type(self) -> str:
        return "text_files"

    @property
    def label(self) -> str:
        return "Text Files"

    @property
    def icon(self) -> str:
        return "📄"

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "collection_name": {
                "type": "text",
                "default": "documents",
                "help": "Chroma collection name for storing documents",
            },
            "chunk_size": {
                "type": "number",
                "default": 1000,
                "help": "Size of text chunks in characters",
            },
            "chunk_overlap": {
                "type": "number",
                "default": 200,
                "help": "Overlap between consecutive chunks",
            },
        }

    @property
    def tools(self) -> List[Dict[str, str]]:
        return [
            {
                "name": "upload_documents",
                "description": "Upload and process multiple text files into Chroma",
            },
            {
                "name": "search_documents",
                "description": "Search stored documents using semantic similarity",
            },
        ]

    @property
    def schema_example(self) -> str:
        return """Supported file types: .txt, .md, .pdf (text), .json (text content)
File handling:
  - Multiple files can be uploaded simultaneously
  - Each file is split into chunks and embedded
  - Chunks are stored with metadata (filename, source)
  - Full-text search available on all stored content"""

    def render_form(self) -> None:
        """Render Text Files configuration form."""
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
            
            # File upload section
            uploaded_files = st.file_uploader(
                label="Select text files to upload",
                type=["txt", "md", "json"],
                accept_multiple_files=True,
                key=f"{self.source_type}_files",
            )
            if uploaded_files:
                st.session_state.uploaded_files[self.source_type] = uploaded_files

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

            # Process and store for text_files
            if st.button(
                "🚀 Process & Store in Chroma",
                use_container_width=True,
                key=f"process_{self.source_type}",
            ):
                if (
                    self.source_type in st.session_state.uploaded_files
                    and st.session_state.uploaded_files[self.source_type]
                ):
                    with st.spinner("Processing files and storing in Chroma..."):
                        try:
                            # Create temporary directory for uploaded files
                            temp_dir = tempfile.mkdtemp()
                            file_paths = []

                            try:
                                # Save uploaded files to temporary directory
                                for uploaded_file in st.session_state.uploaded_files[
                                    self.source_type
                                ]:
                                    file_path = Path(temp_dir) / uploaded_file.name
                                    with open(file_path, "wb") as f:
                                        f.write(uploaded_file.getbuffer())
                                    file_paths.append(str(file_path))

                                # Initialize processor with configured parameters
                                processor = TextProcessor(
                                    collection_name=parameters.get(
                                        "collection_name", "documents"
                                    ),
                                    chunk_size=int(parameters.get("chunk_size", 1000)),
                                    chunk_overlap=int(
                                        parameters.get("chunk_overlap", 200)
                                    ),
                                )

                                # Process and store files
                                results = processor.process_and_store(
                                    file_paths=file_paths,
                                    metadata={
                                        "source_type": "text_files",
                                        "uploaded_via": "streamlit_app",
                                    },
                                )

                                # Display results
                                st.success(
                                    "✅ Files processed and stored successfully!"
                                )
                                st.json(results)

                                # Save configuration
                                config = {
                                    "parameters": parameters,
                                    "selected_tools": tools_config,
                                    "schema_resource": {
                                        "name": f"{self.source_type}_schema",
                                        "description": "Text files source documentation and schema",
                                        "content": schema_content,
                                    },
                                }
                                st.session_state.source_configs[self.source_type] = config

                            finally:
                                # Cleanup temporary directory
                                shutil.rmtree(temp_dir, ignore_errors=True)

                        except Exception as e:
                            st.error(f"❌ Error processing files: {str(e)}")
                            logger.error(f"Text files processing error: {str(e)}")
                else:
                    st.warning("⚠️ Please upload at least one file first")

            # Options for text_files
            col1, col2 = st.columns([0.5, 0.5])
            with col1:
                if st.button(
                    "✅ Confirm Text Files",
                    use_container_width=True,
                    key=f"confirm_{self.source_type}",
                ):
                    st.success("Text Files configuration saved!")
            with col2:
                if st.button(
                    "❌ Remove Text Files",
                    use_container_width=True,
                    key=f"remove_btn_{self.source_type}",
                ):
                    st.session_state.selected_sources.remove(self.source_type)
                    if self.source_type in st.session_state.source_configs:
                        del st.session_state.source_configs[self.source_type]
                    st.rerun()
