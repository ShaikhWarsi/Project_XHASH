from __future__ import annotations

from core.enums import OrderSide, OrderType
from core.types import Order, PortfolioState, Position, RiskLimits
from risk.limits import PositionLimits


def test_max_positions_enforced():
    limits = RiskLimits(max_positions=2)
    pl = PositionLimits(limits)
    portfolio = PortfolioState(
        cash=100000.0,
        positions={
            "AAPL": Position("AAPL", 100, OrderSide.BUY, 150.0, 155.0),
            "GOOG": Position("GOOG", 50, OrderSide.BUY, 2000.0, 2100.0),
        },
        total_value=300000.0,
    )
    order = Order("MSFT", OrderSide.BUY, 10, price=400.0, order_type=OrderType.MARKET)
    passed, msg = pl.check(order, portfolio, 400.0)
    assert not passed
    assert "max_positions" in msg or "Active positions" in msg


def test_max_positions_allows_existing_symbol():
    portfolio = PortfolioState(
        cash=100000.0,
        positions={
            "AAPL": Position("AAPL", 100, OrderSide.BUY, 150.0, 155.0),
            "GOOG": Position("GOOG", 50, OrderSide.BUY, 2000.0, 2100.0),
        },
        total_value=300000.0,
    )
    limits = RiskLimits(max_positions=2)
    pl = PositionLimits(limits)
    order = Order("AAPL", OrderSide.BUY, 10, price=155.0, order_type=OrderType.MARKET)
    passed, msg = pl.check(order, portfolio, 155.0)
    assert passed, msg


def test_concentration_breach():
    portfolio = PortfolioState(cash=10000.0, positions={}, total_value=10000.0)
    limits = RiskLimits(max_concentration_pct=0.25)
    pl = PositionLimits(limits)
    order = Order("AAPL", OrderSide.BUY, 100, price=100.0, order_type=OrderType.MARKET)
    passed, msg = pl.check(order, portfolio, 100.0)
    assert not passed
    assert "Concentration" in msg


def test_leverage_breach():
    portfolio = PortfolioState(
        cash=50000.0,
        positions={
            "AAPL": Position("AAPL", 1000, OrderSide.BUY, 150.0, 155.0),
        },
        total_value=205000.0,
    )
    limits = RiskLimits(max_leverage=1.5, max_concentration_pct=1.0, max_position_size_pct=1.0)
    pl = PositionLimits(limits)
    order = Order("GOOG", OrderSide.BUY, 100, price=2000.0, order_type=OrderType.MARKET)
    passed, msg = pl.check(order, portfolio, 2000.0)
    assert not passed
    assert "Leverage" in msg


def test_no_value_portfolio():
    portfolio = PortfolioState(cash=0.0, positions={}, total_value=0.0)
    pl = PositionLimits(RiskLimits())
    order = Order("AAPL", OrderSide.BUY, 1, price=100.0, order_type=OrderType.MARKET)
    passed, msg = pl.check(order, portfolio, 100.0)
    assert not passed
