from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

import numpy as np
import pandas as pd

from .engine import BacktestEngine, BacktestResult


@dataclass
class WalkForwardResult:
    window_results: list[BacktestResult] = field(default_factory=list)
    avg_sharpe: float = 0.0
    avg_return: float = 0.0
    avg_max_dd: float = 0.0
    stability: float = 0.0


class WalkForwardEngine:
    """Walk-forward optimization and validation.

    Splits data into sequential train/test windows.
    """

    def __init__(
        self,
        train_pct: float = 0.6,
        step_pct: float = 0.2,
        min_train_bars: int = 100,
    ):
        self.train_pct = train_pct
        self.step_pct = step_pct
        self.min_train_bars = min_train_bars

    def run(
        self,
        train_fn: Callable,
        test_fn: Callable,
        data: dict[str, pd.DataFrame],
        symbols: Optional[list[str]] = None,
    ) -> WalkForwardResult:
        """Run walk-forward analysis.

        Args:
            train_fn: callable(train_data) -> strategy parameters
            test_fn: callable(test_data, params) -> list of Orders
            data: dict[symbol -> OHLCV DataFrame]
        """
        if symbols is None:
            symbols = list(data.keys())

        aligned = self._align_data(data, symbols)
        n = len(next(iter(aligned.values())))
        if n < self.min_train_bars:
            return WalkForwardResult()

        train_size = int(n * self.train_pct)
        step_size = int(n * self.step_pct)

        engine = BacktestEngine()
        results: list[BacktestResult] = []

        for start in range(0, n - train_size, step_size):
            train_end = start + train_size
            test_end = min(n, train_end + step_size * 2)

            train_data = {sym: df.iloc[start:train_end] for sym, df in aligned.items()}
            test_data = {sym: df.iloc[train_end:test_end] for sym, df in aligned.items()}

            if any(len(v) < self.min_train_bars for v in train_data.values()):
                continue
            if any(len(v) < 5 for v in test_data.values()):
                continue

            params = train_fn(train_data)

            def strategy_fn(snapshot, portfolio):
                return test_fn(snapshot, portfolio, params)

            result = engine.run(strategy_fn, test_data, symbols)
            results.append(result)

        if not results:
            return WalkForwardResult()

        avg_sharpe = float(np.mean([r.sharpe_ratio for r in results]))
        avg_return = float(np.mean([r.total_return for r in results]))
        avg_dd = float(np.mean([r.max_drawdown for r in results]))
        sharpe_values = [r.sharpe_ratio for r in results]
        stability = 1.0 - float(np.std(sharpe_values)) / max(abs(float(np.mean(sharpe_values))), 1e-10) if sharpe_values else 0.0

        return WalkForwardResult(
            window_results=results,
            avg_sharpe=avg_sharpe,
            avg_return=avg_return,
            avg_max_dd=avg_dd,
            stability=stability,
        )

    def _align_data(self, data: dict[str, pd.DataFrame], symbols: list[str]) -> dict[str, pd.DataFrame]:
        return {sym: data[sym].copy().sort_index() for sym in symbols if sym in data}
