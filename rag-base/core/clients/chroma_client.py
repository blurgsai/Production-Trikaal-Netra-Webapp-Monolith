import os
import chromadb
from typing import List, Optional
from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

from core.utils.logger import Logger

load_dotenv()

class ChromaClient:
    """Client for interacting with ChromaDB"""

    def __init__(self):
        self.logger = Logger("chroma-client").get_logger()

        # Initialize embeddings model
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
        
        self.logger.debug(f"Initializing Ollama embeddings ({self.ollama_model}) at {self.ollama_base_url}")
        self.embeddings = OllamaEmbeddings(
            base_url=self.ollama_base_url,
            model=self.ollama_model,
        )
        
        # Initialize Chroma HttpClient
        self.chroma_host = os.getenv("CHROMA_HOST", "localhost")
        self.chroma_port = int(os.getenv("CHROMA_PORT", 8080))
        self.score_threshold = float(os.getenv("CHROMA_SCORE_THRESHOLD", "0.1"))
        
        self.logger.debug(f"Connecting to Chroma at http://{self.chroma_host}:{self.chroma_port}")
        self.client = chromadb.HttpClient(
            host=self.chroma_host,
            port=self.chroma_port,
            ssl=False,
            headers={},
        )
        
    def get_collection(self, collection_name: str) -> Chroma:
        """Get a Langchain Chroma vectorstore for a specific collection"""
        return Chroma(
            client=self.client,
            collection_name=collection_name,
            embedding_function=self.embeddings,
        )
        
    def add_documents(
        self, 
        collection_name: str, 
        documents: List[Document], 
        ids: Optional[List[str]] = None
    ) -> Chroma:
        """Add documents to a Chroma collection"""
        self.logger.info(f"Storing {len(documents)} chunks into Chroma collection '{collection_name}'")
        
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            client=self.client,
            collection_name=collection_name,
            ids=ids,
        )
        
        return vectorstore
        
    def search_documents(
        self,
        collection_name: str,
        query: str,
        k: int = 4,
        filter_metadata: Optional[dict] = None,
        score_threshold: Optional[float] = None
    ) -> List[Document]:
        """
        Takes a user query, automatically embeds it, and queries the top k chunks
        using the specified metadata filter.
        """
        # Get the initialized Langchain Chroma collection wrapper
        vectorstore = self.get_collection(collection_name)
        threshold = self.score_threshold if score_threshold is None else score_threshold
        
        # Keep returning Document objects while letting Chroma/LangChain filter by relevance.
        results_with_scores = vectorstore.similarity_search_with_relevance_scores(
            query=query,
            k=k,
            filter=filter_metadata,
            score_threshold=threshold,
        )
        
        return [document for document, _score in results_with_scores]
