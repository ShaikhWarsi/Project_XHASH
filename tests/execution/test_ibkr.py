from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from execution.live.ibkr import IBKRBroker


@pytest.fixture
def ibkr_broker():
    return IBKRBroker(host="127.0.0.1", port=7497, client_id=1)


def test_is_connected(ibkr_broker):
    assert ibkr_broker.is_connected is False


def test_get_open_orders_empty(ibkr_broker):
    orders = ibkr_broker.get_open_orders()
    assert orders == []


def test_connect_raises_without_ibapi(ibkr_broker):
    from core.errors import ExecutionError
    with pytest.raises(ExecutionError):
        ibkr_broker.connect()


def test_submit_order_returns_none_when_disconnected(ibkr_broker):
    from core.enums import OrderSide, OrderType
    from core.types import Order
    order = Order(symbol="AAPL", side=OrderSide.BUY, quantity=10, order_type=OrderType.MARKET)
    fill = ibkr_broker.submit_order(order)
    assert fill is None


def test_get_portfolio_returns_empty(ibkr_broker):
    state = ibkr_broker.get_portfolio()
    assert state.total_value == 0.0
    assert state.positions == {}
