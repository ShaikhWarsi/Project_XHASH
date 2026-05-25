from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from core.enums import SignalType
from signals.indicators.smc import OrderBlockEngine


@pytest.fixture
def sample_data():
    n = 200
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    base = 100.0
    noise = pd.Series(pd.array([0.0] * n)).cumsum()
    np.random.seed(42)
    close = base + np.linspace(0, 5, n) + np.random.normal(0, 0.5, n).cumsum()
    high = close + np.abs(np.random.normal(0, 0.3, n))
    low = close - np.abs(np.random.normal(0, 0.3, n))
    open_ = close - np.random.normal(0, 0.2, n)
    volume = np.random.poisson(1000, n)
    df = pd.DataFrame({"open": open_, "high": high, "low": low, "close": close, "volume": volume}, index=dates)
    df.attrs["symbol"] = "TEST"
    return df


def test_order_block_engine_importable():
    assert OrderBlockEngine is not None


def test_order_block_compute_runs(sample_data):
    engine = OrderBlockEngine()
    result = engine.compute(sample_data)
    assert isinstance(result, list)


def test_order_block_signal_type():
    engine = OrderBlockEngine()
    assert engine.signal_type == SignalType.ORDER_BLOCK
