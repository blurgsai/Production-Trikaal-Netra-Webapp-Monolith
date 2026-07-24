from tool_server.rag_sources.mongo import (
    build_mongo_connection_string,
    redact_mongo_connection_string,
)


def clear_mongo_env(monkeypatch):
    for name in [
        "MONGO_URI",
        "MONGO_HOST",
        "MONGO_PORT",
        "MONGO_USERNAME",
        "MONGO_PASSWORD",
        "MONGO_AUTH_SOURCE",
    ]:
        monkeypatch.delenv(name, raising=False)


def test_build_mongo_connection_string_prefers_mongo_uri(monkeypatch):
    clear_mongo_env(monkeypatch)
    monkeypatch.setenv("MONGO_URI", "mongodb://user:pass@example:27017/?authSource=admin")
    monkeypatch.setenv("MONGO_HOST", "ignored")

    assert build_mongo_connection_string({"connection_string": "mongodb://yaml:27017"}) == (
        "mongodb://user:pass@example:27017/?authSource=admin"
    )


def test_build_mongo_connection_string_uses_auth_env(monkeypatch):
    clear_mongo_env(monkeypatch)
    monkeypatch.setenv("MONGO_HOST", "mongo")
    monkeypatch.setenv("MONGO_PORT", "27018")
    monkeypatch.setenv("MONGO_USERNAME", "chat admin")
    monkeypatch.setenv("MONGO_PASSWORD", "pwd/123")
    monkeypatch.setenv("MONGO_AUTH_SOURCE", "admin")

    assert build_mongo_connection_string({}) == (
        "mongodb://chat+admin:pwd%2F123@mongo:27018/?authSource=admin"
    )


def test_build_mongo_connection_string_falls_back_to_yaml(monkeypatch):
    clear_mongo_env(monkeypatch)

    assert build_mongo_connection_string({"connection_string": "mongodb://localhost:27018"}) == (
        "mongodb://localhost:27018"
    )


def test_redact_mongo_connection_string_hides_credentials():
    assert redact_mongo_connection_string("mongodb://user:secret@mongo:27017/?authSource=admin") == (
        "mongodb://***:***@mongo:27017/?authSource=admin"
    )
