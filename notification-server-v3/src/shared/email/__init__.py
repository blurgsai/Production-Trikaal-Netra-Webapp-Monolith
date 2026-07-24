import asyncio
import logging
import smtplib
import string
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from shared.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class SmtpConfig:
    """
    Per-topic SMTP override.  Strict mode: if any field is set, all must be set.
    If all fields are None, falls back to global settings.
    """
    host: str | None = None
    port: int | None = None
    user: str | None = None
    password: str | None = None
    from_addr: str | None = None
    tls: bool | None = None

    def resolve(self) -> "SmtpConfig":
        """
        Return a fully-populated config.
        If any field is set, all must be set — otherwise raise ValueError.
        If all fields are None, use global defaults.
        """
        has_custom = any([self.host, self.port, self.user, self.password, self.from_addr, self.tls is not None])
        if has_custom:
            if not (self.host and self.port is not None and self.user and self.password and self.from_addr and self.tls is not None):
                raise ValueError(
                    "Partial SMTP config not allowed: if any smtp_* field is set, all must be set."
                )
            return self
        s = get_settings()
        return SmtpConfig(
            host=s.smtp_host,
            port=s.smtp_port,
            user=s.smtp_user,
            password=s.smtp_password,
            from_addr=s.smtp_from or s.smtp_user,
            tls=s.smtp_tls,
        )


def _render_template(template: str, variables: dict[str, Any]) -> str:
    """Simple $variable substitution using Python's string.Template."""
    return string.Template(template).safe_substitute(variables)


async def send_email(
    to_addresses: list[str],
    subject: str,
    body: str,
    html: bool = False,
    smtp: SmtpConfig | None = None,
) -> list[str]:
    """
    Send email to a list of addresses. Returns successfully sent addresses.
    Runs the blocking SMTP call in a thread pool so it doesn't block the event loop.
    Pass smtp to override global SMTP settings for this call.
    """
    cfg = (smtp or SmtpConfig()).resolve()
    if not cfg.user or not to_addresses:
        logger.warning("Email skipped: smtp_user not configured or no recipients")
        return []

    def _send() -> list[str]:
        sent: list[str] = []
        try:
            with smtplib.SMTP(cfg.host, cfg.port) as server:
                if cfg.tls:
                    server.starttls()
                server.login(cfg.user, cfg.password)
                for addr in to_addresses:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = cfg.from_addr
                    msg["To"] = addr
                    part = MIMEText(body, "html" if html else "plain")
                    msg.attach(part)
                    server.sendmail(cfg.from_addr, addr, msg.as_string())
                    sent.append(addr)
        except Exception as exc:
            logger.error("SMTP error: %s", exc)
        return sent

    return await asyncio.to_thread(_send)


async def send_topic_email(
    to_addresses: list[str],
    subject_template: str | None,
    body_template: str | None,
    variables: dict[str, Any],
    smtp: SmtpConfig | None = None,
) -> list[str]:
    if not body_template or not to_addresses:
        return []

    subject = _render_template(subject_template or "Notification", variables)
    body = _render_template(body_template, variables)
    return await send_email(to_addresses, subject, body, html=True, smtp=smtp)
