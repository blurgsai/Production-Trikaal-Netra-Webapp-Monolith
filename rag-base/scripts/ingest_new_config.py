"""
scripts/ingest_new_config.py
────────────────────────────
Ingests rag_configs/new_compose_config.yaml into MongoDB:
  - copilot_settings  ← selected_llm block
  - copilot_sources   ← one document per source in enabled_sources

Usage
─────
  # Preview what would be written (no DB writes)
  python scripts/ingest_new_config.py --dry-run

  # Write to local MongoDB (MONGO_URI from .env)
  python scripts/ingest_new_config.py --target local

  # Write to remote/docker MongoDB (DOCKER_MONGO_URI from .env)
  python scripts/ingest_new_config.py --target remote

  # Write to both local and remote
  python scripts/ingest_new_config.py --target both

  # Override config file path
  python scripts/ingest_new_config.py --config rag_configs/other_config.yaml --target local

Environment variables (read from .env)
───────────────────────────────────────
  Local target  : MONGO_URI, MONGO_DB_NAME
  Remote target : DOCKER_MONGO_URI, DOCKER_MONGO_DB_NAME

Document structure written to copilot_sources (matches base_class.get_config() expectations)
──────────────────────────────────────────────────────────────────────────────────────────────
  {
      "source_type" : "page_navigator",        # unique key
      "enabled"     : True,
      "parameters"  : { llm_provider, llm_model, base_url },  # site_context excluded
      "tools"       : [ {name, description}, ... ],
      "resources"   : [ {"type": "schema", "name": ..., "description": ..., "content": ...} ],
      "site_context": { global_operators: {...}, pages: {...} }   # top-level; merged back
  }                                                               # into parameters by base_class
"""

import argparse
import os
import sys

import yaml
from dotenv import load_dotenv
from pymongo import MongoClient


# ── Optional Pydantic pre-flight (only available when run from project root) ──
def _try_import_site_context():
    try:
        from tool_server.rag_sources.page_navigator import SiteContext
        return SiteContext
    except ImportError:
        return None


def validate_site_context(site_context_data: dict) -> bool:
    """
    Attempt to validate site_context against the SiteContext Pydantic model.
    Returns True if valid or if the model is unavailable (soft-fail).
    """
    SiteContext = _try_import_site_context()
    if SiteContext is None:
        print("  ⚠️  Pydantic pre-flight skipped (run from project root to enable)")
        return True

    try:
        parsed = SiteContext.model_validate(site_context_data)
        pages = list(parsed.pages.keys())
        attr_counts = {p: len(cfg.attributes) for p, cfg in parsed.pages.items()}
        print(f"  ✅ site_context Pydantic validation OK")
        print(f"     Pages : {pages}")
        print(f"     Attrs : {attr_counts}")
        return True
    except Exception as e:
        print(f"  ❌ site_context Pydantic validation FAILED: {e}")
        print("     Fix the YAML before ingesting — aborting.")
        return False


# ── Core ingestion logic ──────────────────────────────────────────────────────

def build_documents(config: dict):
    """
    Parse the YAML config into:
      - settings_doc  : dict to upsert into copilot_settings
      - source_docs   : list of dicts to upsert into copilot_sources

    The site_context for page_navigator lives under parameters.site_context
    in the YAML, but must be stored at the top level in copilot_sources so
    that base_class.get_config() can merge it back into parameters correctly.
    """
    settings_doc = None
    if "selected_llm" in config:
        settings_doc = {
            "_id": "default",
            "selected_llm": config["selected_llm"],
        }

    enabled_sources = config.get("enabled_sources", [])
    # Process ALL source keys (disabled sources stored with enabled=False)
    all_source_keys = [
        k for k in config.keys()
        if k not in ("selected_llm", "enabled_sources")
    ]

    source_docs = []
    for name in all_source_keys:
        src = config[name]
        if not isinstance(src, dict):
            continue

        # Parameters: pop site_context — it must live at top level in Mongo
        raw_params = dict(src.get("parameters", {}))
        site_context = raw_params.pop("site_context", None)
        # Also handle alternate layout where site_context is at source root
        if site_context is None:
            site_context = src.get("site_context")

        doc = {
            "source_type": name,
            "enabled": name in enabled_sources,
            "parameters": raw_params,
            "tools": src.get("selected_tools", []),
            "resources": [],
        }

        if "schema_resource" in src:
            doc["resources"] = [{"type": "schema", **src["schema_resource"]}]

        if site_context is not None:
            doc["site_context"] = site_context

        source_docs.append(doc)

    return settings_doc, source_docs


def print_preview(settings_doc, source_docs):
    """Print a human-readable preview of what would be written."""
    print("\n" + "=" * 64)
    print("  DRY RUN — documents that WOULD be written")
    print("=" * 64)

    if settings_doc:
        print("\n  copilot_settings  (filter: {_id: 'default'})")
        llm = settings_doc.get("selected_llm", {})
        print(f"    selected_llm: provider={llm.get('provider')!r}, model={llm.get('model')!r}")

    print(f"\n  copilot_sources  ({len(source_docs)} document(s))")
    for doc in source_docs:
        name = doc["source_type"]
        enabled = doc["enabled"]
        n_tools = len(doc.get("tools", []))
        n_res = len(doc.get("resources", []))
        has_sc = "site_context" in doc
        params_keys = list(doc.get("parameters", {}).keys())
        print(
            f"    [{name}]  enabled={enabled}  tools={n_tools}  "
            f"resources={n_res}  site_context={has_sc}  params_keys={params_keys}"
        )
        if has_sc:
            sc = doc["site_context"]
            pages = list(sc.get("pages", {}).keys())
            print(f"      └─ site_context.pages: {pages}")

    print()


