from __future__ import annotations

import threading
from unittest.mock import MagicMock

import pytest

from api.state import AppState


@pytest.fixture
def state():
    return AppState()


def test_lock_held_during_snapshot(state):
    errors = []

    def writer():
        for i in range(100):
            state.portfolio = MagicMock(total_value=float(i), cash=0.0)
            state.signals = MagicMock(to_dict=lambda: {"i": i})

    def reader():
        for _ in range(100):
            try:
                snap = state.snapshot()
                assert "portfolio" in snap
                assert "signals" in snap
            except Exception as e:
                errors.append(e)

    threads = [threading.Thread(target=writer), threading.Thread(target=reader)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors, f"snapshot raised: {errors}"


def test_concurrent_read_write_trades(state):
    errors = []

    def adder():
        for i in range(100):
            try:
                state.add_trade({"id": i, "symbol": "AAPL"})
            except Exception as e:
                errors.append(e)

    def reader():
        for _ in range(100):
            try:
                _ = state.trades
            except Exception as e:
                errors.append(e)

    threads = [threading.Thread(target=adder), threading.Thread(target=reader)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors, f"concurrent trade access raised: {errors}"
    assert len(state.trades) == 100


def test_open_orders_copy_on_read(state):
    orders = [{"id": 1, "symbol": "AAPL"}]
    state.set_open_orders(orders)
    retrieved = state.open_orders
    retrieved.append({"id": 2})
    assert len(state.open_orders) == 1


def test_portfolio_history_append_on_set(state):
    p1 = MagicMock(total_value=100_000.0, cash=50_000.0)
    p2 = MagicMock(total_value=101_000.0, cash=49_000.0)
    state.portfolio = p1
    state.portfolio = p2
    assert len(state.portfolio_history) == 2


def test_snapshot_returns_copy_not_reference(state):
    state.portfolio = MagicMock(total_value=100_000.0, cash=50_000.0, margin_used=0.0, margin_requirement=0.0, realized_gains=None, positions={})
    state.signals = MagicMock(to_dict=lambda: {})
    snap = state.snapshot()
    snap["portfolio"]["total_value"] = 999.0
    assert state.portfolio.total_value == 100_000.0
