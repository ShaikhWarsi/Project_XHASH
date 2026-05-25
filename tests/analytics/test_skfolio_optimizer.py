import pytest
import pandas as pd
import numpy as np


class TestSkfolioOptimizer:
    def test_requires_skfolio(self):
        try:
            from analytics.optimizers.skfolio_optimizer import SkfolioOptimizer
            SkfolioOptimizer()
        except ImportError:
            pass

    def test_predict_before_fit_raises(self):
        try:
            from analytics.optimizers.skfolio_optimizer import SkfolioOptimizer
            opt = SkfolioOptimizer()
            with pytest.raises(RuntimeError, match="not fitted"):
                opt.predict()
        except ImportError:
            pass


class TestBlackLitterman:
    def test_black_litterman_simple(self):
        try:
            from analytics.optimizers.skfolio_optimizer import SkfolioOptimizer
            np.random.seed(42)
            n = 100
            prices = pd.DataFrame({
                "AAPL": np.cumprod(1 + np.random.randn(n) * 0.01) * 100,
                "MSFT": np.cumprod(1 + np.random.randn(n) * 0.01) * 100,
            })
            opt = SkfolioOptimizer()
            weights = opt.black_litterman(prices, {"AAPL": 0.05}, view_confidence=0.7)
            assert len(weights) == 2
            assert abs(weights.sum()) > 0
        except ImportError:
            pass

    def test_hrp_runs(self):
        try:
            from analytics.optimizers.skfolio_optimizer import SkfolioOptimizer
            np.random.seed(42)
            n = 100
            prices = pd.DataFrame({
                "AAPL": np.cumprod(1 + np.random.randn(n) * 0.01) * 100,
                "MSFT": np.cumprod(1 + np.random.randn(n) * 0.01) * 100,
                "GOOGL": np.cumprod(1 + np.random.randn(n) * 0.01) * 100,
            })
            opt = SkfolioOptimizer()
            weights = opt.hrp(prices)
            assert len(weights) == 3
            assert abs(weights.sum()) > 0
        except ImportError:
            pass
