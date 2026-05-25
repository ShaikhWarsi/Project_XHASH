from __future__ import annotations

import json
import logging
from typing import Optional

import requests

from core.errors import IntegrationError

log = logging.getLogger(__name__)


class SlackNotifier:
    BASE_URL = "https://slack.com/api"

    def __init__(self, bot_token: str, default_channel: str = "#trading", timeout: int = 15):
        self._token = bot_token
        self._default_channel = default_channel
        self._timeout = timeout
        self._headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

    def _post(self, path: str, payload: dict) -> dict:
        resp = requests.post(
            f"{self.BASE_URL}/{path.lstrip('/')}",
            headers=self._headers,
            json=payload,
            timeout=self._timeout,
        )
        data = resp.json()
        if not data.get("ok"):
            raise IntegrationError(f"Slack API error: {data.get('error', 'unknown')}")
        return data

    def send_message(self, text: str, channel: Optional[str] = None) -> dict:
        return self._post("chat.postMessage", {
            "channel": channel or self._default_channel,
            "text": text,
            "mrkdwn": True,
        })

    def send_blocks(self, blocks: list[dict], channel: Optional[str] = None) -> dict:
        return self._post("chat.postMessage", {
            "channel": channel or self._default_channel,
            "blocks": blocks,
            "mrkdwn": True,
        })

    def notify_trade(self, symbol: str, side: str, quantity: float, price: float) -> dict:
        blocks = [
            {"type": "header", "text": {"type": "plain_text", "text": "📊 Trade Executed"}},
            {"type": "section", "fields": [
                {"type": "mrkdwn", "text": f"*Symbol:* {symbol}"},
                {"type": "mrkdwn", "text": f"*Side:* {side}"},
                {"type": "mrkdwn", "text": f"*Qty:* {quantity:.4f}"},
                {"type": "mrkdwn", "text": f"*Price:* ${price:.2f}"},
            ]},
        ]
        return self.send_blocks(blocks)

    def notify_alert(self, title: str, message: str, level: str = "INFO") -> dict:
        emoji = {"INFO": "ℹ️", "WARN": "⚠️", "ERROR": "🚨", "CRITICAL": "🔥"}
        blocks = [
            {"type": "header", "text": {"type": "plain_text", "text": f"{emoji.get(level, 'ℹ️')} {title}"}},
            {"type": "section", "text": {"type": "mrkdwn", "text": message}},
        ]
        return self.send_blocks(blocks)
