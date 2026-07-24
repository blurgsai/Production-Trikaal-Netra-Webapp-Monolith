import os
import sys
import subprocess
import time
import pytest
import httpx
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Initialize and stub observability at session startup to prevent double-initialization crashes
import blurgs_observability
try:
    blurgs_observability.init_observability(
        None,
        'testing-service',
        json_file_log_level="INFO",
        console_log_level="DEBUG",
        otel_log_level=None,
    )
except Exception:
    pass
blurgs_observability.init_observability = lambda *args, **kwargs: None

# ---------------------------------------------------------------------------
# Test infrastructure constants — all on dedicated ports to avoid dev clashes
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).parent.parent.resolve()
TEST_CONFIG_PATH = str(_PROJECT_ROOT / "tests" / "test_config.yaml")

TEST_MONGO_PORT = 27018          # dev uses 27017
TEST_CHROMA_PORT = 8081          # dev uses 8080
TEST_MCP_PORT = 5001             # dev uses 5000
TEST_MCP_URL = f"http://localhost:{TEST_MCP_PORT}/mcp"
TEST_MONGO_CONTAINER = "mongo-test"
TEST_CHROMA_CONTAINER = "chroma-test"

# Expose dedicated test-only env vars so test files use these explicitly.
# Also override the standard env vars so that api.py (which runs in-process)
# connects to the test containers.
os.environ["CONFIG_YAML_PATH"] = TEST_CONFIG_PATH
os.environ["TEST_MCP_SERVER_URL"] = TEST_MCP_URL   # test-only
os.environ["TEST_MCP_PORT"] = str(TEST_MCP_PORT)
os.environ["MCP_SERVER_URL"] = TEST_MCP_URL        # read by api.py
os.environ["CHROMA_HOST"] = "localhost"
os.environ["CHROMA_PORT"] = str(TEST_CHROMA_PORT)
os.environ["MONGO_HOST"] = "localhost"             # force localhost for test DB
os.environ["MONGO_PORT"] = str(TEST_MONGO_PORT)    # read by ChatMongoClient
os.environ["MONGO_USERNAME"] = ""
os.environ["MONGO_PASSWORD"] = ""
os.environ["MONGO_URI"] = ""

import json
import yaml
from bson import json_util
from pymongo import MongoClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _wait_for_http(url: str, timeout: int = 30, interval: float = 1.0) -> bool:
    """Poll url until it responds with a non-5xx status or timeout."""
    for _ in range(int(timeout / interval)):
        try:
            r = httpx.get(url, timeout=2.0)
            if r.status_code < 500:
                return True
        except Exception:
            pass
        time.sleep(interval)
    return False


def _wait_for_mongo(port: int, timeout: int = 30) -> bool:
    """Poll until MongoDB accepts connections."""
    for _ in range(timeout):
        try:
            client = MongoClient(f"mongodb://localhost:{port}", serverSelectionTimeoutMS=1000)
            client.admin.command("ping")
            client.close()
            return True
        except Exception:
            pass
        time.sleep(1)
    return False


