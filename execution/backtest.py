from __future__ import annotations

from datetime import datetime
from typing import Optional

from core.enums import OrderSide
from core.types import Fill, Order, PortfolioState, Position

from .interfaces import ExecutionProvider


def apply_fill_to_portfolio(fill: Fill, portfolio: PortfolioState):
    pos = portfolio.positions.get(fill.symbol)
    qty = fill.quantity
    cost = fill.price * qty
    comm = fill.commission or 0.0

    if fill.side == OrderSide.BUY:
        portfolio.cash -= cost + comm
        if pos:
            total_qty = pos.quantity + qty
            total_cost = pos.entry_price * pos.quantity + cost + comm
            pos.quantity = total_qty
            pos.entry_price = total_cost / total_qty if total_qty > 0 else 0.0
        else:
            portfolio.positions[fill.symbol] = Position(
                symbol=fill.symbol, quantity=qty, side=OrderSide.BUY,
                entry_price=fill.price, current_price=fill.price,
            )
    elif fill.side == OrderSide.SELL:
        portfolio.cash += cost - comm
        if pos:
            pos.quantity -= qty
            realized = qty * (fill.price - pos.entry_price) - comm
            pos.realized_pnl += realized
            if pos.quantity <= 0:
                del portfolio.positions[fill.symbol]
    elif fill.side == OrderSide.SHORT:
        portfolio.cash += cost - comm
        if pos:
            total_qty = pos.quantity + qty
            total_cost = pos.entry_price * pos.quantity + fill.price * qty + comm
            pos.quantity = total_qty
            pos.entry_price = total_cost / total_qty if total_qty > 0 else 0.0
        else:
            portfolio.positions[fill.symbol] = Position(
                symbol=fill.symbol, quantity=qty, side=OrderSide.SHORT,
                entry_price=fill.price, current_price=fill.price,
            )
    elif fill.side == OrderSide.COVER:
        portfolio.cash -= cost + comm
        if pos:
            pos.quantity -= qty
            realized = qty * (pos.entry_price - fill.price) - comm
            pos.realized_pnl += realized
            if pos.quantity <= 0:
                del portfolio.positions[fill.symbol]

    portfolio.total_value = portfolio.cash + sum(
        p.market_value for p in portfolio.positions.values()
    )


class BacktestExecutor(ExecutionProvider):
    def __init__(self, slippage: float = 0.0, commission: float = 0.0):
        self._open_orders: dict[str, Order] = {}
        self._fills: list[Fill] = []
        self._portfolio = PortfolioState(
            cash=1_000_000.0,
            positions={},
            total_value=1_000_000.0,
        )
        self._slippage = slippage
        self._commission = commission
        self._connected = True
        self._order_counter = 0

    def connect(self) -> bool:
        self._connected = True
        return True

    def submit_order(self, order: Order) -> Optional[Fill]:
        self._order_counter += 1
        order_id = f"BT-{self._order_counter:06d}"
        order.order_id = order_id
        self._open_orders[order_id] = order

        if order.price is None or order.price <= 0:
            raise ValueError(f"Cannot submit order for {order.symbol} without a valid price")
        price = order.price
        if self._slippage > 0:
            if order.side in (OrderSide.BUY, OrderSide.COVER):
                price = price * (1 + self._slippage)
            else:
                price = price * (1 - self._slippage)

        comm = price * order.quantity * self._commission

        fill = Fill(
            order_id=order_id,
            symbol=order.symbol,
            side=order.side,
            quantity=int(order.quantity),
            price=price,
            commission=comm,
            timestamp=datetime.utcnow(),
        )
        self._fills.append(fill)
        apply_fill_to_portfolio(fill, self._portfolio)
        del self._open_orders[order_id]
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

    def reset(self, cash: float = 1_000_000.0):
        self._open_orders.clear()
        self._fills.clear()
        self._portfolio = PortfolioState(cash=cash, positions={}, total_value=cash)
        self._order_counter = 0
