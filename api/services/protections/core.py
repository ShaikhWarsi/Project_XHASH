from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ProtectionContext:
    initial_capital: float
    current_equity: float
    peak_equity: float
    total_trades: int
    consecutive_losses: int
    current_drawdown_pct: float
    daily_returns: list[float]
    timestamps: list[datetime]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ProtectionResult:
    passed: bool
    reason: str = ""
    cooldown_bars: int = 0


class ProtectionBase(ABC):
    name: str = "base"
    description: str = ""

    @abstractmethod
    def check(self, ctx: ProtectionContext) -> ProtectionResult:
        ...


class MaxDrawdownGuard(ProtectionBase):
    name = "max_drawdown"
    description = "Stops trading if drawdown exceeds threshold"

    def __init__(self, max_drawdown_pct: float = 25.0, cooldown_bars: int = 20):
        self.max_drawdown_pct = max_drawdown_pct
        self.cooldown_bars = cooldown_bars

    def check(self, ctx: ProtectionContext) -> ProtectionResult:
        if ctx.current_drawdown_pct >= self.max_drawdown_pct:
            return ProtectionResult(
                passed=False,
                reason=f"Drawdown {ctx.current_drawdown_pct:.1f}% >= {self.max_drawdown_pct}% threshold",
                cooldown_bars=self.cooldown_bars,
            )
        return ProtectionResult(passed=True)


class CooldownPeriod(ProtectionBase):
    name = "cooldown"
    description = "Pauses trading after N consecutive losses"

    def __init__(self, max_consecutive_losses: int = 5, cooldown_bars: int = 10):
        self.max_consecutive_losses = max_consecutive_losses
        self.cooldown_bars = cooldown_bars

    def check(self, ctx: ProtectionContext) -> ProtectionResult:
        if ctx.consecutive_losses >= self.max_consecutive_losses:
            return ProtectionResult(
                passed=False,
                reason=f"{ctx.consecutive_losses} consecutive losses >= {self.max_consecutive_losses} limit",
                cooldown_bars=self.cooldown_bars,
            )
        return ProtectionResult(passed=True)


class MaxDailyLoss(ProtectionBase):
    name = "max_daily_loss"
    description = "Stops trading if daily loss exceeds threshold"

    def __init__(self, max_daily_loss_pct: float = 5.0, cooldown_bars: int = 5):
        self.max_daily_loss_pct = max_daily_loss_pct
        self.cooldown_bars = cooldown_bars

    def check(self, ctx: ProtectionContext) -> ProtectionResult:
        if ctx.daily_returns and len(ctx.daily_returns) > 0:
            latest = ctx.daily_returns[-1]
            if latest < -self.max_daily_loss_pct / 100:
                return ProtectionResult(
                    passed=False,
                    reason=f"Daily loss {latest*100:.1f}% >= {self.max_daily_loss_pct}% threshold",
                    cooldown_bars=self.cooldown_bars,
                )
        return ProtectionResult(passed=True)


class MinTradesGuard(ProtectionBase):
    name = "min_trades"
    description = "Requires minimum trades before allowing trading"

    def __init__(self, min_trades: int = 3):
        self.min_trades = min_trades

    def check(self, ctx: ProtectionContext) -> ProtectionResult:
        if ctx.total_trades < self.min_trades:
            return ProtectionResult(
                passed=False,
                reason=f"Only {ctx.total_trades} trades < {self.min_trades} minimum",
            )
        return ProtectionResult(passed=True)


REGISTRY: dict[str, type[ProtectionBase]] = {
    "max_drawdown": MaxDrawdownGuard,
    "cooldown": CooldownPeriod,
    "max_daily_loss": MaxDailyLoss,
    "min_trades": MinTradesGuard,
}


def check_all(protections: list[ProtectionBase], ctx: ProtectionContext) -> list[ProtectionResult]:
    results = []
    for p in protections:
        try:
            results.append(p.check(ctx))
        except Exception as e:
            results.append(ProtectionResult(passed=False, reason=f"Error in {p.name}: {e}"))
    return results
