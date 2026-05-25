from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def sample_ohlcv():
    n = 200
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    np.random.seed(42)
    close = 100 + np.linspace(0, 5, n) + np.random.normal(0, 0.5, n)
    high = close + np.abs(np.random.normal(0, 0.3, n))
    low = close - np.abs(np.random.normal(0, 0.3, n))
    open_ = close - np.random.normal(0, 0.2, n)
    volume = np.random.poisson(1000, n)
    df = pd.DataFrame({"open": open_, "high": high, "low": low, "close": close, "volume": volume}, index=dates)
    df.attrs["symbol"] = "TEST"
    return df
