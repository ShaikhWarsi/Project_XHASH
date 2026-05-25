from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

HAS_SKFOLIO = False
try:
    import skfolio
    from skfolio.optimization import MeanRisk, HierarchicalRiskParity, DistributionallyRobustCVaR
    from skfolio.preprocessing import prices_to_returns
    from skfolio.model_selection import RollingWindowSplit
    from skfolio.metrics import make_scorer
    from skfolio import RiskMeasure, ObjectiveFunction

    HAS_SKFOLIO = True
except ImportError:
    skfolio: Any = None


class SkfolioOptimizer:
    def __init__(
        self,
        model: str = "mean-risk",
        risk_measure: str = "CVaR",
        objective: str = "maximize_utility",
        **kwargs,
    ):
        if not HAS_SKFOLIO:
            raise ImportError("skfolio is required. Install: pip install trading-engine[portfolio]")

        self.model_name = model
        risk_map = {
            "CVaR": RiskMeasure.CVAR,
            "Variance": RiskMeasure.VARIANCE,
            "StandardDeviation": RiskMeasure.STANDARD_DEVIATION,
            "SemiDeviation": RiskMeasure.SEMI_DEVIATION,
            "MaxDrawdown": RiskMeasure.MAX_DRAWDOWN,
        }
        obj_map = {
            "maximize_utility": ObjectiveFunction.MAXIMIZE_UTILITY,
            "minimize_risk": ObjectiveFunction.MINIMIZE_RISK,
            "maximize_return": ObjectiveFunction.MAXIMIZE_RETURN,
        }
        resolved_risk = risk_map.get(risk_measure, RiskMeasure.CVAR)
        resolved_obj = obj_map.get(objective, ObjectiveFunction.MAXIMIZE_UTILITY)

        if model == "hrp":
            self._model = HierarchicalRiskParity(**kwargs)
        elif model == "robust-cvar":
            self._model = DistributionallyRobustCVaR(**kwargs)
        else:
            self._model = MeanRisk(
                risk_measure=resolved_risk,
                objective_function=resolved_obj,
                **kwargs,
            )
        self._fitted = False

    @property
    def weights_(self) -> Optional[np.ndarray]:
        if self._fitted and hasattr(self._model, "weights_"):
            return self._model.weights_
        return None

    def fit(self, prices: pd.DataFrame, **kwargs) -> "SkfolioOptimizer":
        returns = prices_to_returns(prices)
        self._model.fit(returns, **kwargs)
        self._fitted = True
        return self

    def predict(self) -> pd.Series:
        if not self._fitted:
            raise RuntimeError("Model not fitted. Call fit() first.")
        weights = self._model.predict()
        if isinstance(weights, np.ndarray):
            if hasattr(self._model, "feature_names_in_"):
                return pd.Series(weights, index=self._model.feature_names_in_)
            return pd.Series(weights)
        return weights

    def efficient_frontier(
        self,
        prices: pd.DataFrame,
        n_points: int = 30,
    ) -> pd.DataFrame:
        returns = prices_to_returns(prices)
        points = []
        max_ret = returns.mean().mean()
        target_returns = np.linspace(0, max_ret * 2, n_points)
        for tr in target_returns:
            try:
                model = MeanRisk(
                    risk_measure=RiskMeasure.VARIANCE,
                    objective_function=ObjectiveFunction.MAXIMIZE_RETURN,
                    target_return=tr,
                )
                model.fit(returns)
                w = model.weights_
                port_return = np.sum(returns.mean() * w) * 252
                port_risk = np.sqrt(w @ returns.cov() @ w * 252)
                points.append({"return": port_return, "risk": port_risk})
            except Exception:
                continue
        return pd.DataFrame(points)

    def hrp(self, prices: pd.DataFrame) -> pd.Series:
        model = HierarchicalRiskParity()
        returns = prices_to_returns(prices)
        model.fit(returns)
        return pd.Series(model.weights_, index=returns.columns)

    def black_litterman(
        self,
        prices: pd.DataFrame,
        views: Dict[str, float],
        view_confidence: float = 0.5,
    ) -> pd.Series:
        returns = prices_to_returns(prices)
        n = returns.shape[1]
        market_weights = np.ones(n) / n
        delta = 2.5
        cov = returns.cov().values * 252
        pi = delta * cov @ market_weights
        P = np.zeros((len(views), n))
        Q = np.array(list(views.values()))
        asset_index = {asset: i for i, asset in enumerate(returns.columns)}
        for i, asset in enumerate(views.keys()):
            if asset in asset_index:
                P[i, asset_index[asset]] = 1.0
        tau = 0.05
        omega = np.eye(len(views)) * (1 - view_confidence)
        M_inv = np.linalg.inv(np.linalg.inv(tau * cov) + P.T @ np.linalg.inv(omega) @ P)
        bl_return = M_inv @ (np.linalg.inv(tau * cov) @ pi + P.T @ np.linalg.inv(omega) @ Q)
        model = MeanRisk()
        model.fit(pd.DataFrame(bl_return.reshape(1, -1), columns=returns.columns))
        return pd.Series(model.weights_, index=returns.columns)

    def portfolio_stats(self, prices: pd.DataFrame) -> Dict[str, float]:
        weights = self.predict()
        returns = prices_to_returns(prices)
        w = weights.values
        port_return = float(np.sum(returns.mean() * w) * 252)
        port_risk = float(np.sqrt(w @ returns.cov().values @ w * 252))
        sharpe = port_return / port_risk if port_risk > 0 else 0.0
        return {
            "expected_return": round(port_return * 100, 2),
            "expected_risk": round(port_risk * 100, 2),
            "sharpe_ratio": round(sharpe, 3),
            "n_assets": len(weights),
        }
