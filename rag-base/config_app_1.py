import streamlit as st
import yaml
import json
from pathlib import Path
from dotenv import load_dotenv
from core.utils.logger import Logger
from config_generation_app.sources import get_all_renderers
from config_generation_app.text_processor import parse_and_validate_source_yaml

# Initialize logger
logger = Logger("rag-config-generation").get_logger()

load_dotenv()


# Load tool registry from root directory (re-exported from sources module)
# This function is imported from config_generation_app.sources
# It's also used by individual source renderers
    

# Page configuration
st.set_page_config(
    page_title="RAG Config Generator",
    page_icon="⚙️",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("RAG Configuration Generator")
st.markdown("Generate and download your RAG system configuration")


# Load allowed models from JSON
def load_allowed_models():
    logger.debug("Loading allowed models from JSON")
    models_file = Path("./") / "allowed_models.json"
    if models_file.exists():
        with open(models_file, "r") as f:
            models = json.load(f)
            logger.info(f"Loaded {len(models)} model providers")
            return models
    logger.warning("allowed_models.json not found, using defaults")
    return {"ollama": ["qwen3-vl:2b"], "gemini": ["gemini-3.1-flash-lite"]}


allowed_models = load_allowed_models()

# Initialize session state
if "selected_sources" not in st.session_state:
    st.session_state.selected_sources = []
if "source_configs" not in st.session_state:
    st.session_state.source_configs = {}
if "uploaded_files" not in st.session_state:
    st.session_state.uploaded_files = {}
if "selected_provider" not in st.session_state:
    st.session_state.selected_provider = list(allowed_models.keys())[0]
if "selected_model" not in st.session_state:
    st.session_state.selected_model = allowed_models[
        st.session_state.selected_provider
    ][0]
if "config_edit_mode" not in st.session_state:
    st.session_state.config_edit_mode = False
if "loaded_yaml_content" not in st.session_state:
    st.session_state.loaded_yaml_content = None
if "validated_source_uploads" not in st.session_state:
    st.session_state.validated_source_uploads = {}


# Build AVAILABLE_SOURCES dynamically from renderer registry
def build_available_sources():
    """Build AVAILABLE_SOURCES dict from registered renderers."""
    renderers = get_all_renderers()
    sources = {}
    
    for source_type, renderer in renderers.items():
        sources[source_type] = {
            "label": renderer.label,
            "icon": renderer.icon,
            "parameters": renderer.parameters,
            "tools": renderer.tools,
            "schema_example": renderer.schema_example,
            "renderer": renderer,  # Store renderer instance for later use
        }
    
    return sources


AVAILABLE_SOURCES = build_available_sources()


def merge_yaml_config(parse_result):
    """Merge parsed YAML config into current session state.
    
    Args:
        parse_result: Dict from parse_and_validate_source_yaml()
    """
    # Update LLM if found (always use latest)
    if parse_result['selected_llm']:
        llm_config = parse_result['selected_llm']
        if 'provider' in llm_config:
            st.session_state.selected_provider = llm_config['provider']
        if 'model' in llm_config:
            st.session_state.selected_model = llm_config['model']
    
    # Merge enabled sources: add new ones, update existing ones
    loaded_sources = parse_result['enabled_sources']
    loaded_configs = parse_result['source_configs']
    
    # Start with existing sources
    current_sources = list(st.session_state.selected_sources)
    current_configs = dict(st.session_state.source_configs)
    
    # Add/update with loaded sources
    for source_type in loaded_sources:
        if source_type not in current_sources:
            current_sources.append(source_type)
            logger.info(f"Added new source: {source_type}")
        else:
            logger.info(f"Updated existing source: {source_type}")
        
        # Update/add the config
        current_configs[source_type] = loaded_configs[source_type]
    
    # Update session state
    st.session_state.selected_sources = current_sources
    st.session_state.source_configs = current_configs
    st.session_state.config_edit_mode = True
    st.session_state.validated_source_uploads = parse_result
    
    # Show feedback
    if parse_result['errors']:
        st.warning(
            f"⚠️ Loaded {len(loaded_sources)} source(s). "
            f"{len(parse_result['errors'])} error(s) skipped:\n" +
            "\n".join(f"- {err}" for err in parse_result['errors'][:3])
        )
    else:
        st.success(
            f"✅ Merged YAML: {len(loaded_sources)} source(s) loaded. "
            f"Total sources now: {len(current_sources)}"
        )
    
    logger.info(
        f"Config merged: {len(loaded_sources)} sources loaded, "
        f"total {len(current_sources)} sources in state, "
        f"{len(parse_result['errors'])} errors"
    )
    st.rerun()


def handle_yaml_upload(uploaded_file):
    """Handle YAML file upload - read and merge."""
    if uploaded_file is None:
        return
    
    try:
        yaml_content = uploaded_file.read().decode("utf-8")
        logger.debug(f"Read YAML file: {uploaded_file.name} ({len(yaml_content)} chars)")
        st.session_state.loaded_yaml_content = yaml_content
        
        # Parse and validate
        parse_result = parse_and_validate_source_yaml(yaml_content)
        
        # Merge into session state
        merge_yaml_config(parse_result)
        
    except Exception as e:
        logger.error(f"Error handling YAML upload: {str(e)}")
        st.error(f"❌ Error processing YAML: {str(e)}")


def render_yaml_upload_section():
    """Render YAML upload and text input widgets in main content area."""
    st.header("📥 Load Existing Configuration (Optional)")
    st.markdown("Load configurations from file or paste YAML directly")
    
    # File upload section
    with st.expander("📂 Load from File", expanded=True):
        col1, col2 = st.columns([3, 1])
        with col1:
            uploaded_file = st.file_uploader(
                "Choose a YAML file",
                type=["yaml", "yml"],
                key="main_yaml_uploader"
            )
        
        with col2:
            if uploaded_file is not None and st.button("📂 Load Config", use_container_width=True):
                handle_yaml_upload(uploaded_file)
    
    # Raw YAML text section
    with st.expander("📝 Paste YAML Directly"):
        yaml_text = st.text_area(
            "Paste your YAML configuration here:",
            height=250,
            key="yaml_text_input",
            placeholder="selected_llm:\n  provider: gemini\n  model: gemini-3.1-flash-lite\nenabled_sources:\n  - mongo\nmongo:\n  parameters:\n    connection_string: mongodb://mongo:27017\n  selected_tools:\n    - name: retrieve_documents\n  schema_resource:\n    name: MongoDB\n    description: MongoDB collection\n    content: Collections: users, orders"
        )
        
        if st.button("✅ Validate & Load YAML", use_container_width=True):
            if yaml_text and yaml_text.strip():
                try:
                    parse_result = parse_and_validate_source_yaml(yaml_text)
                    st.session_state.loaded_yaml_content = yaml_text
                    merge_yaml_config(parse_result)
                except Exception as e:
                    logger.error(f"Error processing YAML text: {str(e)}")
                    st.error(f"❌ Error processing YAML: {str(e)}")
            else:
                st.error("❌ Please paste YAML content")
    
    # Status section
    if st.session_state.config_edit_mode:
        st.success("✅ Configuration loaded - edit below")
        if st.button("🔄 Reset to New Config", use_container_width=True):
            st.session_state.config_edit_mode = False
            st.session_state.loaded_yaml_content = None
            st.session_state.selected_sources = []
            st.session_state.source_configs = {}
            st.session_state.validated_source_uploads = {}
            st.rerun()
    
    st.divider()


def render_source_selector():
    """Render the source selection section in sidebar"""
    with st.sidebar:
        st.header("📋 Sources Manager")

        available_to_select = [
            s
            for s in AVAILABLE_SOURCES.keys()
            if s not in st.session_state.selected_sources
        ]

        if available_to_select:
            st.subheader("Add a Source")
            new_source = st.selectbox(
                "Choose a source to configure",
                options=available_to_select,
                format_func=lambda x: f"{AVAILABLE_SOURCES[x]['icon']} {AVAILABLE_SOURCES[x]['label']}",
                key="source_selector",
            )

            if st.button("➕ Add Source", use_container_width=True):
                logger.info(f"Adding source: {new_source}")
                st.session_state.selected_sources.append(new_source)
                st.session_state.source_configs[new_source] = None
                st.rerun()
        else:
            logger.info("All available sources have been configured")
            st.success("✅ All available sources configured!")

        # Display selected sources
        if st.session_state.selected_sources:
            st.divider()
            st.subheader("Selected Sources:")
            for source in st.session_state.selected_sources:
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.write(
                        f"{AVAILABLE_SOURCES[source]['icon']} {AVAILABLE_SOURCES[source]['label']}"
                    )
                with col2:
                    if st.button("✕", key=f"remove_{source}", use_container_width=True):
                        st.session_state.selected_sources.remove(source)
                        if source in st.session_state.source_configs:
                            del st.session_state.source_configs[source]
                        st.rerun()


def render_source_config_form(source_type: str):
    """Render configuration form for a specific source using its renderer."""
    renderer = AVAILABLE_SOURCES[source_type]["renderer"]
    renderer.render_form()


def generate_config_yaml() -> str:
    """Generate the final YAML configuration"""
    logger.debug(f"Generating config for sources: {st.session_state.selected_sources}")
    config = {
        "selected_llm": {
            "provider": st.session_state.selected_provider,
            "model": st.session_state.selected_model,
        },
        "enabled_sources": st.session_state.selected_sources,
    }

    for source in st.session_state.selected_sources:
        if source in st.session_state.source_configs:
            config[source] = st.session_state.source_configs[source]

    yaml_content = yaml.dump(
        config, default_flow_style=False, sort_keys=False, allow_unicode=True
    )
    logger.info(f"Config generated successfully (size: {len(yaml_content)} chars)")
    return yaml_content


def main():
    # Render YAML upload section first (in main content)
    render_yaml_upload_section()

    # Model Configuration Section
    st.header("🤖 Model Configuration")

    # Build a mapping of model names to providers
    model_to_provider = {}
    all_models = []
    for provider, models in allowed_models.items():
        for model in models:
            model_to_provider[model] = provider
            all_models.append(model)

    # Model selector
    selected_model = st.selectbox(
        "Select Model",
        all_models,
        index=(
            all_models.index(st.session_state.selected_model)
            if st.session_state.selected_model in all_models
            else 0
        ),
        key="model_selector",
    )

    # Update provider implicitly based on selected model
    st.session_state.selected_model = selected_model
    st.session_state.selected_provider = model_to_provider[selected_model]

    # Display selected provider for context
    st.caption(f"Provider: **{st.session_state.selected_provider}**")

    st.divider()

    # Render source selector in sidebar
    render_source_selector()

    # Step 1: Configure Selected Sources
    if st.session_state.selected_sources:
        st.header("1️⃣ Configure Sources")

        # Render each source form sequentially (top to bottom)
        for source in st.session_state.selected_sources:
            render_source_config_form(source)
            st.divider()

        # Step 2: Generate and Download
        st.header("2️⃣ Generate Configuration")

        yaml_content = generate_config_yaml()

        if st.button("📄 Preview Configuration", use_container_width=True):
            logger.debug("Configuration preview requested")
            st.code(yaml_content, language="yaml")

        if st.download_button(
            label="⬇️ Download config.yaml",
            data=yaml_content,
            file_name="config.yaml",
            mime="text/plain",
            use_container_width=True,
        ):
            logger.info("Configuration downloaded successfully")
    else:
        st.info("👈 Use the Sources Manager in the sidebar to get started")


if __name__ == "__main__":
    main()
