from unittest.mock import MagicMock, patch

import pytest

from shared.db import close_all, get_client_for_uri, get_db_for_topic, _registry, _mask_uri


class TestMaskUri:
    def test_masks_password(self):
        uri = "mongodb://user:pass@host:27017/db"
        assert _mask_uri(uri) == "mongodb://user:***@host:27017/db"

    def test_no_password_unchanged(self):
        uri = "mongodb://host:27017/db"
        assert _mask_uri(uri) == "mongodb://host:27017/db"

    def test_invalid_uri_returns_original(self):
        assert _mask_uri("not-a-uri") == "not-a-uri"


class TestGetClientForUri:
    def test_registers_new_client(self):
        with patch("shared.db.AsyncIOMotorClient") as mock_cls:
            mock_instance = MagicMock()
            mock_cls.return_value = mock_instance
            _registry.clear()
            client = get_client_for_uri("mongodb://localhost:27017")
            assert client is mock_instance
            mock_cls.assert_called_once_with("mongodb://localhost:27017")

    def test_returns_cached_client(self):
        with patch("shared.db.AsyncIOMotorClient") as mock_cls:
            mock_instance = MagicMock()
            mock_cls.return_value = mock_instance
            _registry.clear()
            c1 = get_client_for_uri("mongodb://localhost:27017")
            c2 = get_client_for_uri("mongodb://localhost:27017")
            assert c1 is c2
            mock_cls.assert_called_once()


class TestGetDbForTopic:
    def test_fallback_to_global_defaults(self, test_env):
        with patch("shared.db.get_client_for_uri") as mock_get_client:
            mock_db = MagicMock()
            mock_client = MagicMock()
            mock_client.__getitem__ = lambda self, k: mock_db if k == "notification_server_test" else None
            mock_get_client.return_value = mock_client
            _registry.clear()
            db, coll = get_db_for_topic(None, None, "notifications")
            assert coll == "notifications"

    def test_custom_storage_requires_all_fields(self):
        with pytest.raises(ValueError) as exc_info:
            get_db_for_topic("mongodb://host", None, "notifications")
        assert "Partial storage config not allowed" in str(exc_info.value)

    def test_custom_storage_when_all_set(self):
        with patch("shared.db.get_client_for_uri") as mock_get_client:
            mock_db = MagicMock()
            mock_client = MagicMock()
            mock_client.__getitem__ = lambda self, k: mock_db if k == "custom_db" else None
            mock_get_client.return_value = mock_client
            _registry.clear()
            db, coll = get_db_for_topic("mongodb://custom", "custom_db", "custom_coll")
            assert coll == "custom_coll"


class TestCloseAll:
    @pytest.mark.asyncio
    async def test_closes_all_clients(self):
        mock_client = MagicMock()
        _registry["uri1"] = mock_client
        await close_all()
        mock_client.close.assert_called_once()
        assert len(_registry) == 0
