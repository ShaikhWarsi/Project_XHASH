from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def sample_returns():
    np.random.seed(42)
    n = 252
    dates = pd.date_range("2024-01-01", periods=n, freq="D")
    returns = pd.DataFrame({
        "AAPL": np.random.normal(0.0008, 0.015, n),
        "MSFT": np.random.normal(0.0007, 0.014, n),
        "GOOGL": np.random.normal(0.0006, 0.016, n),
        "AMZN": np.random.normal(0.0009, 0.018, n),
    }, index=dates)
    return returns


class TestMeanVarianceOptimizer:
    def test_max_sharpe(self, sample_returns):
        from analytics.cfa.portfolio import MeanVarianceOptimizer

        opt = MeanVarianceOptimizer(sample_returns, risk_free_rate=0.05)
        result = opt.max_sharpe()
        assert result.expected_return > 0
        assert result.volatility > 0
        assert result.sharpe_ratio > 0
        assert len(result.weights) == 4
        assert abs(sum(result.weights.values()) - 1) < 0.01

    def test_min_volatility(self, sample_returns):
        from analytics.cfa.portfolio import MeanVarianceOptimizer

        opt = MeanVarianceOptimizer(sample_returns, risk_free_rate=0.05)
        result = opt.min_volatility()
        assert result.volatility > 0
        assert abs(sum(result.weights.values()) - 1) < 0.01

    def test_efficient_frontier(self, sample_returns):
        from analytics.cfa.portfolio import MeanVarianceOptimizer

        opt = MeanVarianceOptimizer(sample_returns, risk_free_rate=0.05)
        frontier = opt.efficient_frontier(num_points=10)
        # frontier may include points with negative expected return if
        # sampled assets produce negative mean returns; just check structure
        assert len(frontier) > 0
        for pt in frontier:
            assert isinstance(pt.expected_return, float)
            assert pt.volatility > 0

    def test_efficient_return(self, sample_returns):
        from analytics.cfa.portfolio import MeanVarianceOptimizer

        opt = MeanVarianceOptimizer(sample_returns, risk_free_rate=0.05)
        target = sample_returns.mean().mean() * 252
        result = opt.efficient_return(target)
        assert abs(result.expected_return - target) < 0.001
        assert abs(sum(result.weights.values()) - 1) < 0.01


class TestBlackLittermanOptimizer:
    @pytest.fixture
    def bl_setup(self):
        assets = ["AAPL", "MSFT", "GOOGL", "AMZN"]
        market_cap = {"AAPL": 0.35, "MSFT": 0.30, "GOOGL": 0.20, "AMZN": 0.15}
        np.random.seed(42)
        cov = pd.DataFrame(
            np.random.uniform(0.01, 0.05, (4, 4)),
            index=assets, columns=assets,
        )
        cov.values[[0, 1, 2, 3], [0, 1, 2, 3]] = [0.04, 0.035, 0.045, 0.05]
        cov = (cov + cov.T) / 2
        return assets, market_cap, cov

    def test_implied_returns(self, bl_setup):
        from analytics.cfa.portfolio import BlackLittermanOptimizer

        _, market_cap, cov = bl_setup
        bl = BlackLittermanOptimizer(market_cap, cov)
        implied = bl.implied_returns()
        assert len(implied) == 4
        assert all(v is not None for v in implied.values())

    def test_apply_views(self, bl_setup):
        from analytics.cfa.portfolio import BlackLittermanOptimizer

        assets, market_cap, cov = bl_setup
        bl = BlackLittermanOptimizer(market_cap, cov)
        result = bl.apply_views(
            view_assets=[["AAPL", "MSFT"], ["GOOGL", "AMZN"]],
            view_returns=np.array([0.12, 0.08]),
        )
        assert len(result) == 4


class TestHierarchicalRiskParity:
    def test_optimize(self, sample_returns):
        from analytics.cfa.portfolio import HierarchicalRiskParity

        hrp = HierarchicalRiskParity(sample_returns)
        result = hrp.optimize()
        assert result.expected_return > 0
        assert result.volatility > 0
        assert len(result.weights) == 4
        assert abs(sum(result.weights.values()) - 1) < 0.01
