from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

import numpy as np
import pandas as pd

from .engine import BacktestEngine, BacktestResult


@dataclass
class ScenarioResult:
    base: BacktestResult = field(default_factory=BacktestResult)
    scenarios: dict[str, BacktestResult] = field(default_factory=dict)
    scenario_impact: dict[str, float] = field(default_factory=dict)


class ScenarioEngine:
    """Scenario analysis: stress-test strategy under different market conditions."""

    def __init__(self):
        self.engine = BacktestEngine()

    def run(
        self,
        strategy_fn: Callable,
        base_data: dict[str, pd.DataFrame],
        symbols: Optional[list[str]] = None,
    ) -> ScenarioResult:
        """Run base + scenario tests."""
        if symbols is None:
            symbols = list(base_data.keys())

        base_result = self.engine.run(strategy_fn, base_data, symbols)
        scenarios: dict[str, BacktestResult] = {}
        impacts: dict[str, float] = {}

        scenario_modifiers = {
            "crash_2008": lambda df: self._apply_crash(df),
            "high_vol": lambda df: self._apply_high_vol(df),
            "bull_run": lambda df: self._apply_bull_run(df),
            "low_liquidity": lambda df: self._apply_low_liquidity(df),
        }

        for name, modifier in scenario_modifiers.items():
            modified = {sym: modifier(df.copy()) for sym, df in base_data.items()}
            result = self.engine.run(strategy_fn, modified, symbols)
            scenarios[name] = result
            if abs(base_result.total_return) > 1e-10:
                impacts[name] = result.total_return - base_result.total_return

        return ScenarioResult(
            base=base_result,
            scenarios=scenarios,
            scenario_impact=impacts,
        )

    @staticmethod
    def _apply_crash(df: pd.DataFrame, crash_pct: float = -0.3) -> pd.DataFrame:
        n = len(df)
        crash_start = int(n * 0.6)
        for i in range(crash_start, n):
            factor = 1.0 + crash_pct * ((i - crash_start) / (n - crash_start))
            df.iloc[i, df.columns.get_loc("close")] *= (1 + factor)
            df.iloc[i, df.columns.get_loc("high")] *= (1 + factor)
            df.iloc[i, df.columns.get_loc("low")] *= (1 + factor)
            df.iloc[i, df.columns.get_loc("open")] *= (1 + factor)
        return df

    @staticmethod
    def _apply_high_vol(df: pd.DataFrame, vol_mult: float = 2.0) -> pd.DataFrame:
        noise = np.random.randn(len(df)) * 0.02 * vol_mult
        df["close"] = df["close"] * (1 + noise)
        df["high"] = np.maximum(df["open"], df["close"]) * 1.01
        df["low"] = np.minimum(df["open"], df["close"]) * 0.99
        return df

    @staticmethod
    def _apply_bull_run(df: pd.DataFrame, gain_pct: float = 0.5) -> pd.DataFrame:
        n = len(df)
        for i in range(n):
            factor = 1.0 + gain_pct * (i / n)
            df.iloc[i, df.columns.get_loc("close")] *= factor
            df.iloc[i, df.columns.get_loc("high")] *= factor
            df.iloc[i, df.columns.get_loc("low")] *= factor
            df.iloc[i, df.columns.get_loc("open")] *= factor
        return df

    @staticmethod
    def _apply_low_liquidity(df: pd.DataFrame, spread_mult: float = 3.0) -> pd.DataFrame:
        noise = np.random.randn(len(df)) * 0.005 * spread_mult
        df["close"] = df["close"] * (1 + noise)
        return df
