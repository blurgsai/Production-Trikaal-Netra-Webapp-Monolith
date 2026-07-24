import os
import tempfile
from pathlib import Path
from typing import List, Optional
import chromadb
from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    CSVLoader,
    UnstructuredMarkdownLoader,
)
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    MarkdownHeaderTextSplitter,
)
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

from core.clients.minio_client import MinioClient
from core.utils.logger import Logger

load_dotenv()
logger = Logger("ingest-to-chroma").get_logger()


def load_document(file_path: str) -> List[Document]:
    """
    Reads a document and loads it using the appropriate LangChain loader based on file suffix.
    """
    suffix = Path(file_path).suffix.lower()

    loaders = {
        ".pdf": PyPDFLoader,
        ".docx": Docx2txtLoader,
        ".txt": TextLoader,
        ".csv": CSVLoader,
    }

    if suffix == ".md":
        try:
            loader = UnstructuredMarkdownLoader(file_path)
            return loader.load()
        except Exception as e:
            logger.warning(
                f"UnstructuredMarkdownLoader failed, falling back to TextLoader: {e}"
            )
            loader = TextLoader(file_path, encoding="utf-8")
            return loader.load()

    if suffix not in loaders:
        logger.warning(
            f"Suffix '{suffix}' not explicitly supported, falling back to TextLoader."
        )
        try:
            loader = TextLoader(file_path, encoding="utf-8")
            return loader.load()
        except Exception as e:
            raise ValueError(
                f"Unsupported file type '{suffix}' and TextLoader fallback failed: {e}"
            )

    loader = loaders[suffix](file_path)
    return loader.load()


def get_splitter(file_path: str):
    """
    Chooses the appropriate text splitter for a given file type.
    """
    suffix = Path(file_path).suffix.lower()

    if suffix == ".md":
        return MarkdownHeaderTextSplitter(
            headers_to_split_on=[
                ("#", "Header 1"),
                ("##", "Header 2"),
                ("###", "Header 3"),
            ]
        )

    return RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
    )


def split_document(file_path: str, docs: List[Document]) -> List[Document]:
    """
    Splits documents into smaller chunks using the appropriate splitter strategy.
    """
    suffix = Path(file_path).suffix.lower()

    if suffix == ".md":
        splitter = get_splitter(file_path)
        chunks = []
        recursive_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
        )
        for doc in docs:
            # MarkdownHeaderTextSplitter splits plaintext into markdown header-aware docs
            split_docs = splitter.split_text(doc.page_content)
            chunks.extend(recursive_splitter.split_documents(split_docs))
        return chunks

    splitter = get_splitter(file_path)
    return splitter.split_documents(docs)


def ingest_to_chroma_documents(
    file_path: str,
    document_id: str,
    document_type: str,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> dict:
    """
    Downloads a document from MinIO, processes (loads and splits) it,
    and stores the chunk embeddings into Chroma DB.
    """
    logger.info(f"Starting ingestion pipeline for MinIO object: '{file_path}'")
    minio_client = MinioClient()


    # Download from MinIO
    try:
        temp_file_path = minio_client.download_to_temp_file(file_path)
        logger.info(f"Downloaded '{file_path}' to temporary path: {temp_file_path}")
    except Exception as e:
        logger.error(f"Failed to download '{file_path}' from MinIO: {e}")
        return {"success": False, "error": f"MinIO download failed: {str(e)}"}

    try:
        # Load the document
        docs = load_document(str(temp_file_path))
        logger.info(f"Loaded document: {len(docs)} pages/elements found.")

        # Split the document
        chunks = split_document(file_path, docs)
        logger.info(f"Split document into {len(chunks)} chunks.")

        # Prepare metadata
        filename = Path(file_path).name
        

        if document_type == "session":
            chroma_collection_name = "session_documents"
            chunk_metadata = {
            "document_id": str(document_id),
            "file_name": filename,
            "session_id": str(session_id),
        }
            
        elif document_type == "global":
            chroma_collection_name = "global_documents"
            chunk_metadata = {
            "document_id": str(document_id),
            "file_name": filename,
            "user_id": str(user_id),
        }
        else:
            raise ValueError(f"Invalid document_type: {document_type}. Must be 'session' or 'global'.")

        for i, chunk in enumerate(chunks):
            # Ensure we update existing metadata (like header metadata from markdown splitter)
            chunk.metadata.update(chunk_metadata)
            chunk.metadata["chunk_index"] = i

        # Initialize embeddings model
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        ollama_model = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
        logger.info(f"Initializing Ollama embeddings ({ollama_model}) at {ollama_base_url}")
        embeddings = OllamaEmbeddings(
            base_url=ollama_base_url,
            model=ollama_model,
        )

        # Initialize Chroma HttpClient
        chroma_host = os.getenv("CHROMA_HOST", "localhost")
        chroma_port = int(os.getenv("CHROMA_PORT", 8080))
        logger.info(f"Connecting to Chroma at http://{chroma_host}:{chroma_port}")
        chroma_client = chromadb.HttpClient(
            host=chroma_host,
            port=chroma_port,
            ssl=False,
            headers={},
        )

        # Unique IDs for each chunk
        ids = [f"{filename}_chunk_{i}" for i in range(len(chunks))]

        # Store in Chroma
        logger.info(
            f"Storing {len(chunks)} chunks into Chroma collection '{chroma_collection_name}'"
        )
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            client=chroma_client,
            collection_name=chroma_collection_name,
            ids=ids,
        )

        logger.info(f"Ingestion successful for '{file_path}'")
        return {
            "success": True,
            "filename": filename,
            "chunks_count": len(chunks),
            "collection": chroma_collection_name,
        }

    except Exception as e:
        logger.error(f"Error during ingestion pipeline: {e}", exc_info=True)
        return {"success": False, "error": str(e)}

    finally:
        # Clean up temporary file
        if temp_file_path.exists():
            try:
                temp_file_path.unlink()
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.error(f"Failed to delete temp file {temp_file_path}: {e}")
