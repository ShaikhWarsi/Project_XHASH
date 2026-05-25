from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from core.enums import SignalType
from signals.indicators.support_resistance import SupportResistanceEngine


@pytest.fixture
def sample_ranging():
    n = 200
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    np.random.seed(42)
    close = 100 + np.random.normal(0, 2, n).cumsum() % 10
    high = close + np.abs(np.random.normal(0, 0.5, n))
    low = close - np.abs(np.random.normal(0, 0.5, n))
    df = pd.DataFrame({"open": close - 0.2, "high": high, "low": low, "close": close, "volume": 1000}, index=dates)
    df.attrs["symbol"] = "TEST"
    return df


def test_support_resistance_importable():
    assert SupportResistanceEngine is not None


def test_sr_compute_returns_list(sample_ranging):
    engine = SupportResistanceEngine()
    signals = engine.compute(sample_ranging)
    assert isinstance(signals, list)


def test_sr_signals_have_level(sample_ranging):
    engine = SupportResistanceEngine()
    signals = engine.compute(sample_ranging)
    for sig in signals:
        assert hasattr(sig, "level") or hasattr(sig, "price")


def test_sr_signal_type():
    engine = SupportResistanceEngine()
    assert engine.signal_type == SignalType.SUPPORT_RESISTANCE
