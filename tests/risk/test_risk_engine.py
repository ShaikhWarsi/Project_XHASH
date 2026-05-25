from __future__ import annotations

from core.enums import OrderSide, OrderType
from core.types import Order, PortfolioState, RiskLimits
from risk.engine import RiskEngine


def test_risk_engine_validates_ok(sample_portfolio, sample_order):
    engine = RiskEngine()
    passed, msg = engine.validate_order(sample_order, sample_portfolio, 155.0)
    assert passed, msg


def test_risk_engine_rejects_outside_limits():
    portfolio = PortfolioState(cash=1000.0, positions={}, total_value=1000.0)
    engine = RiskEngine(limits=RiskLimits(max_concentration_pct=0.1))
    order = Order("AAPL", OrderSide.BUY, 100, price=150.0, order_type=OrderType.MARKET)
    passed, msg = engine.validate_order(order, portfolio, 150.0)
    assert not passed


def test_risk_engine_update_does_not_raise(sample_portfolio):
    engine = RiskEngine()
    engine.update(sample_portfolio)
    passed, msg = engine.validate_order(
        Order("AAPL", OrderSide.BUY, 10, price=155.0, order_type=OrderType.MARKET),
        sample_portfolio,
        155.0,
    )
    assert passed, msg


def test_risk_engine_rejects_stopped_symbol(sample_portfolio):
    engine = RiskEngine()
    engine.stop_loss._stop_levels["AAPL"] = 160.0
    order = Order("AAPL", OrderSide.BUY, 10, price=155.0, order_type=OrderType.MARKET)
    passed, msg = engine.validate_order(order, sample_portfolio, 155.0)
    assert not passed
    assert "stop_loss" in msg