def _docker_remove(name: str):
    """Force-remove a container by name if it exists (tolerates missing containers)."""
    subprocess.run(
        ["docker", "rm", "-f", name],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def mongo_container():
    """
    Spin up a fresh MongoDB container on TEST_MONGO_PORT for the test session.
    Force-removes any leftover container from a previous crashed run.
    """
    print(f"\n[conftest] Starting MongoDB test container on port {TEST_MONGO_PORT}...")
    _docker_remove(TEST_MONGO_CONTAINER)

    subprocess.run(
        [
            "docker", "run", "-d",
            "--name", TEST_MONGO_CONTAINER,
            "-p", f"{TEST_MONGO_PORT}:27017",
            "--rm",
            "mongo:7",
        ],
        check=True,
        stdout=subprocess.DEVNULL,
    )

    if not _wait_for_mongo(TEST_MONGO_PORT):
        subprocess.run(["docker", "stop", TEST_MONGO_CONTAINER], check=False)
        pytest.fail(f"MongoDB test container did not become ready on port {TEST_MONGO_PORT}.")

    print(f"[conftest] MongoDB test container ready on port {TEST_MONGO_PORT}.")
    yield

    print(f"\n[conftest] Stopping MongoDB test container...")
    subprocess.run(["docker", "stop", TEST_MONGO_CONTAINER], check=False)


@pytest.fixture(scope="session")
def chroma_container():
    """
    Spin up a fresh Chroma container on TEST_CHROMA_PORT for the test session.
    Force-removes any leftover container from a previous crashed run.
    """
    print(f"\n[conftest] Starting Chroma test container on port {TEST_CHROMA_PORT}...")
    _docker_remove(TEST_CHROMA_CONTAINER)

    subprocess.run(
        [
            "docker", "run", "-d",
            "--name", TEST_CHROMA_CONTAINER,
            "-p", f"{TEST_CHROMA_PORT}:8000",
            "--rm",
            "chromadb/chroma",
        ],
        check=True,
        stdout=subprocess.DEVNULL,
    )

    chroma_health_url = f"http://localhost:{TEST_CHROMA_PORT}/api/v2/heartbeat"
    if not _wait_for_http(chroma_health_url, timeout=30):
        subprocess.run(["docker", "stop", TEST_CHROMA_CONTAINER], check=False)
        pytest.fail(f"Chroma test container did not become ready on port {TEST_CHROMA_PORT}.")

    print(f"[conftest] Chroma test container ready on port {TEST_CHROMA_PORT}.")
    yield

    print(f"\n[conftest] Stopping Chroma test container...")
    subprocess.run(["docker", "stop", TEST_CHROMA_CONTAINER], check=False)


@pytest.fixture(scope="session")
def mongo_seed_data(mongo_container):
    """
    Seed the test MongoDB (port 27018) with fixture data if collections are empty.
    """
    print("\n[conftest] Checking MongoDB for test data...")
    client = MongoClient(f"mongodb://localhost:{TEST_MONGO_PORT}")
    db = client["test_db"]

    # Seed world_monitor_articles
    articles_coll = db["world_monitor_articles"]
    if articles_coll.count_documents({}) == 0:
        print("[conftest] Seeding world_monitor_articles...")
        with open(_PROJECT_ROOT / "tests" / "test_data" / "dev.world_monitor_articles.json", "r") as f:
            articles_data = json_util.loads(f.read())
            if articles_data:
                articles_coll.insert_many(articles_data)
    else:
        print("[conftest] world_monitor_articles already contains data, skipping seed.")

    # Seed world_monitor_events
    events_coll = db["world_monitor_events"]
    if events_coll.count_documents({}) == 0:
        print("[conftest] Seeding world_monitor_events...")
        with open(_PROJECT_ROOT / "tests" / "test_data" / "dev.world_monitor_events.json", "r") as f:
            events_data = json_util.loads(f.read())
            if events_data:
                events_coll.insert_many(events_data)
    else:
        print("[conftest] world_monitor_events already contains data, skipping seed.")

    client.close()


@pytest.fixture(scope="session")
def copilot_sources_seed(mongo_container):
    """
    Seed the test MongoDB (port 27018) with the three 'copilot_sources' documents
    that tool_server/server.py reads to discover and register RAG tools and resources.

    Without this, load_rag_sources_from_mongo() finds 0 enabled sources and the
    test MCP server boots with no tools or resources registered.

    The document structure mirrors what base_class.get_config() expects:
      source_type, enabled, parameters, tools (list), resources (list).
    """
    print("\n[conftest] Seeding copilot_sources into test MongoDB...")

    # Read tool + resource definitions from the same test_config.yaml that the
    # test MCP server is pointed at via CONFIG_YAML_PATH.
    with open(TEST_CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)

    client = MongoClient(f"mongodb://localhost:{TEST_MONGO_PORT}")

    # ---------------------------------------------------------------------------
    # Build source documents
    # ---------------------------------------------------------------------------
    mongo_cfg = config.get("mongo", {})
    mongo_doc = {
        "source_type": "mongo",
        "enabled": True,
        "parameters": mongo_cfg.get("parameters", {}),
        "tools": mongo_cfg.get("selected_tools", []),
        "resources": [mongo_cfg.get("schema_resource", {})],
    }

    text_cfg = config.get("text_files", {})
    text_doc = {
        "source_type": "text_files",
        "enabled": True,
        "parameters": text_cfg.get("parameters", {}),
        "tools": text_cfg.get("selected_tools", []),
        "resources": [text_cfg.get("schema_resource", {})],
    }

    page_cfg = config.get("page_navigator", {})
    page_parameters = dict(page_cfg.get("parameters", {}))
    if "site_context" in page_cfg:
        page_parameters["site_context"] = page_cfg["site_context"]
    page_doc = {
        "source_type": "page_navigator",
        "enabled": True,
        "parameters": page_parameters,
        "tools": page_cfg.get("selected_tools", []),
        "resources": [page_cfg.get("schema_resource", {})],
    }

    selected_llm_cfg = config.get("selected_llm", {"provider": "gemini", "model": "gemini-3.1-flash-lite"})
    settings_doc = {
        "_id": "default",
        "selected_llm": selected_llm_cfg,
    }

    # Seed into both 'dev' (which tool_server/server.py checks via MONGO_DB_NAME)
    # and 'test_db' so all components find the enabled RAG sources during tests.
    for db_name in {os.getenv("MONGO_DB_NAME", "dev"), "test_db", "dev"}:
        coll = client[db_name]["copilot_sources"]
        coll.replace_one({"source_type": "mongo"}, mongo_doc, upsert=True)
        coll.replace_one({"source_type": "text_files"}, text_doc, upsert=True)
        coll.replace_one({"source_type": "page_navigator"}, page_doc, upsert=True)

        settings_coll = client[db_name]["copilot_settings"]
        settings_coll.replace_one({"_id": "default"}, settings_doc, upsert=True)

    client.close()
    print("[conftest] copilot_sources and copilot_settings seeded into dev and test_db.")


@pytest.fixture(scope="session")
def chroma_seed_data(chroma_container):
    """
    Seed the test Chroma (port 8081) with fixture data if the collection is empty.
    """
    print("\n[conftest] Checking Chroma for test data...")
    from config_generation_app.text_processor import TextProcessor
    
    processor = TextProcessor(
        collection_name="documents",
        chroma_port=TEST_CHROMA_PORT
    )
    
    stats = processor.get_collection_stats()
    if stats.get("document_count", 0) == 0:
        print("[conftest] Seeding Chroma with test_chroma_context.md...")
        test_file = _PROJECT_ROOT / "tests" / "test_data" / "test_chroma_context.md"
        processor.process_and_store([str(test_file)])
    else:
        print("[conftest] Chroma already contains data, skipping seed.")


@pytest.fixture(scope="session")
def jwt_token() -> dict:
    """Return an Authorization header dict with a valid test JWT.

    Mints a token signed with the project JWT_SECRET (HS256) for a
    synthetic 'test_user'.  Scope is session because the secret doesn't
    change between tests.
    """
    import jwt as pyjwt

    secret = os.getenv("JWT_SECRET", "jwt-secret-key")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    token = pyjwt.encode(
        {"sub": "test_user", "role": "user"},
        secret,
        algorithm=algorithm,
    )
    # pyjwt >= 2.x returns str directly; older versions return bytes
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def mcp_server(mongo_seed_data, chroma_seed_data, copilot_sources_seed):
    """
    Start the MCP server on TEST_MCP_PORT (5001) pointing at the isolated
    test MongoDB (27018) and test Chroma (8081).
    Depends on mongo_seed_data and chroma_seed_data to ensure
    both services are ready and seeded first.
    """
    print(f"\n[conftest] Starting MCP server on port {TEST_MCP_PORT}...")

    env = os.environ.copy()
    env["CONFIG_YAML_PATH"] = TEST_CONFIG_PATH
    env["MCP_SERVER_PORT"] = str(TEST_MCP_PORT)
    env["MCP_SERVER_URL"] = TEST_MCP_URL
    env["CHROMA_HOST"] = "localhost"
    env["CHROMA_PORT"] = str(TEST_CHROMA_PORT)

    server_process = subprocess.Popen(
        # sys.executable ensures the same venv Python that pytest is using
        [sys.executable, "run_server.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        cwd=str(_PROJECT_ROOT),
    )

    if not _wait_for_http(TEST_MCP_URL, timeout=30):
        server_process.terminate()
        server_process.wait()
        pytest.fail(f"MCP server did not become ready at {TEST_MCP_URL}.")

    print(f"\n[conftest] MCP server is ready at {TEST_MCP_URL}.")

    yield server_process

    print("\n[conftest] Shutting down MCP server...")
    server_process.terminate()
    try:
        server_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server_process.kill()
