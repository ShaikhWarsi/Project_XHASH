from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from core.enums import SignalType
from signals.indicators.price_action import PriceActionEngine


@pytest.fixture
def sample_engulfing():
    dates = pd.date_range("2024-01-01", periods=10, freq="d")
    open_ = [105, 104, 103, 102, 101, 100, 102, 103, 104, 105]
    close = [104, 103, 102, 101, 100, 106, 103, 104, 105, 106]
    high = [max(o, c) + 1 for o, c in zip(open_, close)]
    low = [min(o, c) - 1 for o, c in zip(open_, close)]
    volume = [1000] * 10
    df = pd.DataFrame({"open": open_, "high": high, "low": low, "close": close, "volume": volume}, index=dates)
    df.attrs["symbol"] = "TEST"
    return df


def test_price_action_importable():
    assert PriceActionEngine is not None


def test_price_action_compute_returns_list(sample_engulfing):
    engine = PriceActionEngine()
    result = engine.compute(sample_engulfing)
    assert isinstance(result, list)


def test_price_action_signal_type():
    engine = PriceActionEngine()
    assert engine.signal_type == SignalType.STRUCTURE
