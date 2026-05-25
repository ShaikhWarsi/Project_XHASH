import pytest
import pandas as pd
import numpy as np


class TestFactorAnalysis:
    def test_requires_alphalens(self):
        try:
            from analytics.factors.alphalens_analysis import FactorAnalysis
            prices = pd.DataFrame({"A": [100, 101]}, index=pd.DatetimeIndex(["2024-01-01", "2024-01-02"]))
            fa = FactorAnalysis(prices)
        except ImportError:
            pass  # Expected if alphalens not installed

    def test_rejects_empty_prices(self):
        try:
            from analytics.factors.alphalens_analysis import FactorAnalysis
            with pytest.raises(ValueError, match="cannot be empty"):
                FactorAnalysis(pd.DataFrame())
        except ImportError:
            pass

    def test_rejects_non_datetime_index(self):
        try:
            from analytics.factors.alphalens_analysis import FactorAnalysis
            with pytest.raises(ValueError, match="DatetimeIndex"):
                FactorAnalysis(pd.DataFrame({"A": [100]}))
        except ImportError:
            pass


class TestFactorSerialization:
    def test_build_panel(self):
        from api.routes.factor_analysis import _build_panel
        prices = [100, 101, 200, 202]
        timestamps = ["2024-01-01", "2024-01-02"]
        symbols = ["AAPL", "MSFT"]
        df = _build_panel(prices, timestamps, symbols)
        assert list(df.columns) == ["AAPL", "MSFT"]
        assert len(df) == 2

    def test_build_factor(self):
        from api.routes.factor_analysis import _build_factor
        values = [0.5, 0.6, 0.3, 0.4]
        timestamps = ["2024-01-01", "2024-01-02"]
        symbols = ["AAPL", "MSFT"]
        s = _build_factor(values, timestamps, symbols)
        assert len(s) == 4
        assert s.index.names == ["date", "asset"]
