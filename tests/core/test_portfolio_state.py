from __future__ import annotations

from core.enums import OrderSide
from core.types import PortfolioState, Position


def test_portfolio_copy_creates_independent():
    p1 = PortfolioState(
        cash=100000.0,
        positions={
            "AAPL": Position("AAPL", 100, OrderSide.BUY, 150.0, 155.0),
        },
        total_value=115500.0,
    )
    p2 = p1.copy()
    p2.cash = 50000.0
    assert p1.cash == 100000.0


def test_portfolio_copy_increments_version():
    p1 = PortfolioState(cash=100000.0, positions={}, total_value=100000.0)
    p2 = p1.copy()
    p3 = p2.copy()
    assert p1.version == 0
    assert p2.version == 1
    assert p3.version == 2


def test_portfolio_copy_deep_copies_positions():
    p1 = PortfolioState(
        cash=100000.0,
        positions={
            "AAPL": Position("AAPL", 100, OrderSide.BUY, 150.0, 155.0),
        },
        total_value=115500.0,
    )
    p2 = p1.copy()
    p2.positions["AAPL"].quantity = 50
    assert p1.positions["AAPL"].quantity == 100


def test_with_update_returns_new_instance():
    p1 = PortfolioState(cash=100000.0, positions={}, total_value=100000.0)
    p2 = p1.with_update(cash=50000.0, total_value=50000.0)
    assert p1.cash == 100000.0
    assert p2.cash == 50000.0
    assert p2.version == 1


def test_exposure_properties():
    from core.enums import OrderSide
    p = PortfolioState(
        cash=50000.0,
        positions={
            "LONG": Position("LONG", 100, OrderSide.BUY, 100.0, 110.0),
            "SHORT": Position("SHORT", 50, OrderSide.SHORT, 200.0, 190.0),
        },
        total_value=50000.0,
    )
    assert p.long_exposure == 11000.0
    assert p.short_exposure == 9500.0
    assert p.gross_exposure == 20500.0
    assert p.net_exposure == 1500.0
