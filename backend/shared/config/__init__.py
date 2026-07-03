from pydantic_settings import BaseSettings
from fastapi.middleware.cors import CORSMiddleware


def setup_cors(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )


class Settings(BaseSettings):
    MONGO_URI: str
    MONGO_DB: str = "dev"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"

    CLICKHOUSE_USER: str = "default"
    CLICKHOUSE_PASSWORD: str = ""
    CLICKHOUSE_HOST: str = "localhost"
    CLICKHOUSE_PORT: str = "8123"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def clickhouse_url(self) -> str:
        return f"http://{self.CLICKHOUSE_HOST}:{self.CLICKHOUSE_PORT}"


settings = Settings()
