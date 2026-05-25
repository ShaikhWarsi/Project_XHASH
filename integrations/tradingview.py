from __future__ import annotations

from typing import Optional


class TradingViewIntegration:
    """TradingView webhook receiver.

    Parses TradingView alert payloads and converts to Orders.
    """

    def __init__(self, secret: Optional[str] = None):
        self.secret = secret

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
