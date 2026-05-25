from __future__ import annotations

from typing import Any, Dict, Optional

from execution.exchanges.base import BaseRestClient, LiveOrderResult


class BybitClient(BaseRestClient):
    def __init__(self, api_key: str = "", api_secret: str = "", config: Optional[Dict] = None):
        self.api_key = api_key
        self.api_secret = api_secret
        self.config = config or {}
        self._ccxt = None

    def _ensure_ccxt(self):
        if self._ccxt is None:
            import ccxt
            self._ccxt = ccxt.bybit({"apiKey": self.api_key, "secret": self.api_secret, "enableRateLimit": True})

    def place_market_order(self, symbol: str, side: str, quantity: float, reduce_only: bool = False, position_side: Optional[str] = None, client_order_id: Optional[str] = None) -> LiveOrderResult:
        self._ensure_ccxt()
        params = {"reduceOnly": reduce_only} if reduce_only else {}
        order = self._ccxt.create_market_order(symbol, side.lower(), quantity, params=params)
        return LiveOrderResult(order_id=str(order.get("id", "")), symbol=symbol, side=side, quantity=quantity, price=float(order.get("price", 0)), status=order.get("status", "filled"), raw=order)

    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        self._ensure_ccxt()
        t = self._ccxt.fetch_ticker(symbol)
        return {"symbol": t.get("symbol"), "last": t.get("last"), "bid": t.get("bid"), "ask": t.get("ask")}

    def get_balance(self) -> Dict[str, Any]:
        self._ensure_ccxt()
        b = self._ccxt.fetch_balance()
        return {"total": b.get("total", {}), "free": b.get("free", {})}
