from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import pandas as pd


@dataclass
class PortfolioMetrics:
    expected_return: float
    volatility: float
    sharpe_ratio: float
    weights: dict[str, float]


@dataclass
class EfficientFrontierPoint:
    expected_return: float
    volatility: float
    sharpe_ratio: float
    weights: dict[str, float]


class MeanVarianceOptimizer:
    def __init__(self, returns: pd.DataFrame, risk_free_rate: float = 0.05):
        self._returns = returns
        self._risk_free_rate = risk_free_rate
        self._mean_returns = returns.mean() * 252
        self._cov_matrix = returns.cov() * 252

    def max_sharpe(self) -> PortfolioMetrics:
        from scipy.optimize import minimize

        n = len(self._mean_returns)

        def neg_sharpe(w):
            w = np.array(w)
            ret = np.dot(w, self._mean_returns)
            vol = np.sqrt(np.dot(w.T, np.dot(self._cov_matrix, w)))
            if vol == 0:
                return 1e10
            return -(ret - self._risk_free_rate) / vol

        constraints = ({"type": "eq", "fun": lambda w: np.sum(w) - 1},)
        bounds = tuple((0, 1) for _ in range(n))
        guess = np.array([1 / n] * n)

        result = minimize(neg_sharpe, guess, method="SLSQP", bounds=bounds, constraints=constraints)

        if not result.success:
            raise ValueError(f"Optimization failed: {result.message}")

        w = result.x
        ret = float(np.dot(w, self._mean_returns))
        vol = float(np.sqrt(np.dot(w.T, np.dot(self._cov_matrix, w))))
        sharpe = (ret - self._risk_free_rate) / vol if vol > 0 else 0.0

        return PortfolioMetrics(
            expected_return=ret,
            volatility=vol,
            sharpe_ratio=sharpe,
            weights=dict(zip(self._returns.columns, w)),
        )

    def min_volatility(self) -> PortfolioMetrics:
        from scipy.optimize import minimize

        n = len(self._mean_returns)

        def portfolio_vol(w):
            w = np.array(w)
            return float(np.sqrt(np.dot(w.T, np.dot(self._cov_matrix, w))))

        constraints = ({"type": "eq", "fun": lambda w: np.sum(w) - 1},)
        bounds = tuple((0, 1) for _ in range(n))
        guess = np.array([1 / n] * n)

        result = minimize(portfolio_vol, guess, method="SLSQP", bounds=bounds, constraints=constraints)

        if not result.success:
            raise ValueError(f"Optimization failed: {result.message}")

        w = result.x
        vol = float(np.sqrt(np.dot(w.T, np.dot(self._cov_matrix, w))))
        ret = float(np.dot(w, self._mean_returns))
        sharpe = (ret - self._risk_free_rate) / vol if vol > 0 else 0.0

        return PortfolioMetrics(expected_return=ret, volatility=vol, sharpe_ratio=sharpe, weights=dict(zip(self._returns.columns, w)))

    def efficient_frontier(self, num_points: int = 50) -> list[EfficientFrontierPoint]:
        from scipy.optimize import minimize

        n = len(self._mean_returns)
        target_returns = np.linspace(self._mean_returns.min(), self._mean_returns.max(), num_points)
        frontier: list[EfficientFrontierPoint] = []

        for target in target_returns:
            def portfolio_vol(w):
                w = np.array(w)
                return float(np.sqrt(np.dot(w.T, np.dot(self._cov_matrix, w))))

            constraints = (
                {"type": "eq", "fun": lambda w: np.sum(w) - 1},
                {"type": "eq", "fun": lambda w, t=target: float(np.dot(w, self._mean_returns)) - t},
            )
            bounds = tuple((0, 1) for _ in range(n))
            guess = np.array([1 / n] * n)

            result = minimize(portfolio_vol, guess, method="SLSQP", bounds=bounds, constraints=constraints)
            if result.success:
                w = result.x
                vol = float(np.sqrt(np.dot(w.T, np.dot(self._cov_matrix, w))))
                ret = float(np.dot(w, self._mean_returns))
                sharpe = (ret - self._risk_free_rate) / vol if vol > 0 else 0.0
                frontier.append(EfficientFrontierPoint(
                    expected_return=ret, volatility=vol, sharpe_ratio=sharpe,
                    weights=dict(zip(self._returns.columns, w)),
                ))

        return frontier

    def efficient_return(self, target_return: float) -> PortfolioMetrics:
        from scipy.optimize import minimize

        n = len(self._mean_returns)

        def portfolio_vol(w):
            w = np.array(w)
            return float(np.sqrt(np.dot(w.T, np.dot(self._cov_matrix, w))))

        constraints = (
            {"type": "eq", "fun": lambda w: np.sum(w) - 1},
            {"type": "eq", "fun": lambda w, t=target_return: float(np.dot(w, self._mean_returns)) - t},
        )
        bounds = tuple((0, 1) for _ in range(n))
        guess = np.array([1 / n] * n)

        result = minimize(portfolio_vol, guess, method="SLSQP", bounds=bounds, constraints=constraints)
        if not result.success:
            raise ValueError(f"Optimization failed: {result.message}")

        w = result.x
        vol = float(np.sqrt(np.dot(w.T, np.dot(self._cov_matrix, w))))
        ret = float(np.dot(w, self._mean_returns))
        sharpe = (ret - self._risk_free_rate) / vol if vol > 0 else 0.0

        return PortfolioMetrics(expected_return=ret, volatility=vol, sharpe_ratio=sharpe, weights=dict(zip(self._returns.columns, w)))


