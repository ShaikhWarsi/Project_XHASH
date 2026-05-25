from __future__ import annotations

from datetime import datetime

import pandas as pd

from core.enums import SignalDir, SignalType
from core.types import Bar, QuantSignal
from signals.base import SignalEngine


class _TestEngine(SignalEngine):
    @property
    def signal_type(self) -> SignalType:
        return SignalType.TREND

    def compute(self, bars: pd.DataFrame) -> list[QuantSignal]:
        return [
            QuantSignal(
                type=self.signal_type,
                direction=SignalDir.BULLISH,
                strength=0.5,
                confidence=0.5,
                symbol=bars.attrs.get("symbol", "?"),
                timeframe=bars.attrs.get("timeframe", "?"),
                timestamp=datetime.utcnow(),
            )
        ]


def test_store_signals_capped():
    engine = _TestEngine(max_stored_signals=3)
    signals = [QuantSignal(type=SignalType.TREND, direction=SignalDir.BULLISH, strength=0.5, confidence=0.5, symbol="A", timeframe="1h", timestamp=datetime.utcnow()) for _ in range(10)]
    engine._store_signals(signals)
    assert len(engine._last_signals) == 3


def test_store_signals_keeps_last():
    engine = _TestEngine(max_stored_signals=5)
    engine._store_signals([QuantSignal(type=SignalType.TREND, direction=SignalDir.BULLISH, strength=0.5, confidence=0.5, symbol="A", timeframe="1h", timestamp=datetime.utcnow(), metadata={"i": 1})])
    engine._store_signals([QuantSignal(type=SignalType.TREND, direction=SignalDir.BULLISH, strength=0.5, confidence=0.5, symbol="A", timeframe="1h", timestamp=datetime.utcnow(), metadata={"i": 2})])
    assert len(engine._last_signals) == 1
    assert engine._last_signals[0].metadata["i"] == 2


def test_last_signals_returns_copy():
    engine = _TestEngine()
    signals = [QuantSignal(type=SignalType.TREND, direction=SignalDir.BULLISH, strength=0.5, confidence=0.5, symbol="A", timeframe="1h", timestamp=datetime.utcnow())]
    engine._store_signals(signals)
    returned = engine.last_signals
    returned.append(None)
    assert len(engine._last_signals) == 1


def test_compute_if_new_returns_cached():
    engine = _TestEngine()
    dates = pd.date_range("2024-01-01", periods=10, freq="h")
    df = pd.DataFrame({"close": range(10)}, index=dates)
    df.attrs["symbol"] = "TEST"
    df.attrs["timeframe"] = "1h"
    r1 = engine.compute_if_new(df)
    r2 = engine.compute_if_new(df)
    assert r1 == r2


def test_update_appends_bar():
    engine = _TestEngine()
    bar = Bar(symbol="TEST", timestamp=datetime.utcnow(), open=100.0, high=101.0, low=99.0, close=100.5, volume=1000)
    signals = engine.update(bar)
    assert len(signals) > 0
    assert engine._last_bars is not None
