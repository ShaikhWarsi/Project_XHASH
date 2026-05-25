from __future__ import annotations

import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from core.errors import IntegrationError

log = logging.getLogger(__name__)


class EmailNotifier:
    def __init__(
        self,
        smtp_host: str,
        smtp_port: int = 587,
        username: str = "",
        password: str = "",
        from_addr: str = "",
        use_tls: bool = True,
    ):
        self._smtp_host = smtp_host
        self._smtp_port = smtp_port
        self._username = username
        self._password = password
        self._from_addr = from_addr or username
        self._use_tls = use_tls

    def send(
        self,
        to: str,
        subject: str,
        body: str,
        html: Optional[str] = None,
        cc: Optional[list[str]] = None,
        bcc: Optional[list[str]] = None,
    ) -> dict:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self._from_addr
        msg["To"] = to

        if cc:
            msg["Cc"] = ", ".join(cc)
        if bcc:
            msg["Bcc"] = ", ".join(bcc)

        msg.attach(MIMEText(body, "plain"))
        if html:
            msg.attach(MIMEText(html, "html"))

        recipients = [to] + (cc or []) + (bcc or [])

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(self._smtp_host, self._smtp_port) as server:
                if self._use_tls:
                    server.starttls(context=context)
                if self._username:
                    server.login(self._username, self._password)
                server.sendmail(self._from_addr, recipients, msg.as_string())
        except Exception as e:
            raise IntegrationError(f"Email send failed: {e}")

        return {"to": to, "subject": subject, "status": "sent"}

    def notify_trade(self, to: str, symbol: str, side: str, quantity: float, price: float) -> dict:
        subject = f"Trade Executed: {side} {symbol}"
        body = (
            f"Trade Executed\n"
            f"Symbol: {symbol}\n"
            f"Side: {side}\n"
            f"Quantity: {quantity:.4f}\n"
            f"Price: ${price:.2f}\n"
        )
        return self.send(to, subject, body)

    def notify_alert(self, to: str, title: str, message: str, level: str = "INFO") -> dict:
        subject = f"[{level}] {title}"
        return self.send(to, subject, message)
