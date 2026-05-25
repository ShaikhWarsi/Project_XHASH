from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from .engine import BacktestResult


@dataclass
class MonteCarloResult:
    simulations: list[BacktestResult] = field(default_factory=list)
    mean_return: float = 0.0
    mean_sharpe: float = 0.0
    mean_max_dd: float = 0.0
    pct_positive: float = 0.0
    var_95: float = 0.0


class MonteCarloEngine:
    """Monte Carlo simulation for backtest significance testing."""

    def __init__(self, n_simulations: int = 1000, seed: Optional[int] = None):
        self.n_simulations = n_simulations
        self.rng = np.random.default_rng(seed)

    def run(
        self,
        base_result: BacktestResult,
        returns: np.ndarray,
    ) -> MonteCarloResult:
        """Run Monte Carlo by shuffling returns."""
        if len(returns) < 2:
            return MonteCarloResult()

        simulations: list[BacktestResult] = []

        for _ in range(self.n_simulations):
            shuffled = self.rng.permutation(returns)
            eq = np.cumprod(1 + shuffled) * base_result.equity_curve[0] if base_result.equity_curve else np.cumprod(1 + shuffled) * 1_000_000

            total_return = (eq[-1] / eq[0]) - 1 if eq[0] > 0 else 0.0
            n_years = len(shuffled) / 252
            ann_return = (1 + total_return) ** (1 / max(n_years, 0.01)) - 1 if n_years > 0 else 0.0

            sharpe = 0.0
            if np.std(shuffled) > 0:
                sharpe = float(np.mean(shuffled) / np.std(shuffled) * np.sqrt(252))

            peak = np.maximum.accumulate(eq)
            drawdowns = (eq - peak) / peak
            max_dd = float(np.min(drawdowns))

            simulations.append(BacktestResult(
                total_return=total_return,
                annualized_return=ann_return,
                sharpe_ratio=sharpe,
                max_drawdown=max_dd,
            ))

        returns_list = [r.total_return for r in simulations]
        sharpes = [r.sharpe_ratio for r in simulations]
        dds = [r.max_drawdown for r in simulations]

        return MonteCarloResult(
            simulations=simulations,
            mean_return=float(np.mean(returns_list)),
            mean_sharpe=float(np.mean(sharpes)),
            mean_max_dd=float(np.mean(dds)),
            pct_positive=float(np.sum(np.array(returns_list) > 0) / len(returns_list)),
            var_95=float(np.percentile(returns_list, 5)),
        )
