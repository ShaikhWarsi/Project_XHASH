from __future__ import annotations

import logging
import threading
import time
from datetime import datetime
from typing import Optional

from core.enums import OrderSide, OrderType
from core.errors import ExecutionError
from core.types import Fill, Order, PortfolioState, Position
from execution.interfaces import ExecutionProvider

log = logging.getLogger(__name__)


class IBKRBroker(ExecutionProvider):
    def __init__(self, host: str = "127.0.0.1", port: int = 7497, client_id: int = 1):
        self._host = host
        self._port = port
        self._client_id = client_id
        self._app = None
        self._connected = False

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

            def nextValidId(self, orderId: int):
                self.connected = True

        class _IBClient(EClient):
            def __init__(self, wrapper):
                super().__init__(wrapper)

        wrapper = _IBWrapper()
        self._app = _IBClient(wrapper)
        self._app.connect(self._host, self._port, self._client_id)

        thread = threading.Thread(target=self._app.run, daemon=True)
        thread.start()
        time.sleep(1.5)

        self._connected = wrapper.connected
        return self._connected

    @property
    def is_connected(self) -> bool:
        return self._connected

    def disconnect(self):
        if self._app and self._connected:
            self._app.disconnect()
            self._connected = False

    def submit_order(self, order: Order) -> Optional[Fill]:
        if not self._connected or self._app is None:
            return None
        try:
            from ibapi.contract import Contract
            from ibapi.order import Order as IBOrder

            contract = Contract()
            contract.symbol = order.symbol
            contract.secType = "STK"
            contract.exchange = "SMART"
            contract.currency = "USD"

            ib_order = IBOrder()
            ib_order.action = "BUY" if order.side in (OrderSide.BUY, OrderSide.COVER) else "SELL"
            ib_order.totalQuantity = abs(order.quantity)
            ib_order.orderType = {OrderType.MARKET: "MKT", OrderType.LIMIT: "LMT", OrderType.STOP: "STP"}.get(order.order_type, "MKT")

            if order.price:
                ib_order.lmtPrice = str(order.price)
            if order.stop_price:
                ib_order.auxPrice = str(order.stop_price)

            order_id = int(time.time() * 1000) % 1000000
            self._app.placeOrder(order_id, contract, ib_order)
            return Fill(order_id=str(order_id), symbol=order.symbol, quantity=abs(order.quantity), price=order.price or 0.0, timestamp=datetime.utcnow())
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
        return PortfolioState(
            cash=0.0,
            positions={},
            total_value=0.0,
        )
