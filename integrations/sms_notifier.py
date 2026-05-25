from __future__ import annotations

import logging
from typing import Optional

import requests

from core.errors import IntegrationError

log = logging.getLogger(__name__)


class SMSNotifier:
    def __init__(
        self,
        provider: str = "twilio",
        account_sid: str = "",
        auth_token: str = "",
        from_number: str = "",
        api_key: str = "",
        api_secret: str = "",
    ):
        self._provider = provider.lower()
        self._account_sid = account_sid
        self._auth_token = auth_token
        self._from_number = from_number
        self._api_key = api_key
        self._api_secret = api_secret

    def send(self, to: str, message: str) -> dict:
        if self._provider == "twilio":
            return self._send_twilio(to, message)
        elif self._provider == "vonage":
            return self._send_vonage(to, message)
        else:
            raise IntegrationError(f"Unknown SMS provider: {self._provider}")

    def _send_twilio(self, to: str, message: str) -> dict:
        try:
            from twilio.rest import Client
        except ImportError:
            raise IntegrationError("twilio not installed: pip install twilio")

        client = Client(self._account_sid, self._auth_token)
        result = client.messages.create(body=message, from_=self._from_number, to=to)
        return {"to": to, "sid": result.sid, "status": result.status, "provider": "twilio"}

    def _send_vonage(self, to: str, message: str) -> dict:
        try:
            from vonage import Auth, Vonage, Sms
        except ImportError:
            raise IntegrationError("vonage not installed: pip install vonage")

        client = Vonage(Auth(api_key=self._api_key, api_secret=self._api_secret))
        sms = Sms(client)
        result = sms.send_message({"from": self._from_number, "to": to, "text": message})
        if result.get("messages", [{}])[0].get("status") != "0":
            raise IntegrationError(f"Vonage SMS failed: {result}")
        return {"to": to, "provider": "vonage", "status": "sent"}

    def notify_trade(self, to: str, symbol: str, side: str, quantity: float, price: float) -> dict:
        text = f"Trade: {side} {symbol} qty={quantity:.4f} @ ${price:.2f}"
        return self.send(to, text)

    def notify_alert(self, to: str, title: str, message: str, level: str = "INFO") -> dict:
        text = f"[{level}] {title}: {message[:140]}"
        return self.send(to, text)
