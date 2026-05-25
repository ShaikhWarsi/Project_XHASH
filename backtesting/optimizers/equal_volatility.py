"""Equal-volatility (inverse-volatility) weighting.
"""

from typing import Any, Dict, List

import numpy as np
import pandas as pd

from backtesting.optimizers.base import BaseOptimizer


class EqualVolatilityOptimizer(BaseOptimizer):
    """Inverse-volatility weights without a full covariance model."""

    def _build_context(
        self, window: pd.DataFrame, active: List[str]
    ) -> "Dict[str, Any] | None":
        vols = window.std()
        if vols.isna().any() or (vols < 1e-12).any():
            return None
        return {"vols": vols}

    def _calc_weights(self, ctx: Dict[str, Any]) -> np.ndarray:
        inv_vol = 1.0 / ctx["vols"]
        return (inv_vol / inv_vol.sum()).values


def optimize(
    ret: pd.DataFrame,
    pos: pd.DataFrame,
    dates: pd.DatetimeIndex,
    lookback: int = 60,
) -> pd.DataFrame:
    """Module-level entry: inverse-volatility-adjusted positions."""
    return EqualVolatilityOptimizer(lookback=lookback).optimize(ret, pos, dates)
