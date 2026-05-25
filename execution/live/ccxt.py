from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from core.enums import OrderSide, OrderType
from core.types import Fill, Order, PortfolioState, Position
from execution.interfaces import ExecutionProvider

logger = logging.getLogger(__name__)


class CCXTExecutor(ExecutionProvider):
    """CCXT-based exchange execution adapter.

    Requires ccxt: pip install ccxt
    """

    def __init__(self, exchange_id: str = "binance", config: Optional[dict] = None):
        self._exchange_id = exchange_id
        self._config = config or {}
        self._exchange = None
        self._connected = False

    def connect(self) -> bool:
        try:
            import ccxt
            exchange_class = getattr(ccxt, self._exchange_id)
            self._exchange = exchange_class(self._config)
            if self._exchange.check_required_credentials():
                self._exchange.load_markets()
                self._connected = True
                return True
            return False
        except Exception as e:
            logger.error("CCXT connect failed: %s", e)
            self._connected = False
            return False

    def submit_order(self, order: Order) -> Optional[Fill]:
        if not self._connected or self._exchange is None:
            return None
        try:
            side = "buy" if order.side in (OrderSide.BUY, OrderSide.COVER) else "sell"
            order_type = "market" if order.order_type == OrderType.MARKET else "limit"

            params = {}
            if order.side == OrderSide.SHORT:
                params["reduceOnly"] = False

            resp = self._exchange.create_order(
                symbol=order.symbol,
                type=order_type,
                side=side,
                amount=order.quantity,
                price=order.price,
                params=params,
            )

            filled_qty = float(resp.get("filled", order.quantity))
            avg_price = float(resp.get("price", order.price or 0.0))

            return Fill(
                order_id=resp.get("id", ""),
                symbol=order.symbol,
                side=order.side,
                quantity=int(filled_qty),
                price=avg_price,
                timestamp=datetime.utcnow(),
            )
        except Exception as e:
            logger.error("CCXT submit_order failed: %s", e)
            return None

    def cancel_order(self, order_id: str) -> bool:
        if not self._connected or self._exchange is None:
            return False
        try:
            self._exchange.cancel_order(order_id)
            return True
        except Exception as e:
            logger.error("CCXT cancel_order failed: %s", e)
            return False

    def get_open_orders(self) -> list[Order]:
        if not self._connected or self._exchange is None:
            return []
        orders = self._exchange.fetch_open_orders()
        result: list[Order] = []
        for o in orders:
            side = OrderSide.BUY if o["side"] == "buy" else OrderSide.SELL
            result.append(Order(
                symbol=o["symbol"],
                side=side,
                quantity=float(o["amount"]),
                price=float(o["price"]) if o["price"] else None,
                order_id=o["id"],
            ))
        return result

    def get_portfolio(self) -> PortfolioState:
        if not self._connected or self._exchange is None:
            return PortfolioState(cash=0.0, positions={}, total_value=0.0)
        balance = self._exchange.fetch_balance()
        total_usd = float(balance.get("total", {}).get("USD", 0.0))
        positions: dict[str, Position] = {}
        for currency, data in balance.get("total", {}).items():
            if currency == "USD" or currency == "USDT":
                continue
            qty = float(data)
            if qty == 0:
                continue
            try:
                ticker = self._exchange.fetch_ticker(f"{currency}/USDT")
                price = float(ticker["last"])
            except Exception as e:
                logger.warning("CCXT fetch_ticker failed for %s: %s", currency, e)
                price = 0.0
            positions[currency] = Position(
                symbol=currency,
                quantity=qty,
                side=OrderSide.BUY,
                entry_price=price,
                current_price=price,
            )
        return PortfolioState(
            cash=total_usd,
            positions=positions,
            total_value=total_usd + sum(p.market_value for p in positions.values()),
        )

    @property
    def is_connected(self) -> bool:
        return self._connected

    def disconnect(self):
        self._connected = False
        if self._exchange:
            self._exchange.close()
            self._exchange = None
