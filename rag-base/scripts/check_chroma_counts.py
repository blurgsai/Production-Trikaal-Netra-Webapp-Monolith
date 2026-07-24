#!/usr/bin/env python3
"""
Script to inspect ChromaDB collections and print the record count for each.
Supports connecting via HTTP server (default: localhost:8080) or local persistent directory.
"""

import os
import sys
import argparse
import chromadb
from dotenv import load_dotenv

def get_collections_report(client, source_label):
    print(f"\n{'='*60}")
    print(f"Checking ChromaDB Source: {source_label}")
    print(f"{'='*60}")
    
    try:
        collections = client.list_collections()
    except Exception as e:
        print(f"[Error] Could not list collections: {e}")
        return

    if not collections:
        print("No collections found.")
        return

    print(f"Found {len(collections)} collection(s):\n")
    print(f"{'Collection Name':<35} | {'Record Count':<15}")
    print("-" * 53)

    total_records = 0
    for col_info in collections:
        col_name = col_info.name if hasattr(col_info, 'name') else col_info
        try:
            col = client.get_collection(name=col_name)
            count = col.count()
            total_records += count
            print(f"{col_name:<35} | {count:<15}")
        except Exception as e:
            print(f"{col_name:<35} | Error ({e})")

    print("-" * 53)
    print(f"{'TOTAL RECORDS':<35} | {total_records:<15}\n")

def main():
    load_dotenv()
    
    parser = argparse.ArgumentParser(description="Check record counts in ChromaDB collections.")
    parser.add_argument(
        "--path", "-p",
        type=str,
        help="Path to local Chroma persistent directory (e.g., ./chroma or ./docker_volumes/chroma). If omitted, connects to HTTP server."
    )
    parser.add_argument(
        "--host",
        type=str,
        default=os.getenv("CHROMA_HOST", "localhost"),
        help="ChromaDB server host (default: localhost or CHROMA_HOST env var)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("CHROMA_PORT", 8080)),
        help="ChromaDB server port (default: 8080 or CHROMA_PORT env var)"
    )
    
    args = parser.parse_args()

    if args.path:
        if not os.path.exists(args.path):
            print(f"[Error] The path '{args.path}' does not exist.")
            sys.exit(1)
        client = chromadb.PersistentClient(path=args.path)
        get_collections_report(client, f"Local Path -> {args.path}")
    else:
        try:
            client = chromadb.HttpClient(
                host=args.host,
                port=args.port,
                ssl=False,
                headers={}
            )
            get_collections_report(client, f"HTTP Server -> http://{args.host}:{args.port}")
        except Exception as e:
            print(f"[Error] Failed to connect to ChromaDB server at {args.host}:{args.port}: {e}")
            print("\nTip: To check a local sqlite storage directory instead, use: python scripts/check_chroma_counts.py --path ./docker_volumes/chroma")
            sys.exit(1)

if __name__ == "__main__":
    main()
