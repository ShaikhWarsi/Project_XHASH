from __future__ import annotations

from datetime import datetime
from typing import Optional

from core.enums import OrderSide, OrderType
from core.types import Fill, Order, PortfolioState

from .backtest import apply_fill_to_portfolio
from .interfaces import ExecutionProvider


class PaperTradingExecutor(ExecutionProvider):
    def __init__(self, initial_cash: float = 1_000_000.0, slippage: float = 0.001):
        self._open_orders: dict[str, Order] = {}
        self._fills: list[Fill] = []
        self._portfolio = PortfolioState(
            cash=initial_cash,
            positions={},
            total_value=initial_cash,
        )
        self._slippage = slippage
        self._connected = True
        self._order_counter = 0

    def connect(self) -> bool:
        self._connected = True
        return True

    def submit_order(self, order: Order) -> Optional[Fill]:
        if not self._connected:
            return None

        self._order_counter += 1
        order_id = f"PP-{self._order_counter:06d}"
        order.order_id = order_id

        if order.price is None or order.price <= 0:
            raise ValueError(f"Cannot submit order for {order.symbol} without a valid price")
        price = order.price
        if order.order_type == OrderType.MARKET:
            price = price * (1 + self._slippage) if order.side in (OrderSide.BUY, OrderSide.COVER) else price * (1 - self._slippage)

        fill = Fill(
            order_id=order_id,
            symbol=order.symbol,
            side=order.side,
            quantity=int(order.quantity),
            price=price,
            timestamp=datetime.utcnow(),
        )
        self._fills.append(fill)
        apply_fill_to_portfolio(fill, self._portfolio)
        return fill

    def cancel_order(self, order_id: str) -> bool:
        return self._open_orders.pop(order_id, None) is not None

    def get_open_orders(self) -> list[Order]:
        return list(self._open_orders.values())

    def get_portfolio(self) -> PortfolioState:
        return self._portfolio

    @property
    def is_connected(self) -> bool:
        return self._connected

    def disconnect(self):
        self._connected = False

    def update_prices(self, prices: dict[str, float]):
        for symbol, price in prices.items():
            pos = self._portfolio.positions.get(symbol)
            if pos:
                pos.update_price(price)
        self._portfolio.total_value = self._portfolio.cash + sum(
            p.market_value for p in self._portfolio.positions.values()
        )
