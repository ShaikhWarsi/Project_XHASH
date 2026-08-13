from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

import numpy as np
import pandas as pd

from .engine import BacktestEngine, BacktestResult

_DEFAULT_SCENARIOS = {
    "crash_2008": {"type": "crash", "params": {"crash_pct": -0.3}},
    "high_vol": {"type": "high_vol", "params": {"vol_mult": 2.0}},
    "bull_run": {"type": "bull_run", "params": {"gain_pct": 0.5}},
    "low_liquidity": {"type": "low_liquidity", "params": {"spread_mult": 3.0}},
}


def _load_scenarios(path: str | None = None) -> dict:
    if path:
        p = Path(path)
        if p.exists():
            with open(p) as f:
                return json.load(f)
    return dict(_DEFAULT_SCENARIOS)


@dataclass
class ScenarioResult:
    base: BacktestResult = field(default_factory=BacktestResult)
    scenarios: dict[str, BacktestResult] = field(default_factory=dict)
    scenario_impact: dict[str, float] = field(default_factory=dict)


class ScenarioEngine:
    """Scenario analysis: stress-test strategy under different market conditions."""

    def __init__(self, scenarios_path: str | None = None):
        self.engine = BacktestEngine()
        self._scenario_configs = _load_scenarios(scenarios_path)

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

        scenario_modifiers = {}
        for name, cfg in self._scenario_configs.items():
            t = cfg.get("type")
            p = cfg.get("params", {})
            if t == "crash":
                scenario_modifiers[name] = lambda df, cp=p.get("crash_pct", -0.3): self._apply_crash(df, cp)
            elif t == "high_vol":
                scenario_modifiers[name] = lambda df, vm=p.get("vol_mult", 2.0): self._apply_high_vol(df, vm)
            elif t == "bull_run":
                scenario_modifiers[name] = lambda df, gp=p.get("gain_pct", 0.5): self._apply_bull_run(df, gp)
            elif t == "low_liquidity":
                scenario_modifiers[name] = lambda df, sm=p.get("spread_mult", 3.0): self._apply_low_liquidity(df, sm)

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
            df.iloc[i, df.columns.get_loc("close")] *= factor
            df.iloc[i, df.columns.get_loc("high")] *= factor
            df.iloc[i, df.columns.get_loc("low")] *= factor
            df.iloc[i, df.columns.get_loc("open")] *= factor
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
