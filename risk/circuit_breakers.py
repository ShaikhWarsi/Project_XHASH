from __future__ import annotations

from core.types import PortfolioState


class CircuitBreaker:
    def __init__(self, max_daily_loss_pct: float = 0.05, max_drawdown_pct: float = 0.20):
        self.max_daily_loss_pct = max_daily_loss_pct
        self.max_drawdown_pct = max_drawdown_pct
        self.peak_value: float = 0.0
        self.daily_start_value: float = 0.0
        self.trading_halted: bool = False
        self.breach_reason: str = ""

    def check(self, portfolio: PortfolioState) -> tuple[bool, str]:
        if self.trading_halted:
            return False, self.breach_reason

        if self.peak_value > 0:
            drawdown = 1.0 - (portfolio.total_value / self.peak_value)
            if drawdown > self.max_drawdown_pct:
                self.trading_halted = True
                self.breach_reason = f"Drawdown {drawdown:.1%} > {self.max_drawdown_pct:.1%}"
                return False, self.breach_reason

        if self.daily_start_value > 0:
            daily_loss = 1.0 - (portfolio.total_value / self.daily_start_value)
            if daily_loss > self.max_daily_loss_pct:
                self.trading_halted = True
                self.breach_reason = f"Daily loss {daily_loss:.1%} > {self.max_daily_loss_pct:.1%}"
                return False, self.breach_reason

        return True, ""

    def update(self, portfolio: PortfolioState):
        if portfolio.total_value > self.peak_value:
            self.peak_value = portfolio.total_value
        if self.daily_start_value <= 0 or portfolio.total_value > self.daily_start_value:
            self.daily_start_value = portfolio.total_value

    def reset_daily(self, portfolio: PortfolioState):
        self.daily_start_value = portfolio.total_value

    def reset(self):
        self.trading_halted = False
        self.breach_reason = ""
