from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

HAS_SPECTRE = False
try:
    import spectre

    HAS_SPECTRE = True
except ImportError:
    spectre: Any = None


class SpectreBackend:
    def __init__(self, market: str = "US"):
        if not HAS_SPECTRE:
            raise ImportError("spectre is required. Install: pip install trading-engine[gpu]")
        self.market = market

    def factor(self, expression: str, data: pd.DataFrame) -> pd.Series:
        return spectre.factor(expression, market=self.market, data=data)

    def compute_factors(
        self,
        factors: Dict[str, str],
        data: pd.DataFrame,
    ) -> pd.DataFrame:
        results = {}
        for name, expr in factors.items():
            try:
                results[name] = self.factor(expr, data)
            except Exception as e:
                logger.warning("Factor '%s' failed: %s", name, e)
                results[name] = pd.Series(index=data.index, dtype=float)
        return pd.DataFrame(results)

    def backtest_factor(
        self,
        expression: str,
        data: pd.DataFrame,
        long_short: bool = True,
        top_pct: float = 0.2,
    ) -> Dict[str, Any]:
        factor_vals = self.factor(expression, data)
        signals = pd.Series(0, index=data.index)
        if long_short:
            top_threshold = factor_vals.quantile(1 - top_pct)
            bottom_threshold = factor_vals.quantile(top_pct)
            signals[factor_vals >= top_threshold] = 1
            signals[factor_vals <= bottom_threshold] = -1
        else:
            top_threshold = factor_vals.quantile(1 - top_pct)
            signals[factor_vals >= top_threshold] = 1
        returns = data["close"].pct_change().fillna(0)
        strategy_returns = signals.shift(1) * returns
        return {
            "factor_values": factor_vals,
            "signals": signals,
            "strategy_returns": strategy_returns,
            "cumulative_return": float((1 + strategy_returns).cumprod().iloc[-1] - 1) if len(strategy_returns) > 0 else 0.0,
            "sharpe": float(
                strategy_returns.mean() / strategy_returns.std() * (252 ** 0.5)
                if strategy_returns.std() > 0
                else 0.0
            ),
        }
