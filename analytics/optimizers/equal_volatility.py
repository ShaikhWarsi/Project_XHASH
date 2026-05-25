from __future__ import annotations

import numpy as np
import pandas as pd


class EqualVolatilityOptimizer:
    def __init__(self, risk_free_rate: float = 0.0):
        self.risk_free_rate = risk_free_rate

    def optimize(self, returns: pd.DataFrame) -> dict:
        vols = returns.std() * np.sqrt(252)
        if vols.sum() == 0:
            n = len(vols)
            weights = pd.Series({c: 1.0 / n for c in vols.index}) if n > 0 else pd.Series(dtype=float)
        else:
            weights = (1.0 / vols) / (1.0 / vols).sum()

        sigma = returns.cov() * 252
        port_return = float(weights @ (returns.mean() * 252))
        port_vol = float(np.sqrt(weights @ sigma @ weights))
        sharpe = (port_return - self.risk_free_rate) / port_vol if port_vol > 0 else 0.0

        return {
            "weights": weights.to_dict(),
            "expected_return": round(port_return, 4),
            "volatility": round(port_vol, 4),
            "sharpe": round(sharpe, 4),
        }