class BlackLittermanOptimizer:
    def __init__(
        self,
        market_cap_weights: dict[str, float],
        cov_matrix: pd.DataFrame,
        risk_aversion: float = 2.5,
        risk_free_rate: float = 0.05,
    ):
        self._market_weights = np.array([market_cap_weights[k] for k in cov_matrix.columns])
        self._cov = cov_matrix.values
        self._delta = risk_aversion
        self._risk_free_rate = risk_free_rate
        self._assets = list(cov_matrix.columns)

    def implied_returns(self) -> dict[str, float]:
        pi = self._delta * self._cov @ self._market_weights
        return dict(zip(self._assets, pi))

    def apply_views(
        self,
        view_assets: list[list[str]],
        view_returns: np.ndarray,
        view_uncertainty: Optional[np.ndarray] = None,
        tau: float = 0.05,
    ) -> dict[str, float]:
        n = len(self._assets)
        pi = self._implied_returns_vector()
        sigma = self._cov

        k = len(view_returns)
        P = np.zeros((k, n))
        for i, assets in enumerate(view_assets):
            for a in assets:
                if a in self._assets:
                    P[i, self._assets.index(a)] = 1.0 / len(assets)

        omega = view_uncertainty if view_uncertainty is not None else np.diag(np.diag(P @ sigma @ P.T)) * tau

        inv_term = np.linalg.inv(np.linalg.inv(tau * sigma) + P.T @ np.linalg.inv(omega) @ P)
        mu_bl = pi + tau * sigma @ P.T @ np.linalg.inv(P @ (tau * sigma) @ P.T + omega) @ (view_returns - P @ pi)

        return dict(zip(self._assets, mu_bl))

    def _implied_returns_vector(self) -> np.ndarray:
        return self._delta * self._cov @ self._market_weights


class HierarchicalRiskParity:
    def __init__(self, returns: pd.DataFrame):
        self._returns = returns
        self._cov = returns.cov().values
        self._corr = returns.corr().values
        self._assets = list(returns.columns)

    def _cluster_ordering(self) -> np.ndarray:
        from scipy.cluster.hierarchy import linkage, leaves_list
        from scipy.spatial.distance import pdist, squareform

        dist = squareform(np.sqrt(2 * (1 - self._corr)))
        linkage_matrix = linkage(dist, method="ward")
        return leaves_list(linkage_matrix)

    def optimize(self) -> PortfolioMetrics:
        ordering = self._cluster_ordering()
        sorted_assets = [self._assets[i] for i in ordering]
        sorted_cov = self._cov[ordering][:, ordering]

        weights = np.ones(len(sorted_assets))
        clusters = [[i] for i in range(len(sorted_assets))]

        while len(clusters) > 1:
            new_clusters = []
            for i in range(0, len(clusters), 2):
                if i + 1 < len(clusters):
                    left = clusters[i]
                    right = clusters[i + 1]
                    left_var = self._cluster_variance(sorted_cov, left)
                    right_var = self._cluster_variance(sorted_cov, right)
                    alpha = 1 - left_var / (left_var + right_var)
                    for idx in left:
                        weights[ordering[idx]] *= alpha
                    for idx in right:
                        weights[ordering[idx]] *= (1 - alpha)
                    new_clusters.append(left + right)
                else:
                    new_clusters.append(clusters[i])
            clusters = new_clusters

        weights = weights / weights.sum()

        ret = float(self._returns.mean().values @ weights)
        vol = float(np.sqrt(weights.T @ self._cov @ weights))
        sharpe = (ret - 0.05) / vol if vol > 0 else 0.0

        return PortfolioMetrics(
            expected_return=ret * 252,
            volatility=vol * np.sqrt(252),
            sharpe_ratio=sharpe * np.sqrt(252),
            weights=dict(zip(self._assets, weights)),
        )

    @staticmethod
    def _cluster_variance(cov: np.ndarray, indices: list[int]) -> float:
        if len(indices) <= 1:
            return float(cov[indices[0], indices[0]])
        sub_cov = cov[np.ix_(indices, indices)]
        w = np.ones(len(indices)) / len(indices)
        return float(w.T @ sub_cov @ w)