def ingest_into(mongo_uri, db_name, settings_doc, source_docs, label):
    """Upsert settings + sources into one MongoDB target. Returns True on full success."""
    print(f"\n  Connecting to [{label}]")
    print(f"    uri : {mongo_uri}")
    print(f"    db  : {db_name}")

    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=8000)
        client.server_info()  # force connection check
        db = client[db_name]
        print(f"    ✅ Connected")
    except Exception as e:
        print(f"    ❌ Connection failed: {e}")
        return False

    success = True

    # copilot_settings
    if settings_doc:
        try:
            result = db["copilot_settings"].replace_one(
                {"_id": "default"},
                settings_doc,
                upsert=True,
            )
            action = "inserted" if result.upserted_id else "updated"
            llm = settings_doc["selected_llm"]
            print(
                f"    ✅ copilot_settings {action} — "
                f"provider={llm['provider']!r}, model={llm['model']!r}"
            )
        except Exception as e:
            print(f"    ❌ copilot_settings write failed: {e}")
            success = False

    # copilot_sources — one upsert per source
    for doc in source_docs:
        name = doc["source_type"]
        try:
            result = db["copilot_sources"].replace_one(
                {"source_type": name},
                doc,
                upsert=True,
            )
            action = "inserted" if result.upserted_id else "updated"
            has_sc = "site_context" in doc
            n_tools = len(doc.get("tools", []))
            print(
                f"    ✅ copilot_sources[{name}] {action} — "
                f"enabled={doc['enabled']}, tools={n_tools}, site_context={has_sc}"
            )
        except Exception as e:
            print(f"    ❌ copilot_sources[{name}] write failed: {e}")
            success = False

    client.close()
    return success


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Ingest new_compose_config.yaml into MongoDB copilot collections.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/ingest_new_config.py --dry-run
  python scripts/ingest_new_config.py --target local
  python scripts/ingest_new_config.py --target remote
  python scripts/ingest_new_config.py --target both
  python scripts/ingest_new_config.py --config rag_configs/other.yaml --target local
        """,
    )
    parser.add_argument(
        "--config",
        default=os.getenv("CONFIG_YAML_PATH", "rag_configs/new_compose_config.yaml"),
        help="Path to the YAML config file (default: CONFIG_YAML_PATH env or rag_configs/new_compose_config.yaml)",
    )
    parser.add_argument(
        "--target",
        choices=["local", "remote", "both"],
        default="local",
        help="MongoDB target: local (MONGO_URI), remote (DOCKER_MONGO_URI), or both (default: local)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview documents without writing to MongoDB",
    )
    args = parser.parse_args()

    # ── Load YAML ──────────────────────────────────────────────────────────
    if not os.path.exists(args.config):
        print(f"❌ Config file not found: {args.config}")
        sys.exit(1)

    print(f"📄 Config file : {args.config}")
    with open(args.config) as f:
        config = yaml.safe_load(f)

    enabled_sources = config.get("enabled_sources", [])
    all_source_keys = [k for k in config if k not in ("selected_llm", "enabled_sources")]
    print(f"   enabled_sources : {enabled_sources}")
    print(f"   all source keys : {all_source_keys}")

    # ── Pre-flight: Pydantic validation of site_context ─────────────────────
    print("\n🔍 Pre-flight validation...")
    if "page_navigator" in config:
        sc_data = config["page_navigator"].get("parameters", {}).get("site_context")
        if sc_data:
            if not validate_site_context(sc_data):
                sys.exit(1)
        else:
            print("  ⚠️  No site_context found in page_navigator.parameters")
    else:
        print("  ℹ️  No page_navigator source — skipping site_context validation")

    # ── Build documents ─────────────────────────────────────────────────────
    settings_doc, source_docs = build_documents(config)

    # ── Dry run: print and exit ─────────────────────────────────────────────
    if args.dry_run:
        print_preview(settings_doc, source_docs)
        print("ℹ️  Dry run complete — no changes written to MongoDB.")
        return

    # ── Resolve targets ─────────────────────────────────────────────────────
    local_uri  = os.getenv("MONGO_URI",        "mongodb://chat-admin:chat-pwd-123@localhost:27017")
    local_db   = os.getenv("MONGO_DB_NAME",    "dev")
    remote_uri = os.getenv("DOCKER_MONGO_URI", "mongodb://admin:StrongPassword123@34.14.212.228:27017")
    remote_db  = os.getenv("DOCKER_MONGO_DB_NAME", "dev")

    targets = []
    if args.target in ("local", "both"):
        targets.append(("local",  local_uri,  local_db))
    if args.target in ("remote", "both"):
        targets.append(("remote", remote_uri, remote_db))

    # ── Ingest ──────────────────────────────────────────────────────────────
    print(f"\n🚀 Ingesting to target(s): {[t[0] for t in targets]}")
    all_ok = True
    for label, uri, db_name in targets:
        ok = ingest_into(uri, db_name, settings_doc, source_docs, label)
        all_ok = all_ok and ok

    print()
    if all_ok:
        print("✅ Ingestion complete — all targets updated successfully.")
    else:
        print("⚠️  Ingestion finished with errors. Check output above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
