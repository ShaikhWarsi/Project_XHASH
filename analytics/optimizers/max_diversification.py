from __future__ import annotations

import numpy as np
import pandas as pd


class MaxDiversificationOptimizer:
    def optimize(self, returns: pd.DataFrame) -> dict:
        vols = returns.std() * np.sqrt(252)
        sigma = returns.cov() * 252
        n = len(vols)
        if n == 0:
            return {"weights": {}, "diversification_ratio": 0.0}

        ones = np.ones(n)
        sigma_inv = np.linalg.pinv(sigma.values)
        w = sigma_inv @ vols.values / (ones.T @ sigma_inv @ vols.values)
        weights = pd.Series(w, index=vols.index)

        port_vol = float(np.sqrt(weights @ sigma @ weights))
        weighted_vols = float(weights @ vols)
        dr = weighted_vols / port_vol if port_vol > 0 else 1.0

        port_return = float(weights @ (returns.mean() * 252))

        return {
            "weights": weights.to_dict(),
            "diversification_ratio": round(dr, 4),
            "expected_return": round(port_return, 4),
            "volatility": round(port_vol, 4),
        }
