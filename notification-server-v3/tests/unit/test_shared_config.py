import os
from unittest.mock import patch

import pytest

from shared.config import Settings, get_settings


class TestSettings:
    def test_default_values(self, test_env):
        get_settings.cache_clear()
        s = get_settings()
        assert s.app_name == "Notification Server Test"
        assert s.app_version == "3.0.0-test"
        assert s.mongodb_uri == "mongodb://localhost:27017"
        assert s.mongodb_db == "notification_server_test"
        assert s.api_keys == ["test-api-key"]
        assert s.ws_heartbeat_interval == 30
        assert s.secret_key == "test-secret-32chars-long!!"
        assert s.sqlite_path == "test_admin.db"
        assert s.session_max_age == 86400

    def test_api_keys_parsing(self):
        with patch.dict(os.environ, {"API_KEYS": '["a", "b", "c"]', "SQLITE_PATH": ":memory:", "SECRET_KEY": "x"}):
            get_settings.cache_clear()
            s = get_settings()
            assert s.api_keys == ["a", "b", "c"]
        get_settings.cache_clear()

    def test_empty_api_keys_means_open(self):
        with patch.dict(os.environ, {"API_KEYS": "[]", "SQLITE_PATH": ":memory:", "SECRET_KEY": "x"}):
            get_settings.cache_clear()
            s = get_settings()
            assert s.api_keys == []
        get_settings.cache_clear()

    def test_lru_cache_returns_same_instance(self, test_env):
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2


class TestSettingsEnvFile:
    def test_reads_from_dotenv(self, tmp_path):
        env_file = tmp_path / ".env"
        env_file.write_text('APP_NAME="FromFile"\nSECRET_KEY="file-secret"\nSQLITE_PATH="file.db"\n')
        with patch.dict(os.environ, {}, clear=True):
            get_settings.cache_clear()
            s = Settings(_env_file=str(env_file))
            assert s.app_name == "FromFile"
            assert s.secret_key == "file-secret"
        get_settings.cache_clear()
