from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from core.enums import OrderSide, OrderType
from core.types import Fill, Order, PortfolioState

from .backtest import apply_fill_to_portfolio
from .interfaces import ExecutionProvider


class PaperTradingExecutor(ExecutionProvider):
    def __init__(self, initial_cash: float = 1_000_000.0, slippage: float = 0.001, commission: float = 0.0):
        self._open_orders: dict[str, Order] = {}
        self._fills: list[Fill] = []
        self._portfolio = PortfolioState(
            cash=initial_cash,
            positions={},
            total_value=initial_cash,
        )
        self._slippage = slippage
        self._commission = commission
        self._connected = True
        self._order_counter = 0
        self._oco_groups: dict[str, list[str]] = {}

    def connect(self) -> bool:
        self._connected = True
        return True

    def submit_order(self, order: Order) -> Optional[Fill]:
        if not self._connected:
            return None

        self._order_counter += 1
        order_id = f"PP-{self._order_counter:06d}"
        order.order_id = order_id
        self._open_orders[order_id] = order

        if order.order_type in (OrderType.LIMIT, OrderType.STOP_LIMIT) and (order.price is None or order.price <= 0):
            raise ValueError(f"Cannot submit limit order for {order.symbol} without a valid price")
        price = order.price or 0.0
        if order.order_type == OrderType.STOP:
            price = order.stop_price or order.price or 0.0
        if order.order_type in (OrderType.MARKET,):
            price = order.price or 0.0
            if price <= 0:
                raise ValueError(f"MARKET order for {order.symbol} requires a price (no last-trade fallback)")
        if order.order_type in (OrderType.MARKET,):
            price = price * (1 + self._slippage) if order.side in (OrderSide.BUY, OrderSide.COVER) else price * (1 - self._slippage)
        elif order.order_type == OrderType.STOP:
            price = price * (1 + self._slippage) if order.side in (OrderSide.BUY, OrderSide.COVER) else price * (1 - self._slippage)

        # Validate buying power
        order_value = price * order.quantity
        if order.side in (OrderSide.BUY, OrderSide.COVER):
            if order_value > self._portfolio.cash:
                raise ValueError(
                    f"Order value {order_value:.2f} exceeds buying power {self._portfolio.cash:.2f}"
                )

        comm = price * order.quantity * self._commission

        fill = Fill(
            order_id=order_id,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            price=price,
            commission=comm,
            timestamp=datetime.now(timezone.utc),
        )
        self._fills.append(fill)
        apply_fill_to_portfolio(fill, self._portfolio)
        del self._open_orders[order_id]

        if order.bracket_take_profit or order.bracket_stop_loss:
            self._create_bracket_orders(order, order_id)
        if order.oco_price or order.oco_stop_price:
            self._create_oco_orders(order, order_id)
        self._cancel_sibling_orders(order_id)

        return fill

    def _create_bracket_orders(self, parent: Order, parent_id: str):
        children: list[Order] = []
        if parent.bracket_take_profit:
            tp_side = OrderSide.SELL if parent.side == OrderSide.BUY else OrderSide.COVER
            tp = Order(
                symbol=parent.symbol,
                side=tp_side,
                quantity=parent.quantity,
                order_type=OrderType.LIMIT,
                price=parent.bracket_take_profit,
                parent_order_id=parent_id,
                reason=f"Bracket TP for {parent_id}",
            )
            children.append(tp)
        if parent.bracket_stop_loss:
            sl_side = OrderSide.SELL if parent.side == OrderSide.BUY else OrderSide.COVER
            sl = Order(
                symbol=parent.symbol,
                side=sl_side,
                quantity=parent.quantity,
                order_type=OrderType.STOP,
                stop_price=parent.bracket_stop_loss,
                parent_order_id=parent_id,
                reason=f"Bracket SL for {parent_id}",
            )
            children.append(sl)
        for child in children:
            self._order_counter += 1
            child_id = f"PP-{self._order_counter:06d}"
            child.order_id = child_id
            self._open_orders[child_id] = child

    def _create_oco_orders(self, primary: Order, primary_id: str):
        oco_symbol = primary.oco_symbol or primary.symbol
        oco = Order(
            symbol=oco_symbol,
            side=OrderSide.SELL if primary.side == OrderSide.BUY else OrderSide.BUY,
            quantity=primary.quantity,
            order_type=OrderType.LIMIT if primary.oco_price else OrderType.STOP,
            price=primary.oco_price,
            stop_price=primary.oco_stop_price,
            parent_order_id=primary_id,
            reason=f"OCO sibling for {primary_id}",
        )
        self._order_counter += 1
        oco_id = f"PP-{self._order_counter:06d}"
        oco.order_id = oco_id
        self._open_orders[oco_id] = oco
        self._oco_groups[primary_id] = [primary_id, oco_id]
        self._oco_groups[oco_id] = [primary_id, oco_id]

    def _cancel_sibling_orders(self, filled_id: str):
        oco_ids = self._oco_groups.get(filled_id)
        if oco_ids:
            for oco_id in oco_ids:
                if oco_id != filled_id:
                    self.cancel_order(oco_id)

    def cancel_order(self, order_id: str) -> bool:
        cancelled = self._open_orders.pop(order_id, None) is not None
        if order_id in self._oco_groups:
            del self._oco_groups[order_id]
        return cancelled

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
