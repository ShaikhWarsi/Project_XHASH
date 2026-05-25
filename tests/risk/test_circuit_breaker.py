from __future__ import annotations

from core.types import PortfolioState
from risk.circuit_breakers import CircuitBreaker


class TestCircuitBreaker:
    def test_no_breach(self):
        cb = CircuitBreaker(max_drawdown_pct=0.20, max_daily_loss_pct=0.05)
        p = PortfolioState(cash=100_000.0, positions={}, total_value=100_000.0)
        cb.update(p)
        passed, msg = cb.check(p)
        assert passed
        assert msg == ""

    def test_drawdown_breach(self):
        cb = CircuitBreaker(max_drawdown_pct=0.20)
        p = PortfolioState(cash=100_000.0, positions={}, total_value=100_000.0)
        cb.update(p)
        p.total_value = 70_000.0  # 30% drawdown
        passed, msg = cb.check(p)
        assert not passed
        assert "Drawdown" in msg

    def test_daily_loss_breach(self):
        cb = CircuitBreaker(max_daily_loss_pct=0.05)
        p = PortfolioState(cash=100_000.0, positions={}, total_value=100_000.0)
        cb.update(p)
        cb.reset_daily(p)
        p.total_value = 90_000.0  # 10% daily loss
        passed, msg = cb.check(p)
        assert not passed
        assert "Daily loss" in msg

    def test_reset(self):
        cb = CircuitBreaker()
        p = PortfolioState(cash=100_000.0, positions={}, total_value=100_000.0)
        cb.update(p)
        p.total_value = 50_000.0
        cb.check(p)
        assert cb.trading_halted
        cb.reset()
        assert not cb.trading_halted
        assert cb.breach_reason == ""
