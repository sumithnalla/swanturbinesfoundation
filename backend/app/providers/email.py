"""
Email provider abstraction.
Application calls EmailService → EmailProvider.
Swapping Resend for another provider requires only a new provider class.
"""
import logging
from typing import Protocol, runtime_checkable, List, Optional

logger = logging.getLogger(__name__)


@runtime_checkable
class EmailProvider(Protocol):
    async def send(
        self,
        to: str | List[str],
        subject: str,
        html: str,
        from_addr: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        """Send an email. Returns True on success, False on failure."""
        ...


class ResendEmailProvider:
    """
    Concrete email provider using Resend.
    API key must be set in environment variables — never in frontend code.
    """

    def __init__(self, api_key: str, default_from: str):
        import resend as resend_module
        resend_module.api_key = api_key
        self._resend = resend_module
        self._default_from = default_from

    async def send(
        self,
        to: str | List[str],
        subject: str,
        html: str,
        from_addr: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        sender = from_addr or self._default_from
        recipients = [to] if isinstance(to, str) else to
        payload: dict = {
            "from": sender,
            "to": recipients,
            "subject": subject,
            "html": html,
        }
        if reply_to:
            payload["reply_to"] = reply_to
        try:
            # resend.Emails.send is synchronous — run in thread pool
            import asyncio
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, lambda: self._resend.Emails.send(payload)
            )
            logger.info("Email sent via Resend to %s | subject=%s", recipients, subject)
            return True
        except Exception as e:
            logger.error("Resend email failed: %s | to=%s | subject=%s", e, recipients, subject)
            return False


class NullEmailProvider:
    """
    No-op email provider for testing — logs instead of sending.
    """
    async def send(self, to, subject, html, from_addr=None, reply_to=None) -> bool:
        logger.info("[NullEmailProvider] Would send email to=%s subject=%s", to, subject)
        return True
