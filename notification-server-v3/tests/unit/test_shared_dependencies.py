from unittest.mock import MagicMock, patch

import pytest

from shared.dependencies import api_key_guard, get_db, get_mongo_client, require_api_key
from shared.errors import UnauthorizedError


class TestRequireApiKey:
    @pytest.mark.asyncio
    async def test_returns_open_when_no_api_keys_configured(self, test_env):
        with patch("shared.dependencies.get_settings") as mock_settings:
            s = MagicMock()
            s.api_keys = []
            mock_settings.return_value = s
            result = await require_api_key("anything")
            assert result == "open"

    @pytest.mark.asyncio
    async def test_returns_key_when_valid(self, test_env):
        with patch("shared.dependencies.get_settings") as mock_settings:
            s = MagicMock()
            s.api_keys = ["secret-key"]
            mock_settings.return_value = s
            result = await require_api_key("secret-key")
            assert result == "secret-key"

    @pytest.mark.asyncio
    async def test_raises_when_invalid(self, test_env):
        with patch("shared.dependencies.get_settings") as mock_settings:
            s = MagicMock()
            s.api_keys = ["secret-key"]
            mock_settings.return_value = s
            with pytest.raises(UnauthorizedError):
                await require_api_key("wrong-key")


class TestApiKeyGuard:
    @pytest.mark.asyncio
    async def test_returns_key_when_valid(self, test_env):
        with patch("shared.dependencies.get_settings") as mock_settings:
            s = MagicMock()
            s.api_keys = ["test-api-key"]
            mock_settings.return_value = s
            result = await api_key_guard("test-api-key")
            assert result == "test-api-key"

    @pytest.mark.asyncio
    async def test_raises_when_invalid(self, test_env):
        with patch("shared.dependencies.get_settings") as mock_settings:
            s = MagicMock()
            s.api_keys = ["test-api-key"]
            mock_settings.return_value = s
            with pytest.raises(UnauthorizedError):
                await api_key_guard("wrong-key")


class TestGetMongoClient:
    def test_creates_client_once(self, test_env):
        from shared.dependencies import _client
        with patch("shared.dependencies.AsyncIOMotorClient") as mock_client_cls:
            mock_instance = MagicMock()
            mock_client_cls.return_value = mock_instance
            # Force reset of global client
            import shared.dependencies as dep_mod
            original = dep_mod._client
            dep_mod._client = None
            try:
                c1 = get_mongo_client()
                c2 = get_mongo_client()
                assert c1 is c2
                mock_client_cls.assert_called_once()
            finally:
                dep_mod._client = original


class TestGetDb:
    @pytest.mark.asyncio
    async def test_returns_configured_db(self, test_env):
        with patch("shared.dependencies.AsyncIOMotorClient") as mock_client_cls:
            mock_instance = MagicMock()
            mock_client_cls.return_value = mock_instance
            import shared.dependencies as dep_mod
            original = dep_mod._client
            dep_mod._client = None
            try:
                gen = get_db()
                db = await gen.__anext__()
                mock_instance.__getitem__.assert_called_once_with("notification_server_test")
            finally:
                dep_mod._client = original


class TestRequireApiKeyMultiple:
    @pytest.mark.asyncio
    async def test_matches_one_of_many(self, test_env):
        with patch("shared.dependencies.get_settings") as mock_settings:
            s = MagicMock()
            s.api_keys = ["key-a", "key-b", "key-c"]
            mock_settings.return_value = s
            result = await require_api_key("key-b")
            assert result == "key-b"


class TestApiKeyWhitespace:
    @pytest.mark.asyncio
    async def test_does_not_match_with_whitespace(self, test_env):
        with patch("shared.dependencies.get_settings") as mock_settings:
            s = MagicMock()
            s.api_keys = ["secret-key"]
            mock_settings.return_value = s
            with pytest.raises(UnauthorizedError):
                await require_api_key(" secret-key")
