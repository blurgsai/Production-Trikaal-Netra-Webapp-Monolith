"""
Text processing module for chunking and storing documents in Chroma vector database.
Integrates LangChain for text splitting and document processing.
"""

import os
from pathlib import Path
from typing import List, Optional
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from core.utils.logger import Logger
class TextProcessor():
    """
    Processes text files by chunking them and storing in Chroma vector database.
    
    Attributes:
        chunk_size: Size of text chunks (default: 1000)
        chunk_overlap: Overlap between chunks (default: 200)
        collection_name: Name of the Chroma collection
        chroma_host: Chroma server host
        chroma_port: Chroma server port
    """

    def __init__(
        self,
        collection_name: str = "documents",
        chroma_host: str = "localhost",
        chroma_port: int = 8080,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "nomic-embed-text"
    ):
        """
        Initialize TextProcessor.
        
        Args:
            collection_name: Name for the Chroma collection
            chroma_host: Chroma server host
            chroma_port: Chroma server port
            chunk_size: Size of text chunks in characters
            chunk_overlap: Overlap between consecutive chunks
            ollama_base_url: Base URL for Ollama server
            ollama_model: Ollama embedding model name
        """
        self.collection_name = collection_name
        self.chroma_host = os.getenv("CHROMA_HOST", chroma_host)
        self.chroma_port = int(os.getenv("CHROMA_PORT", chroma_port))
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", ollama_base_url)
        self.ollama_model = os.getenv("OLLAMA_EMBED_MODEL", ollama_model)
        self.logger = Logger(__name__).get_logger()

        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )

        # Initialize Ollama embeddings
        self.embeddings = OllamaEmbeddings(
            base_url=self.ollama_base_url,
            model=self.ollama_model
        )


        # Initialize Chroma HTTP client with reconnect logic
        self.chroma_client = None
        max_retries = 5
        for attempt in range(1, max_retries + 1):
            try:
                self.chroma_client = chromadb.HttpClient(
                    host=self.chroma_host,
                    port=self.chroma_port,
                    ssl=False,
                    headers={}
                )
                # Test connection
                self.chroma_client.heartbeat()
                self.logger.info(f"Connected to Chroma server at http://{self.chroma_host}:{self.chroma_port}")
                break
            except Exception as e:
                self.logger.error(f"Attempt {attempt}: Failed to connect to Chroma HTTP client at {self.chroma_host}:{self.chroma_port}: {e}")
                if attempt == max_retries:
                    raise
                import time
                time.sleep(2 * attempt)

        self.logger.info(
            f"TextProcessor initialized with collection '{collection_name}' "
            f"(chunk_size={chunk_size}, overlap={chunk_overlap}, "
            f"ollama_model={self.ollama_model})"
        )

    def read_text_file(self, file_path: str) -> str:
        """
        Read a text file and return its contents.
        
        Args:
            file_path: Path to the text file
            
        Returns:
            Contents of the text file
            
        Raises:
            FileNotFoundError: If file doesn't exist
            IOError: If file cannot be read
        """
        file_path = Path(file_path)

        if not file_path.exists():
            self.logger.error(f"File not found: {file_path}")
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            self.logger.debug(f"Successfully read file: {file_path} ({len(content)} chars)")
            return content
        except Exception as e:
            self.logger.error(f"Error reading file {file_path}: {str(e)}")
            raise IOError(f"Error reading file {file_path}: {str(e)}")

    def chunk_text(self, text: str, metadata: Optional[dict] = None) -> List[dict]:
        """
        Split text into chunks using RecursiveCharacterTextSplitter.
        
        Args:
            text: Text content to chunk
            metadata: Optional metadata to attach to chunks
            
        Returns:
            List of chunk dictionaries with 'content' and 'metadata' keys
        """
        if not text or not text.strip():
            self.logger.warning("Empty text provided for chunking")
            return []

        chunks = self.text_splitter.split_text(text)

        result = []
        for i, chunk in enumerate(chunks):
            chunk_metadata = {
                "chunk_index": i,
                "chunk_size": len(chunk),
                **(metadata or {})
            }
            result.append({
                "content": chunk,
                "metadata": chunk_metadata
            })

        self.logger.debug(f"Text split into {len(chunks)} chunks")
        return result

    def process_and_store(
        self,
        file_paths: List[str],
        metadata: Optional[dict] = None
    ) -> dict:
        """
        Process multiple text files and store them in Chroma.
        
        This is the main function that:
        1. Reads text files from provided paths
        2. Chunks them using LangChain's text splitter
        3. Stores chunks in Chroma vector database with embeddings
        
        Args:
            file_paths: List of paths to text files to process
            metadata: Optional metadata to attach to all documents
            
        Returns:
            Dictionary with processing results including:
                - total_files: Number of files processed
                - total_chunks: Total chunks created
                - success: List of successfully processed files
                - errors: List of errors encountered
        """
        results = {
            "total_files": len(file_paths),
            "total_chunks": 0,
            "success": [],
            "errors": []
        }

        all_documents = []
        all_metadatas = []
        all_ids = []

        chunk_counter = 0

        for file_path in file_paths:
            try:
                # Read file
                content = self.read_text_file(file_path)

                # Create metadata for this file
                file_metadata = {
                    "source": str(file_path),
                    "filename": Path(file_path).name,
                    **(metadata or {})
                }

                # Chunk the text
                chunks = self.chunk_text(content, file_metadata)

                if not chunks:
                    self.logger.warning(f"No chunks created for {file_path}")
                    results["errors"].append({
                        "file": file_path,
                        "error": "No chunks created from file"
                    })
                    continue

                # Add chunks to batch
                for chunk in chunks:
                    all_documents.append(chunk["content"])
                    all_metadatas.append(chunk["metadata"])
                    all_ids.append(f"{file_path}_{chunk_counter}")
                    chunk_counter += 1

                results["success"].append({
                    "file": str(file_path),
                    "chunks_created": len(chunks)
                })

                self.logger.info(
                    f"Successfully processed {file_path}: {len(chunks)} chunks"
                )

            except Exception as e:
                self.logger.error(f"Error processing {file_path}: {str(e)}")
                results["errors"].append({
                    "file": file_path,
                    "error": str(e)
                })

        # Store all chunks in Chroma
        if all_documents:
            try:
                vectorstore = Chroma.from_texts(
                    texts=all_documents,
                    embedding=self.embeddings,
                    metadatas=all_metadatas,
                    ids=all_ids,
                    client=self.chroma_client,
                    collection_name=self.collection_name
                )
                results["total_chunks"] = len(all_documents)
                self.logger.info(
                    f"Successfully stored {len(all_documents)} chunks in Chroma "
                    f"collection '{self.collection_name}'"
                )
            except Exception as e:
                self.logger.error(f"Error storing chunks in Chroma: {str(e)}")
                results["errors"].append({
                    "stage": "storage",
                    "error": str(e)
                })

        return results

    def get_collection_stats(self) -> dict:
        """
        Get statistics about the current Chroma collection.
        
        Returns:
            Dictionary with collection information
        """
        try:
            collection = self.chroma_client.get_collection(
                name=self.collection_name
            )
            count = collection.count()
            return {
                "collection_name": self.collection_name,
                "document_count": count,
                "status": "active"
            }
        except Exception as e:
            self.logger.error(f"Error getting collection stats: {str(e)}")
            return {
                "collection_name": self.collection_name,
                "error": str(e),
                "status": "error"
            }

    def search(self, query: str, top_k: int = 5) -> List[dict]:
        """
        Search for similar documents in the Chroma collection.
        
        Args:
            query: Search query text
            top_k: Number of top results to return
            
        Returns:
            List of matching documents with scores
        """
        try:
            vectorstore = Chroma(
                client=self.chroma_client,
                embedding_function=self.embeddings,
                collection_name=self.collection_name
            )

            results = vectorstore.similarity_search_with_score(query, k=top_k)

            formatted_results = [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": float(score)
                }
                for doc, score in results
            ]

            return formatted_results
        except Exception as e:
            self.logger.error(f"Error searching Chroma: {str(e)}")
            return []


