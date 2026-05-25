from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from execution.exchanges.base import BaseRestClient, LiveOrderResult

logger = logging.getLogger(__name__)


class BinanceFuturesClient(BaseRestClient):
    def __init__(self, api_key: str = "", api_secret: str = "", config: Optional[Dict] = None):
        self.api_key = api_key
        self.api_secret = api_secret
        self.config = config or {}
        self._ccxt = None

    def _ensure_ccxt(self):
        if self._ccxt is None:
            import ccxt
            self._ccxt = ccxt.binance({
                "apiKey": self.api_key,
                "secret": self.api_secret,
                "options": {"defaultType": "future"},
                "enableRateLimit": True,
            })

    def place_market_order(
        self, symbol: str, side: str, quantity: float,
        reduce_only: bool = False, position_side: Optional[str] = None,
        client_order_id: Optional[str] = None,
    ) -> LiveOrderResult:
        self._ensure_ccxt()
        params = {}
        if reduce_only:
            params["reduceOnly"] = True
        if position_side:
            params["positionSide"] = position_side.upper()
        if client_order_id:
            params["newClientOrderId"] = client_order_id

        order = self._ccxt.create_market_order(symbol, side.lower(), quantity, params=params)
        return LiveOrderResult(
            order_id=str(order.get("id", "")),
            client_order_id=client_order_id,
            symbol=symbol,
            side=side,
            quantity=float(order.get("amount", quantity)),
            price=float(order.get("price", 0)),
            status=order.get("status", "filled"),
            filled_quantity=float(order.get("filled", quantity)),
            average_fill_price=float(order.get("average", 0)),
            commission=float(order.get("fee", {}).get("cost", 0)),
            raw=order,
        )

    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        self._ensure_ccxt()
        ticker = self._ccxt.fetch_ticker(symbol)
        return {
            "symbol": ticker.get("symbol"),
            "last": ticker.get("last"),
            "bid": ticker.get("bid"),
            "ask": ticker.get("ask"),
            "volume": ticker.get("baseVolume"),
            "change": ticker.get("change"),
            "percentage": ticker.get("percentage"),
        }

    def get_balance(self) -> Dict[str, Any]:
        self._ensure_ccxt()
        balance = self._ccxt.fetch_balance()
        return {"total": balance.get("total", {}), "free": balance.get("free", {})}
