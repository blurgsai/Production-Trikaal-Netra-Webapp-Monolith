import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    TILESERVER_PORT: int = 8001
    TILESERVER_DATA_DIR: str = "./data"

    # GeoServer integration for vector overlay rendering (MVT, WMS, WFS)
    GEOSERVER_URL: str = ""
    GEOSERVER_USER: str = "admin"
    GEOSERVER_PASSWORD: str = "geoserver"
    GEOSERVER_WORKSPACE: str = "trikaalx"

    class Config:
        env_file = ".env"


settings = Settings()

DATA_DIR = os.path.abspath(settings.TILESERVER_DATA_DIR)
os.makedirs(DATA_DIR, exist_ok=True)

METADATA_DB_PATH = os.path.join(DATA_DIR, "tileserver_metadata.db")