# Convenience function for quick processing
def process_text_files(
    file_paths: List[str],
    collection_name: str = "documents",
    metadata: Optional[dict] = None
) -> dict:
    """
    Convenience function to process and store text files in one call.
    
    Args:
        file_paths: List of paths to text files
        collection_name: Name for the Chroma collection
        metadata: Optional metadata to attach to documents
        
    Returns:
        Processing results dictionary
    """
    processor = TextProcessor(collection_name=collection_name)
    return processor.process_and_store(file_paths, metadata)


def parse_and_validate_source_yaml(yaml_content: str) -> dict:
    """
    Parse YAML content and validate it against the tool registry.
    Auto-detects enabled sources and validates their configurations.
    Invalid sources are silently skipped.
    
    Args:
        yaml_content: Raw YAML string to parse
        
    Returns:
        dict with keys:
            - 'selected_llm': dict with 'provider' and 'model' keys (or None if not present)
            - 'enabled_sources': list of valid source types found
            - 'source_configs': dict mapping source_type to its config dict
            - 'errors': list of error messages (empty if all valid)
    """
    import yaml
    from config_generation_app.sources import load_tool_registry, SOURCE_RENDERERS
    
    logger = Logger("yaml-parser").get_logger()
    result = {
        'selected_llm': None,
        'enabled_sources': [],
        'source_configs': {},
        'errors': []
    }
    
    try:
        config = yaml.safe_load(yaml_content)
        if not config or not isinstance(config, dict):
            result['errors'].append("YAML file is empty or not a valid dictionary")
            return result
    except yaml.YAMLError as e:
        result['errors'].append(f"Invalid YAML syntax: {str(e)}")
        return result
    except Exception as e:
        result['errors'].append(f"Error parsing YAML: {str(e)}")
        return result
    
    # Extract LLM config if present
    if 'selected_llm' in config and isinstance(config['selected_llm'], dict):
        result['selected_llm'] = config['selected_llm']
    
    # Load tool registry for validation
    tool_registry = load_tool_registry()
    
    # Auto-detect enabled sources from config keys
    # Look for keys that match known source types
    valid_source_types = set(SOURCE_RENDERERS.keys())
    
    # Check if 'enabled_sources' key exists; if not, auto-detect from config keys
    if 'enabled_sources' in config and isinstance(config['enabled_sources'], list):
        detected_sources = config['enabled_sources']
    else:
        # Auto-detect: find keys that match source types
        detected_sources = [
            key for key in config.keys() 
            if key in valid_source_types
        ]
    
    # Validate and load each source
    for source_type in detected_sources:
        if source_type not in valid_source_types:
            logger.debug(f"Skipping unknown source type: {source_type}")
            continue
        
        source_config = config.get(source_type)
        if not isinstance(source_config, dict):
            logger.debug(f"Skipping source '{source_type}': config is not a dict")
            continue
        
        # Validate source structure
        validation_error = _validate_source_config(
            source_type, 
            source_config, 
            tool_registry
        )
        
        if validation_error:
            logger.warning(f"Validation error for source '{source_type}': {validation_error}")
            result['errors'].append(validation_error)
            # Skip invalid source
            continue
        
        # Valid source, add to results
        result['enabled_sources'].append(source_type)
        result['source_configs'][source_type] = source_config
        logger.debug(f"Loaded and validated source: {source_type}")
    
    logger.info(
        f"YAML parsing complete. Found {len(result['enabled_sources'])} valid sources. "
        f"Errors: {len(result['errors'])}"
    )
    
    return result


