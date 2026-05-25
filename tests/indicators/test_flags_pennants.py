from __future__ import annotations

import pandas as pd
import pytest

from core.enums import SignalType
from signals.indicators.flags_pennants import FlagsPennantsEngine


def test_flags_pennants_importable():
    assert FlagsPennantsEngine is not None


def test_fp_compute_returns_list(sample_ohlcv):
    engine = FlagsPennantsEngine()
    result = engine.compute(sample_ohlcv)
    assert isinstance(result, list)


def test_fp_signal_type():
    engine = FlagsPennantsEngine()
    assert engine.signal_type == SignalType.FLAGS_PENNANTS
