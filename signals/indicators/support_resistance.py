from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.signal import find_peaks

from core.enums import SignalType
from signals.base import SignalEngine


class SupportResistanceEngine(SignalEngine):
    """Support and resistance level detection via peak/trough analysis.
    Ported from TechnicalAnalysisAutomation/mp_support_resist.py
    and perceptually_important.py.
    """

    def __init__(self, n_levels: int = 5, min_distance: int = 20):
        super().__init__()
        self.n_levels = n_levels
        self.min_distance = min_distance

    @property
    def signal_type(self) -> SignalType:
        return SignalType.SUPPORT_RESISTANCE

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        highs = df["high"].values
        lows = df["low"].values

        resistance_idx, _ = find_peaks(highs, distance=self.min_distance, prominence=np.std(highs) * 0.5)
        support_idx, _ = find_peaks(-lows, distance=self.min_distance, prominence=np.std(lows) * 0.5)

        resistance_levels = sorted(set(highs[i] for i in resistance_idx), reverse=True)[:self.n_levels]
        support_levels = sorted(set(lows[i] for i in support_idx))[:self.n_levels]

        signals = []
        for level in resistance_levels:
            prox = 1.0 - min(abs(last_price - level) / max(last_price, 1), 0.5)
            signals.append(self._make_signal(
                direction=-1,
                strength=prox,
                confidence=0.5,
                level=float(level),
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                metadata={"type": "resistance"},
            ))
        for level in support_levels:
            prox = 1.0 - min(abs(last_price - level) / max(last_price, 1), 0.5)
            signals.append(self._make_signal(
                direction=1,
                strength=prox,
                confidence=0.5,
                level=float(level),
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                metadata={"type": "support"},
            ))
        self._store_signals(signals)
        return signals
