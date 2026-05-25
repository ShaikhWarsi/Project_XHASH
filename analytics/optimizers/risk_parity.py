from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.optimize import minimize


class RiskParityOptimizer:
    def optimize(self, returns: pd.DataFrame) -> dict:
        sigma = returns.cov() * 252
        n = len(sigma)
        if n == 0:
            return {"weights": {}, "risk_contribution": {}}

        def risk_contribution(w):
            port_var = w @ sigma @ w
            mrc = sigma @ w
            rc = w * mrc / port_var
            return rc

        def objective(w):
            rc = risk_contribution(w)
            target = 1.0 / n
            return np.sum((rc - target) ** 2)

        constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}]
        bounds = [(0.0, 1.0) for _ in range(n)]
        result = minimize(objective, np.ones(n) / n, bounds=bounds, constraints=constraints, method="SLSQP")

        if not result.success:
            return {"weights": {c: 1.0 / n for c in sigma.index}, "risk_contribution": {}}

        weights = pd.Series(result.x, index=sigma.index)
        rc = risk_contribution(weights)
        port_return = float(weights @ (returns.mean() * 252))
        port_vol = float(np.sqrt(weights @ sigma @ weights))

        return {
            "weights": weights.to_dict(),
            "risk_contribution": {str(k): round(v, 4) for k, v in zip(sigma.index, rc)},
            "expected_return": round(port_return, 4),
            "volatility": round(port_vol, 4),
        }
