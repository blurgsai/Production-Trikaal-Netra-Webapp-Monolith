import sys
import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

# Add project root to python path
sys.path.append(str(Path(__file__).parent.parent))

from core.clients.minio_client import MinioClient
from core.utils.ingest_to_chroma import ingest_to_chroma
import chromadb
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

def main():
    print("=== Verification Script ===")
    
    # 1. Initialize MinioClient and check/upload file
    minio_client = MinioClient()
    bucket = minio_client.bucket_name
    print(f"Target MinIO bucket: '{bucket}'")
    
    # Create bucket if it doesn't exist
    if not minio_client.check_bucket_exists():
        print(f"Bucket '{bucket}' does not exist. Creating it...")
        minio_client.create_bucket_if_not_exists()
    else:
        print(f"Bucket '{bucket}' exists.")
        
    object_name = "MV Asterion Dawn.pdf"
    
    # Check if object already exists in MinIO, if not upload it
    try:
        minio_client.client.stat_object(bucket, object_name)
        print(f"Object '{object_name}' already exists in bucket.")
    except Exception:
        print(f"Object '{object_name}' not found in bucket. Uploading from local data/...")
        local_path = Path("/Users/roshansamuel/Blurgs AI/omnisense") / "data" / object_name
        if not local_path.exists():
            print(f"Error: Local file '{local_path}' does not exist!")
            sys.exit(1)
        minio_client.client.fput_object(bucket, object_name, str(local_path))
        print(f"✓ Uploaded local '{local_path}' to MinIO as '{object_name}'")

    # 2. Run ingest_to_chroma
    print(f"\nRunning ingest_to_chroma('{object_name}')...")
    result = ingest_to_chroma(object_name, source_id="test_source_id", session_id="test_session_id")
    print("Ingestion result:", result)
    
    if not result.get("success"):
        print("Ingestion failed. Exiting.")
        sys.exit(1)
        
    # 3. Verify in Chroma
    print("\nVerifying stored data in Chroma...")
    chroma_host = os.getenv("CHROMA_HOST", "localhost")
    chroma_port = int(os.getenv("CHROMA_PORT", 8080))
    chroma_client = chromadb.HttpClient(host=chroma_host, port=chroma_port)
    
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    embeddings = OllamaEmbeddings(base_url=ollama_base_url, model=ollama_model)
    
    vectorstore = Chroma(
        client=chroma_client,
        collection_name="session_documents",
        embedding_function=embeddings
    )
    
    # Do a test search
    query = "Asterion Dawn"
    print(f"Performing test similarity search for query: '{query}'...")
    try:
        results = vectorstore.similarity_search_with_score(query, k=3)
        print(f"Found {len(results)} results:")
        for doc, score in results:
            print(f"- Score: {score}")
            print(f"  Source: {doc.metadata.get('source')}")
            print(f"  Snippet: {doc.page_content[:200]}...")
    except Exception as e:
        print(f"Error searching Chroma: {e}")

if __name__ == "__main__":
    main()

