from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from core.enums import OrderSide, OrderType
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
        self._bracket_children: dict[str, list[Order]] = {}
        self._oco_groups: dict[str, list[str]] = {}

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

        # Validate buying power
        # Validate bracket properties
        if order.bracket_take_profit is not None and order.bracket_take_profit <= 0:
            raise ValueError("bracket_take_profit must be positive")
        if order.bracket_stop_loss is not None and order.bracket_stop_loss <= 0:
            raise ValueError("bracket_stop_loss must be positive")

        order_value = price * order.quantity
        if order.side in (OrderSide.BUY, OrderSide.COVER) and order_value > self._portfolio.cash:
            raise ValueError(
                f"Order value {order_value:.2f} exceeds buying power {self._portfolio.cash:.2f}"
            )

        comm = price * order.quantity * self._commission

        fill = Fill(
            order_id=order_id,
            symbol=order.symbol,
            side=order.side,
            quantity=int(order.quantity),
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
        self._bracket_children[parent_id] = children

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
        oco_id = f"BT-{self._order_counter:06d}"
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
        if order_id in self._bracket_children:
            del self._bracket_children[order_id]
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

    def reset(self, cash: float = 1_000_000.0):
        self._open_orders.clear()
        self._fills.clear()
        self._portfolio = PortfolioState(cash=cash, positions={}, total_value=cash)
        self._order_counter = 0
        self._bracket_children.clear()
        self._oco_groups.clear()

    def update_prices(self, prices: dict[str, float]):
        for symbol, price in prices.items():
            pos = self._portfolio.positions.get(symbol)
            if pos:
                pos.update_price(price)

        filled_parent_ids = []
        for parent_id, children in list(self._bracket_children.items()):
            symbol = None
            for child in children:
                symbol = child.symbol
                break
            if not symbol or symbol not in prices:
                continue
            current_price = prices[symbol]

            triggered_child = None
            for child in children:
                if child.order_type == OrderType.LIMIT:
                    if child.side == OrderSide.SELL and current_price >= child.price:
                        triggered_child = child
                        break
                    elif child.side == OrderSide.COVER and current_price <= child.price:
                        triggered_child = child
                        break
                elif child.order_type == OrderType.STOP:
                    if child.side == OrderSide.SELL and current_price <= child.stop_price:
                        triggered_child = child
                        break
                    elif child.side == OrderSide.COVER and current_price >= child.stop_price:
                        triggered_child = child
                        break

            if triggered_child:
                try:
                    self.submit_order(triggered_child)
                    filled_parent_ids.append(parent_id)
                except Exception:
                    pass

        for parent_id in filled_parent_ids:
            if parent_id in self._bracket_children:
                del self._bracket_children[parent_id]
