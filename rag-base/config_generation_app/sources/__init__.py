"""Source renderers registry and initialization."""
import yaml
from pathlib import Path
from typing import Dict, Type
from core.utils.logger import Logger
from .base import SourceRenderer
from .mongo import MongoRenderer
from .clickhouse import ClickHouseRenderer
from .text_files import TextFilesRenderer
from .page_navigator import PageNavigatorRenderer

logger = Logger("sources-registry").get_logger()

# Registry mapping source type to renderer class
SOURCE_RENDERERS: Dict[str, Type[SourceRenderer]] = {
    "mongo": MongoRenderer,
    "clickhouse": ClickHouseRenderer,
    "text_files": TextFilesRenderer,
    "page_navigator": PageNavigatorRenderer,
}


def load_tool_registry() -> Dict:
    """Load tool_registry.yaml from root directory."""
    registry_path = Path("./rag_configs") / "tool_registry.yaml"
    if registry_path.exists():
        with open(registry_path, "r") as f:
            return yaml.safe_load(f) or {}
    logger.warning("tool_registry.yaml not found")
    return {}


def validate_all_sources(tool_registry: Dict) -> bool:
    """Validate all registered sources against tool registry.
    
    Args:
        tool_registry: Loaded tool_registry.yaml
        
    Returns:
        True if all validation passes; False if any source has missing tools
    """
    all_valid = True
    
    for source_type, renderer_class in SOURCE_RENDERERS.items():
        renderer = renderer_class()
        if not renderer.validate_tools_against_registry(tool_registry):
            all_valid = False
            logger.warning(
                f"Validation failed for source '{source_type}': "
                f"not all tools found in registry"
            )
    
    return all_valid


def get_source_renderer(source_type: str) -> SourceRenderer:
    """Get an instance of the renderer for a given source type.
    
    Args:
        source_type: Key like 'mongo', 'clickhouse', 'text_files'
        
    Returns:
        Instantiated renderer
        
    Raises:
        ValueError: If source_type not found in registry
    """
    if source_type not in SOURCE_RENDERERS:
        raise ValueError(
            f"Unknown source type '{source_type}'. "
            f"Available: {list(SOURCE_RENDERERS.keys())}"
        )
    
    return SOURCE_RENDERERS[source_type]()


def get_all_renderers() -> Dict[str, SourceRenderer]:
    """Get instances of all registered renderers.
    
    Returns:
        Dict mapping source_type to renderer instance
    """
    return {
        source_type: renderer_class()
        for source_type, renderer_class in SOURCE_RENDERERS.items()
    }


# Initialize and validate on module import
def _init_sources():
    """Initialize sources and validate tools on import."""
    tool_registry = load_tool_registry()
    if not validate_all_sources(tool_registry):
        logger.warning(
            "Some sources have validation warnings. "
            "Check tool_registry.yaml for missing tools."
        )


_init_sources()

# Export public API
__all__ = [
    "SourceRenderer",
    "MongoRenderer",
    "ClickHouseRenderer",
    "TextFilesRenderer",
    "PageNavigatorRenderer",
    "SOURCE_RENDERERS",
    "get_source_renderer",
    "get_all_renderers",
    "load_tool_registry",
    "validate_all_sources",
]
