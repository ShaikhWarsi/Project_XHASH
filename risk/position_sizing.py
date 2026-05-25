from __future__ import annotations

from core.types import Order, PortfolioState, RiskLimits


class PositionSizer:
    """Position sizing strategies (fixed, kelly, volatility-adjusted)."""

    def __init__(self, limits: RiskLimits):
        self.limits = limits

    def check(self, order: Order, portfolio: PortfolioState, price: float) -> tuple[bool, str]:
        if portfolio.total_value <= 0:
            return False, "Portfolio has no value"

        order_value = order.quantity * price
        pct = order_value / portfolio.total_value

        if pct > self.limits.max_position_size_pct:
            return False, f"Position size {pct:.1%} > {self.limits.max_position_size_pct:.1%}"

        return True, ""

    def kelly_size(self, win_rate: float, avg_win: float, avg_loss: float, fraction: float = 0.25) -> float:
        if avg_loss <= 0:
            return fraction
        b = avg_win / avg_loss
        p = win_rate
        q = 1.0 - p
        kelly = (p * b - q) / b if b > 0 else 0.0
        return max(0.0, kelly * fraction)

    def volatility_size(self, base_pct: float, atr: float, price: float, target_risk: float = 0.01) -> float:
        if price <= 0 or atr <= 0:
            return base_pct
        vol_pct = atr / price
        if vol_pct <= 0:
            return base_pct
        return min(base_pct, target_risk / vol_pct)
