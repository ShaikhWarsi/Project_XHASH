from __future__ import annotations

import pandas as pd

from core.types import Order, PortfolioState, RiskLimits


class PositionLimits:
    """Per-ticker and aggregate position limits."""

    def __init__(self, limits: RiskLimits):
        self.limits = limits
        self._volatility_adjustments: dict[str, float] = {}

    def check(self, order: Order, portfolio: PortfolioState, price: float) -> tuple[bool, str]:
        if portfolio.total_value <= 0:
            return False, "Portfolio has no value"

        order_value = order.quantity * price

        concentration = order_value / portfolio.total_value
        if concentration > self.limits.max_concentration_pct:
            return False, f"Concentration {concentration:.1%} > limit {self.limits.max_concentration_pct:.1%}"

        current_pos = portfolio.positions.get(order.symbol)
        current_value = abs(current_pos.market_value) if current_pos else 0.0
        new_exposure = current_value + order_value
        new_exposure_pct = new_exposure / portfolio.total_value

        if new_exposure_pct > self.limits.max_position_size_pct:
            return False, f"Exposure {new_exposure_pct:.1%} > limit {self.limits.max_position_size_pct:.1%}"

        total_exposure = portfolio.gross_exposure + order_value
        leverage = total_exposure / portfolio.total_value
        if leverage > self.limits.max_leverage:
            return False, f"Leverage {leverage:.2f}x > limit {self.limits.max_leverage:.2f}x"

        active_positions = len([p for p in portfolio.positions.values() if p.quantity > 0])
        if active_positions >= self.limits.max_positions and order.symbol not in portfolio.positions:
            return False, f"Active positions {active_positions} >= limit {self.limits.max_positions}"

        return True, ""

    def update_volatility(self, prices_df: dict[str, pd.DataFrame]):
        for symbol, df in prices_df.items():
            if len(df) < 20:
                continue
            returns = df["close"].pct_change().dropna()
            vol = float(returns.tail(20).std()) if len(returns) >= 20 else 0.02
            self._volatility_adjustments[symbol] = vol
