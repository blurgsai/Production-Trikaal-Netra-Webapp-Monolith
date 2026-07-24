import os
import chromadb
from dotenv import load_dotenv


def main():
    # Load environment variables
    load_dotenv()

    # Fetch Chroma configuration
    chroma_host = os.getenv("CHROMA_HOST", "localhost")
    chroma_port = int(os.getenv("CHROMA_PORT", 8080))

    print("=" * 80)
    print(f"Connecting to Chroma at http://{chroma_host}:{chroma_port}")
    print("=" * 80)

    # Connect to Chroma
    try:
        client = chromadb.HttpClient(
            host=chroma_host,
            port=chroma_port,
            ssl=False,
            headers={}
        )
    except Exception as e:
        print(f"Failed to connect to ChromaDB: {e}")
        return

    # List collections
    try:
        collections = client.list_collections()
    except Exception as e:
        print(f"Failed to list collections: {e}")
        return

    if not collections:
        print("No collections found.")
        return

    print(f"\nFound {len(collections)} collections.\n")

    for col_info in collections:
        # Compatibility with older/newer Chroma versions
        col_name = col_info.name if hasattr(col_info, "name") else col_info

        try:
            collection = client.get_collection(name=col_name)
        except Exception as e:
            print(f"Could not access collection '{col_name}': {e}")
            continue

        print("=" * 80)
        print(f"Collection: {collection.name}")
        print("=" * 80)

        # Count records
        try:
            count = collection.count()
            print(f"Total Records: {count}")
        except Exception as e:
            print(f"Could not get count: {e}")
            continue

        if count == 0:
            print("Collection is empty.\n")
            continue

        try:
            # Retrieve IDs and metadata for all records
            data = collection.get(include=["metadatas"])

            ids = data.get("ids", [])
            metadatas = data.get("metadatas", [])

            filenames = set()

            for idx, metadata in enumerate(metadatas):
                filename = None

                if metadata:
                    # Common metadata keys
                    filename = (
                        metadata.get("filename")
                        or metadata.get("file_name")
                        or metadata.get("source")
                        or metadata.get("path")
                        or metadata.get("filepath")
                    )

                # Fall back to ID if no filename found
                if not filename and idx < len(ids):
                    filename = ids[idx]

                if filename:
                    filenames.add(filename)

            if filenames:
                print("\nFiles in collection:")
                for i, name in enumerate(sorted(filenames), start=1):
                    print(f"{i}. {name}")
            else:
                print("\nNo filename metadata found.")

                # Print one metadata example for debugging
                if metadatas:
                    print("\nExample metadata:")
                    print(metadatas[0])

        except Exception as e:
            print(f"Error retrieving collection data: {e}")

        print()


if __name__ == "__main__":
    main()