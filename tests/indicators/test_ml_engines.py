from __future__ import annotations

import pandas as pd
import pytest

from core.enums import SignalType
from signals.ml.meta_labeling import TrendlineBreakoutEngine
from signals.ml.pattern_mining import PIPPatternMinerEngine
from signals.ml.validation import MonteCarloPermutationTest


def test_meta_labeling_importable():
    assert TrendlineBreakoutEngine is not None


def test_pattern_mining_importable():
    assert PIPPatternMinerEngine is not None


def test_validation_importable():
    assert MonteCarloPermutationTest is not None


def test_meta_labeling_compute_returns_list(sample_ohlcv):
    engine = TrendlineBreakoutEngine()
    result = engine.compute(sample_ohlcv)
    assert isinstance(result, list)


def test_pattern_mining_compute_returns_list(sample_ohlcv):
    engine = PIPPatternMinerEngine()
    patterns = engine.compute(sample_ohlcv)
    assert isinstance(patterns, list)


def test_meta_labeling_signal_type():
    engine = TrendlineBreakoutEngine()
    assert engine.signal_type == SignalType.ML_TRENDLINE
