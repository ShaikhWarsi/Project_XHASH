from __future__ import annotations

import pandas as pd
import pytest

from core.enums import SignalType
from signals.indicators.head_shoulders import HeadShouldersEngine


def test_head_shoulders_importable():
    assert HeadShouldersEngine is not None


def test_hs_compute_returns_list(sample_ohlcv):
    engine = HeadShouldersEngine()
    result = engine.compute(sample_ohlcv)
    assert isinstance(result, list)


def test_hs_signal_type():
    engine = HeadShouldersEngine()
    assert engine.signal_type == SignalType.HEAD_SHOULDERS
