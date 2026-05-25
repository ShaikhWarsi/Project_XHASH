from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import Order, PortfolioState, RiskLimits

from .circuit_breakers import CircuitBreaker
from .limits import PositionLimits
from .position_sizing import PositionSizer
from .stop_loss import StopLossTracker


class RiskEngine:
    """Central risk management engine.

    Validates orders against all risk constraints before execution.
    """

    def __init__(
        self,
        limits: Optional[RiskLimits] = None,
        position_limits: Optional[PositionLimits] = None,
        stop_loss: Optional[StopLossTracker] = None,
        position_sizer: Optional[PositionSizer] = None,
        circuit_breaker: Optional[CircuitBreaker] = None,
    ):
        self.limits = limits or RiskLimits()
        self.position_limits = position_limits or PositionLimits(self.limits)
        self.stop_loss = stop_loss or StopLossTracker()
        self.position_sizer = position_sizer or PositionSizer(self.limits)
        self.circuit_breaker = circuit_breaker or CircuitBreaker()

    def validate_order(self, order: Order, portfolio: PortfolioState, price: float) -> tuple[bool, str]:
        """Check if an order passes all active risk checks."""
        checks = [
            ("circuit_breaker", self.circuit_breaker.check(portfolio)),
            ("position_limit", self.position_limits.check(order, portfolio, price)),
            ("stop_loss", self.stop_loss.check(order, portfolio, price)),
            ("position_sizing", self.position_sizer.check(order, portfolio, price)),
        ]

        for name, (passed, msg) in checks:
            if not passed:
                return False, f"{name}: {msg}"

        return True, ""

    def update(
        self,
        portfolio: PortfolioState,
        prices_df: Optional[dict[str, pd.DataFrame]] = None,
    ):
        """Update risk state with new portfolio snapshot."""
        self.stop_loss.update(portfolio)
        self.circuit_breaker.update(portfolio)
        if prices_df:
            self.position_limits.update_volatility(prices_df)
