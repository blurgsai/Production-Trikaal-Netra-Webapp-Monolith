import os
import sys
import argparse
import yaml
from pymongo import MongoClient
from dotenv import load_dotenv

def main():
    load_dotenv()
    
    parser = argparse.ArgumentParser(description="Ingest YAML configuration into MongoDB.")
    parser.add_argument(
        "--config",
        type=str,
        default=os.getenv("CONFIG_YAML_PATH", "rag_configs/page_nav_config.yaml"),
        help="Path to the YAML configuration file to ingest."
    )
    args = parser.parse_args()
    
    config_path = args.config
    if not os.path.exists(config_path):
        print(f"Error: Config file not found at {config_path}")
        sys.exit(1)
        
    print(f"Reading configuration from: {config_path}")
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
        
    mongo_uri = os.getenv("MONGO_URI", "mongodb://chat-admin:chat-pwd-123@localhost:27017/")
    db_name = os.getenv("MONGO_DB_NAME", "test")
    
    print(f"Connecting to MongoDB at: {mongo_uri}")
    print(f"Target Database: {db_name}")
    
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    # 1. Update Settings
    if "selected_llm" in config:
        db["copilot_settings"].replace_one(
            {"_id": "default"},
            {"_id": "default", "selected_llm": config["selected_llm"]},
            upsert=True
        )
        print("Updated copilot_settings table.")
        
    # 2. Update Sources
    enabled_sources = config.get("enabled_sources", [])
    print(f"Enabled sources in YAML: {enabled_sources}")
    
    # Find all possible sources defined in the config keys
    all_sources = [k for k in config.keys() if k not in ["selected_llm", "enabled_sources"]]
    
    for name in all_sources:
        src = config[name]
        is_enabled = name in enabled_sources
        
        doc = {
            "source_type": name,
            "enabled": is_enabled,
            "parameters": src.get("parameters", {}),
            "tools": src.get("selected_tools", [])
        }
        
        if "schema_resource" in src:
            doc["resources"] = [{"type": "schema", **src["schema_resource"]}]
            
        if "site_context" in src:
            doc["site_context"] = src["site_context"]
        elif "parameters" in src and "site_context" in src["parameters"]:
            doc["site_context"] = src["parameters"]["site_context"]
            
        db["copilot_sources"].replace_one(
            {"source_type": name},
            doc,
            upsert=True
        )
        print(f"Ingested configuration for source: {name} (enabled={is_enabled})")
        
    print("Ingestion complete.")

if __name__ == "__main__":
    main()
