from __future__ import annotations

import pandas as pd
import pytest

from core.enums import SignalType
from signals.regime.trend import TrendRegimeEngine
from signals.regime.volatility import VolatilityRegimeEngine
from signals.regime.wasserstein import WassersteinRegimeEngine


def test_trend_regime_importable():
    assert TrendRegimeEngine is not None


def test_volatility_regime_importable():
    assert VolatilityRegimeEngine is not None


def test_wasserstein_regime_importable():
    assert WassersteinRegimeEngine is not None


def test_trend_compute_returns_list(sample_ohlcv):
    engine = TrendRegimeEngine()
    result = engine.compute(sample_ohlcv)
    assert isinstance(result, list)


def test_volatility_compute_returns_list(sample_ohlcv):
    engine = VolatilityRegimeEngine()
    result = engine.compute(sample_ohlcv)
    assert isinstance(result, list)


def test_wasserstein_compute_returns_list(sample_ohlcv):
    engine = WassersteinRegimeEngine()
    result = engine.compute(sample_ohlcv)
    assert isinstance(result, list)


def test_trend_regime_signal_type():
    engine = TrendRegimeEngine()
    assert engine.signal_type == SignalType.TREND


def test_volatility_regime_signal_type():
    engine = VolatilityRegimeEngine()
    assert engine.signal_type == SignalType.VOLATILITY
