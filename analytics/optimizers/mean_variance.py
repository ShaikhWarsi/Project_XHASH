from __future__ import annotations

import numpy as np
import pandas as pd


class MeanVarianceOptimizer:
    def __init__(self, risk_free_rate: float = 0.0):
        self.risk_free_rate = risk_free_rate

    def optimize(self, returns: pd.DataFrame) -> dict:
        mu = returns.mean() * 252
        sigma = returns.cov() * 252
        n = len(mu)
        if n == 0:
            return {"weights": {}, "sharpe": 0.0}

        ones = np.ones(n)
        sigma_inv = np.linalg.pinv(sigma.values)
        w_mvp = sigma_inv @ ones / (ones.T @ sigma_inv @ ones)
        weights = pd.Series(w_mvp, index=mu.index)

        port_return = float(weights @ mu)
        port_vol = float(np.sqrt(weights @ sigma @ weights))
        sharpe = (port_return - self.risk_free_rate) / port_vol if port_vol > 0 else 0.0

        return {
            "weights": weights.to_dict(),
            "expected_return": round(port_return, 4),
            "volatility": round(port_vol, 4),
            "sharpe": round(sharpe, 4),
        }
