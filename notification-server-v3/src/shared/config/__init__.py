from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Notification Server"
    app_version: str = "3.0.0"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "notification_server"

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_tls: bool = True

    api_key_header: str = "X-API-Key"
    api_keys: list[str] = []

    ws_heartbeat_interval: int = 30

    redis_url: str = ""

    secret_key: str = "change-me-in-production-use-a-long-random-string"
    sqlite_path: str = "admin.db"
    session_max_age: int = 86400


@lru_cache
def get_settings() -> Settings:
    return Settings()
