from unittest.mock import MagicMock, patch

import pytest

from shared.email import SmtpConfig, _render_template, send_email, send_topic_email


class TestRenderTemplate:
    def test_simple_substitution(self):
        result = _render_template("Hello $name", {"name": "World"})
        assert result == "Hello World"

    def test_missing_variable_keeps_placeholder(self):
        result = _render_template("Hello $name, $missing", {"name": "World"})
        assert result == "Hello World, $missing"

    def test_no_variables(self):
        result = _render_template("Hello World", {})
        assert result == "Hello World"


class TestSmtpConfig:
    def test_resolve_uses_global_defaults_when_all_none(self, test_env):
        cfg = SmtpConfig().resolve()
        assert cfg.host == "smtp.gmail.com"
        assert cfg.port == 587
        assert cfg.tls is True

    def test_resolve_returns_self_when_all_set(self):
        cfg = SmtpConfig(host="h", port=25, user="u", password="p", from_addr="f", tls=False)
        resolved = cfg.resolve()
        assert resolved is cfg
        assert resolved.host == "h"
        assert resolved.tls is False

    def test_resolve_raises_on_partial_config(self):
        cfg = SmtpConfig(host="h", port=25)
        with pytest.raises(ValueError) as exc_info:
            cfg.resolve()
        assert "Partial SMTP config not allowed" in str(exc_info.value)


class TestSendEmail:
    @pytest.mark.asyncio
    async def test_skips_when_no_smtp_user(self, test_env):
        with patch("shared.email.SmtpConfig.resolve") as mock_resolve:
            mock_resolve.return_value = SmtpConfig(host="h", port=25, user="", password="", from_addr="f", tls=False)
            result = await send_email(["a@b.com"], "Subject", "Body")
            assert result == []

    @pytest.mark.asyncio
    async def test_skips_when_no_recipients(self, test_env):
        result = await send_email([], "Subject", "Body")
        assert result == []

    @pytest.mark.asyncio
    async def test_sends_email_successfully(self, test_env):
        with patch("smtplib.SMTP") as mock_smtp_class:
            mock_server = MagicMock()
            mock_server.__enter__ = lambda *args: mock_server
            mock_server.__exit__ = lambda *args: None
            mock_smtp_class.return_value = mock_server

            with patch("shared.email.SmtpConfig.resolve") as mock_resolve:
                mock_resolve.return_value = SmtpConfig(
                    host="smtp.example.com", port=587, user="u", password="p", from_addr="f", tls=True
                )
                result = await send_email(["a@b.com"], "Subject", "Body")
                assert "a@b.com" in result
                mock_server.starttls.assert_called_once()
                mock_server.login.assert_called_once_with("u", "p")
                mock_server.sendmail.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_empty_on_smtp_error(self, test_env):
        with patch("smtplib.SMTP") as mock_smtp_class:
            mock_smtp_class.side_effect = Exception("SMTP error")
            with patch("shared.email.SmtpConfig.resolve") as mock_resolve:
                mock_resolve.return_value = SmtpConfig(
                    host="smtp.example.com", port=587, user="u", password="p", from_addr="f", tls=False
                )
                result = await send_email(["a@b.com"], "Subject", "Body")
                assert result == []


class TestSendTopicEmail:
    @pytest.mark.asyncio
    async def test_returns_empty_when_no_template(self):
        result = await send_topic_email(["a@b.com"], None, None, {})
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_recipients(self):
        result = await send_topic_email([], "Subject", "Body", {})
        assert result == []

    @pytest.mark.asyncio
    async def test_renders_and_sends(self, test_env):
        with patch("shared.email.send_email") as mock_send:
            mock_send.return_value = ["a@b.com"]
            result = await send_topic_email(
                ["a@b.com"],
                subject_template="Hello $topic",
                body_template="Body $title",
                variables={"topic": "alerts", "title": "Alert!"},
            )
            assert result == ["a@b.com"]
            mock_send.assert_called_once()
            call_args = mock_send.call_args
            assert call_args.args[1] == "Hello alerts"
            assert call_args.args[2] == "Body Alert!"
            assert call_args.kwargs["html"] is True
