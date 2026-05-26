from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd

from core.enums import SignalType
from core.types import Bar, QuantSignal


@dataclass
class SignalResult:
    engine: str
    signals: list[QuantSignal]
    timestamp: datetime
    metadata: dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class SignalEngine(ABC):
    _last_bars: pd.DataFrame | None = None

    def __init__(self, max_stored_signals: int = 100):
        self._last_signals: list[QuantSignal] = []
        self._max_stored_signals = max_stored_signals

    @abstractmethod
    def compute(self, bars: pd.DataFrame) -> list[QuantSignal]:
        pass

    @staticmethod
    def _normalize_to_signal(raw: float, low: float = -1.0, high: float = 1.0) -> float:
        return max(low, min(high, raw))

    @staticmethod
    def _sigmoid(x: float, scale: float = 5.0) -> float:
        return float(np.tanh(x * scale))

    @staticmethod
    def _percentile_rank(value: float, values: list[float]) -> float:
        if not values:
            return 50.0
        below = sum(1 for v in values if v < value)
        return (below / len(values)) * 100.0

    def update(self, bar: Bar) -> list[QuantSignal]:
        row = pd.DataFrame([{
            "open": bar.open, "high": bar.high, "low": bar.low,
            "close": bar.close, "volume": bar.volume,
        }], index=[bar.timestamp])
        if self._last_bars is None:
            self._last_bars = row
        else:
            self._last_bars = pd.concat([self._last_bars, row]).iloc[-5000:]
        signals = self.compute(self._last_bars)
        self._store_signals(signals)
        return signals

    def compute_if_new(self, bars: pd.DataFrame) -> list[QuantSignal]:
        if self._last_bars is not None and len(bars) == len(self._last_bars) and bars.index[-1] == self._last_bars.index[-1]:
            return self._last_signals
        self._last_bars = bars
        signals = self.compute(bars)
        self._store_signals(signals)
        return signals

    @property
    @abstractmethod
    def signal_type(self) -> SignalType: ...

    @property
    def last_signals(self) -> list[QuantSignal]:
        return list(self._last_signals)

    def _store_signals(self, signals: list[QuantSignal]):
        if len(signals) > self._max_stored_signals:
            signals = signals[-self._max_stored_signals:]
        self._last_signals = signals

    def _make_signal(
        self,
        direction: int,
        strength: float,
        confidence: float,
        symbol: str,
        timeframe: str,
        price: Optional[float] = None,
        level: Optional[float] = None,
        metadata: Optional[dict] = None,
    ) -> QuantSignal:
        from core.enums import SignalDir
        return QuantSignal(
            type=self.signal_type,
            direction=SignalDir.BULLISH if direction > 0 else (SignalDir.BEARISH if direction < 0 else SignalDir.NEUTRAL),
            strength=min(max(strength, 0.0), 1.0),
            confidence=min(max(confidence, 0.0), 1.0),
            symbol=symbol,
            timeframe=timeframe,
            timestamp=datetime.utcnow(),
            price=price,
            level=level,
            metadata=metadata or {},
        )
