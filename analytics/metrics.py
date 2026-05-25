from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd


@dataclass
class PerformanceMetrics:
    """Comprehensive performance metrics."""

    # Returns
    total_return: float = 0.0
    annualized_return: float = 0.0
    cumulative_return: float = 0.0
    alpha: float = 0.0
    beta: float = 0.0
    benchmark_return: float = 0.0

    # Risk
    annualized_volatility: float = 0.0
    max_drawdown: float = 0.0
    max_drawdown_duration: int = 0
    value_at_risk_95: float = 0.0
    conditional_var_95: float = 0.0

    # Risk-adjusted
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    calmar_ratio: float = 0.0
    ulcer_index: float = 0.0
    martin_ratio: float = 0.0

    # Trading
    win_rate: float = 0.0
    profit_factor: float = 0.0
    total_trades: int = 0
    avg_win: float = 0.0
    avg_loss: float = 0.0
    expectancy: float = 0.0

    # Stability
    batting_average: float = 0.0
    upside_capture: float = 0.0
    downside_capture: float = 0.0

    @classmethod
    def compute(cls, equity_curve: list[float], returns: Optional[list[float]] = None, benchmark_returns: Optional[list[float]] = None) -> PerformanceMetrics:
        eq = np.array(equity_curve)
        if returns is None:
            rets = np.diff(eq) / eq[:-1]
        else:
            rets = np.array(returns)

        if len(rets) < 2:
            return cls()

        total_return = float((eq[-1] / eq[0]) - 1.0) if eq[0] > 0 else 0.0
        n_years = len(rets) / 252
        ann_return = (1 + total_return) ** (1 / max(n_years, 0.01)) - 1
        ann_vol = float(np.std(rets) * np.sqrt(252))

        alpha = 0.0
        beta = 0.0
        benchmark_return = 0.0
        if benchmark_returns is not None and len(benchmark_returns) == len(rets) and len(rets) > 1:
            b = np.array(benchmark_returns)
            benchmark_return = float((1 + np.mean(b)) ** 252 - 1)
            cov = np.cov(rets, b)[0, 1]
            var_b = np.var(b)
            if var_b > 0:
                beta = cov / var_b
                alpha = ann_return - beta * benchmark_return

        sharpe = ann_return / max(ann_vol, 1e-10)

        downside = rets[rets < 0]
        downside_vol = float(np.std(downside) * np.sqrt(252)) if len(downside) > 0 else 1.0
        sortino = ann_return / max(downside_vol, 1e-10)

        peak = np.maximum.accumulate(eq)
        drawdowns = (eq - peak) / peak
        max_dd = float(np.min(drawdowns))
        max_dd_dur = 0
        current_dur = 0
        for dd in drawdowns:
            if dd < 0:
                current_dur += 1
                max_dd_dur = max(max_dd_dur, current_dur)
            else:
                current_dur = 0

        calmar = ann_return / max(abs(max_dd), 1e-10)
        var_95 = float(np.percentile(rets, 5))
        cvar_95 = float(rets[rets <= var_95].mean()) if any(rets <= var_95) else 0.0

        csum = np.cumsum(rets)
        eq_series = pd.Series(np.exp(csum))
        sumsq = np.sum(((eq_series / eq_series.cummax()) - 1) ** 2.0)
        ulcer = float(np.sqrt(sumsq / len(rets))) if len(rets) > 0 else 0.0
        martin = ann_return / max(ulcer, 1e-10)

        wins = rets[rets > 0]
        losses = rets[rets < 0]
        win_rate = len(wins) / max(len(rets), 1)
        avg_win = float(np.mean(wins)) if len(wins) > 0 else 0.0
        avg_loss = float(abs(np.mean(losses))) if len(losses) > 0 else 1.0
        profit_factor = np.sum(wins) / max(abs(np.sum(losses)), 1e-10)
        expectancy = win_rate * avg_win - (1 - win_rate) * avg_loss

        bat_avg = float(np.sum(rets > 0) / max(len(rets), 1))

        return cls(
            total_return=total_return,
            annualized_return=ann_return,
            cumulative_return=total_return,
            alpha=alpha,
            beta=beta,
            benchmark_return=benchmark_return,
            annualized_volatility=ann_vol,
            max_drawdown=max_dd,
            max_drawdown_duration=max_dd_dur,
            value_at_risk_95=var_95,
            conditional_var_95=cvar_95,
            sharpe_ratio=sharpe,
            sortino_ratio=sortino,
            calmar_ratio=calmar,
            ulcer_index=ulcer,
            martin_ratio=martin,
            win_rate=win_rate,
            profit_factor=profit_factor,
            total_trades=len(rets),
            avg_win=avg_win,
            avg_loss=avg_loss,
            expectancy=expectancy,
            batting_average=bat_avg,
        )