def _validate_source_config(source_type: str, source_config: dict, tool_registry: dict) -> str:
    """
    Validate a single source configuration against the tool registry.
    
    Args:
        source_type: Type of source (e.g., 'mongo', 'clickhouse')
        source_config: Source configuration dict
        tool_registry: Loaded tool registry
        
    Returns:
        Error message string (empty string if valid)
    """
    logger = Logger("yaml-validator").get_logger()
    
    # Check required keys
    if 'parameters' not in source_config:
        return f"Source '{source_type}' missing 'parameters' key"
    
    if not isinstance(source_config['parameters'], dict):
        return f"Source '{source_type}' parameters is not a dict"
    
    # Validate tools if present
    if 'selected_tools' in source_config:
        if not isinstance(source_config['selected_tools'], list):
            return f"Source '{source_type}' selected_tools is not a list"
        
        # Check if tools exist in registry
        available_tools = tool_registry.get(source_type, {})
        
        for tool in source_config['selected_tools']:
            if isinstance(tool, dict):
                tool_name = tool.get('name')
            else:
                tool_name = str(tool)
            
            if tool_name not in available_tools:
                # Tool not in registry, but don't block - log warning
                logger.warning(
                    f"Tool '{tool_name}' for source '{source_type}' "
                    f"not found in registry"
                )
    
    return ""
