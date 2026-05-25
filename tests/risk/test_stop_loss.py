from __future__ import annotations

from core.enums import OrderSide
from core.types import Order
from risk.stop_loss import StopLossTracker


class TestStopLossTracker:
    def test_atr_computation(self, sample_ohlcv):
        sl = StopLossTracker()
        atr = sl.compute_atr(sample_ohlcv)
        assert atr > 0
        assert isinstance(atr, float)

    def test_no_stop_returns_ok(self):
        sl = StopLossTracker()
        order = Order(symbol="AAPL", side=OrderSide.BUY, quantity=10, price=150.0)
        portfolio = type("obj", (), {"positions": {}})
        passed, msg = sl.check(order, portfolio, 150.0)
        assert passed
