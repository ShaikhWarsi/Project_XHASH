from __future__ import annotations

import itertools
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Optional

from core.enums import OrderSide, OrderType
from core.errors import ExecutionError
from core.types import Fill, Order, PortfolioState, Position
from execution.interfaces import ExecutionProvider

log = logging.getLogger(__name__)

_SIDE_MAP = {
    OrderSide.BUY: "BUY",
    OrderSide.SELL: "SELL",
    OrderSide.SHORT: "SELL",
    OrderSide.COVER: "BUY",
}
_TYPE_MAP = {
    OrderType.MARKET: "MKT",
    OrderType.LIMIT: "LMT",
    OrderType.STOP: "STP",
    OrderType.STOP_LIMIT: "STP LMT",
}


class IBKRBroker(ExecutionProvider):
    def __init__(self, host: str = "127.0.0.1", port: int = 7497, client_id: int = 1, sec_type: str = "STK"):
        self._host = host
        self._port = port
        self._client_id = client_id
        self._sec_type = sec_type
        self._app = None
        self._wrapper = None
        self._connected = False
        self._broker_order_id = 0
        self._next_id = itertools.count(1)

    def connect(self) -> bool:
        try:
            from ibapi.client import EClient
            from ibapi.wrapper import EWrapper
        except ImportError:
            raise ExecutionError("ibapi not installed: pip install ibapi")

        class _IBWrapper(EWrapper):
            def __init__(self):
                super().__init__()
                self.connected = False
                self.latest_valid_id = 0
                self.positions: dict[str, Position] = {}
                self.cash = 0.0
                self.total_value = 0.0
                self.positions_received = threading.Event()
                self.account_summary_received = threading.Event()

            def nextValidId(self, orderId: int):
                self.latest_valid_id = orderId
                self.connected = True

            def position(self, account, contract, position, avgCost):
                symbol = contract.symbol
                self.positions[symbol] = Position(
                    symbol=symbol,
                    quantity=float(position),
                    avg_price=float(avgCost),
                    current_price=float(avgCost),
                )

            def positionEnd(self):
                self.positions_received.set()

            def accountSummary(self, reqId, account, tag, value, currency):
                if tag == "TotalCashValue":
                    self.cash = float(value)
                elif tag == "NetLiquidation":
                    self.total_value = float(value)

            def accountSummaryEnd(self, reqId):
                self.account_summary_received.set()

        class _IBClient(EClient):
            def __init__(self, wrapper):
                super().__init__(wrapper)

        wrapper = _IBWrapper()
        self._wrapper = wrapper
        self._app = _IBClient(wrapper)
        self._app.connect(self._host, self._port, self._client_id)

        thread = threading.Thread(target=self._app.run, daemon=True)
        thread.start()
        timeout = 10.0
        interval = 0.1
        elapsed = 0.0
        while elapsed < timeout and not wrapper.connected:
            time.sleep(interval)
            elapsed += interval

        self._connected = wrapper.connected
        if self._connected:
            self._broker_order_id = wrapper.latest_valid_id
            self._next_id = itertools.count(self._broker_order_id + 1)
        else:
            self._app.disconnect()
            self._app = None
        return self._connected

    @property
    def is_connected(self) -> bool:
        return self._connected

    def disconnect(self):
        if self._app and self._connected:
            self._app.disconnect()
            self._connected = False
            self._app = None

    def _place_bracket(self, order: Order, contract, ib_order, order_id: int) -> Fill:
        tp_price = order.bracket_take_profit
        sl_price = order.bracket_stop_loss

        if sl_price:
            sl = ib_order.__class__()
            sl.action = "SELL" if order.side in (OrderSide.BUY, OrderSide.COVER) else "BUY"
            sl.orderType = "STP"
            sl.auxPrice = str(sl_price)
            sl.totalQuantity = abs(order.quantity)
            sl.parentId = order_id
            self._app.placeOrder(next(self._next_id), contract, sl)

        if tp_price:
            tp = ib_order.__class__()
            tp.action = "SELL" if order.side in (OrderSide.BUY, OrderSide.COVER) else "BUY"
            tp.orderType = "LMT"
            tp.lmtPrice = str(tp_price)
            tp.totalQuantity = abs(order.quantity)
            tp.parentId = order_id
            self._app.placeOrder(next(self._next_id), contract, tp)

    def submit_order(self, order: Order) -> Optional[Fill]:
        if not self._connected or self._app is None:
            return None
        try:
            from ibapi.contract import Contract
            from ibapi.order import Order as IBOrder

            contract = Contract()
            contract.symbol = order.symbol
            contract.secType = self._sec_type
            contract.exchange = "SMART"
            contract.currency = "USD"

            ib_order = IBOrder()
            ib_order.action = _SIDE_MAP.get(order.side, "BUY")
            ib_order.totalQuantity = abs(order.quantity)
            ib_order.orderType = _TYPE_MAP.get(order.order_type, "MKT")

            if order.price:
                ib_order.lmtPrice = str(order.price)
            if order.stop_price:
                ib_order.auxPrice = str(order.stop_price)

            order_id = next(self._next_id)
            self._app.placeOrder(order_id, contract, ib_order)

            if order.bracket_take_profit or order.bracket_stop_loss:
                self._place_bracket(order, contract, ib_order, order_id)

            return Fill(order_id=str(order_id), symbol=order.symbol, side=order.side, quantity=abs(order.quantity), price=order.price or 0.0, timestamp=datetime.now(timezone.utc))
        except Exception as e:
            log.error("IBKR submit_order failed: %s", e)
            return None

    def cancel_order(self, order_id: str) -> bool:
        try:
            self._app.cancelOrder(int(order_id))
            return True
        except Exception as e:
            log.error("IBKR cancel_order failed: %s", e)
            return False

    def get_open_orders(self) -> list[Order]:
        log.warning("IBKR get_open_orders not fully implemented")
        return []

    def get_portfolio(self) -> PortfolioState:
        if not self._connected or self._app is None:
            return PortfolioState(cash=0.0, positions={}, total_value=0.0)
        try:
            wrapper = self._wrapper
            wrapper.positions.clear()
            wrapper.cash = 0.0
            wrapper.total_value = 0.0
            wrapper.positions_received.clear()
            wrapper.account_summary_received.clear()

            self._app.reqAccountSummary(9001, "All", "$Ledger:ALL")
            self._app.reqPositions()

            wrapper.account_summary_received.wait(timeout=5.0)
            wrapper.positions_received.wait(timeout=5.0)

            return PortfolioState(
                cash=wrapper.cash,
                positions=wrapper.positions,
                total_value=wrapper.total_value,
            )
        except Exception as e:
            log.warning("IBKR get_portfolio failed: %s", e)
            return PortfolioState(cash=0.0, positions={}, total_value=0.0)
