from __future__ import annotations

import hmac
import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TradingViewIntegration:
    """TradingView webhook receiver with HMAC verification.

    Parses TradingView alert payloads and converts to Orders.
    """

    def __init__(self, secret: Optional[str] = None):
        if secret:
            self._secret = secret.encode("utf-8")
        else:
            self._secret = None

    def verify_signature(self, payload: bytes, signature: str) -> bool:
        if self._secret is None:
            logger.warning("TradingView webhook secret not configured — rejecting request")
            return False
        expected = hmac.new(self._secret, payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_alert(self, payload: dict) -> Optional[dict]:
        """Parse a TradingView webhook alert into a normalized order dict."""
        symbol = payload.get("ticker") or payload.get("symbol", "")
        action = payload.get("action") or payload.get("side", "")
        quantity = float(payload.get("quantity", payload.get("qty", 0)))
        price = float(payload.get("price", 0.0))

        if not symbol or not action:
            return None

        return {
            "symbol": symbol,
            "action": action.lower(),
            "quantity": quantity,
            "price": price,
        }
