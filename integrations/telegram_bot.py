from __future__ import annotations

import logging
from typing import Optional

import requests

from core.errors import IntegrationError

log = logging.getLogger(__name__)


class TelegramNotifier:
    BASE_URL = "https://api.telegram.org/bot"

    def __init__(self, bot_token: str, chat_id: str, timeout: int = 15):
        self._token = bot_token
        self._chat_id = chat_id
        self._timeout = timeout

    def _url(self, method: str) -> str:
        return f"{self.BASE_URL}{self._token}/{method.lstrip('/')}"

    def send_message(self, text: str, parse_mode: str = "Markdown") -> dict:
        resp = requests.post(
            self._url("sendMessage"),
            json={"chat_id": self._chat_id, "text": text, "parse_mode": parse_mode},
            timeout=self._timeout,
        )
        if not resp.ok:
            raise IntegrationError(f"Telegram send error: {resp.status_code} {resp.text}")
        return resp.json()

    def send_photo(self, photo_url: str, caption: Optional[str] = None) -> dict:
        payload = {"chat_id": self._chat_id, "photo": photo_url}
        if caption:
            payload["caption"] = caption
        resp = requests.post(self._url("sendPhoto"), json=payload, timeout=self._timeout)
        if not resp.ok:
            raise IntegrationError(f"Telegram photo error: {resp.status_code} {resp.text}")
        return resp.json()

    def send_document(self, document_url: str, caption: Optional[str] = None) -> dict:
        payload = {"chat_id": self._chat_id, "document": document_url}
        if caption:
            payload["caption"] = caption
        resp = requests.post(self._url("sendDocument"), json=payload, timeout=self._timeout)
        if not resp.ok:
            raise IntegrationError(f"Telegram document error: {resp.status_code} {resp.text}")
        return resp.json()

    def notify_trade(self, symbol: str, side: str, quantity: float, price: float) -> dict:
        text = (
            f"*Trade Executed*\\n"
            f"Symbol: `{symbol}`\\n"
            f"Side: {side}\\n"
            f"Qty: {quantity:.4f}\\n"
            f"Price: ${price:.2f}\\n"
            f"Time: {__import__('datetime').datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC"
        )
        return self.send_message(text)

    def notify_alert(self, title: str, message: str, level: str = "INFO") -> dict:
        emoji = {"INFO": "ℹ️", "WARN": "⚠️", "ERROR": "🚨", "CRITICAL": "🔥"}
        text = f"{emoji.get(level, 'ℹ️')} *{title}*\\n\\n{message}"
        return self.send_message(text)
