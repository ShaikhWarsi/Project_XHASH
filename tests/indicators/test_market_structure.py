from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from core.enums import SignalType
from signals.indicators.structure import MarketStructureEngine


@pytest.fixture
def sample_trending():
    n = 200
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    np.random.seed(42)
    close = 100 + np.linspace(0, 20, n) + np.random.normal(0, 0.5, n)
    high = close + np.abs(np.random.normal(0, 0.3, n))
    low = close - np.abs(np.random.normal(0, 0.3, n))
    df = pd.DataFrame({"open": close - 0.2, "high": high, "low": low, "close": close, "volume": 1000}, index=dates)
    df.attrs["symbol"] = "TEST"
    return df


def test_market_structure_importable():
    assert MarketStructureEngine is not None


def test_market_structure_compute_returns_list(sample_trending):
    engine = MarketStructureEngine()
    result = engine.compute(sample_trending)
    assert isinstance(result, list)


def test_market_structure_signal_type():
    engine = MarketStructureEngine()
    assert engine.signal_type == SignalType.BOS
