from __future__ import annotations

import numpy as np
import pandas as pd

from core.enums import RegimeType, SignalType
from signals.base import SignalEngine


class VolatilityRegimeEngine(SignalEngine):
    """ATR-based volatility regime classification."""

    def __init__(self, atr_period: int = 14, vol_lookback: int = 50):
        super().__init__()
        self.atr_period = atr_period
        self.vol_lookback = vol_lookback

    @property
    def signal_type(self) -> SignalType:
        return SignalType.VOLATILITY

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        high, low, close = df["high"].values, df["low"].values, df["close"].values
        tr = np.maximum(high - low, np.maximum(
            np.abs(high - np.roll(close, 1)),
            np.abs(low - np.roll(close, 1)),
        ))
        tr[0] = high[0] - low[0]
        atr = pd.Series(tr).rolling(self.atr_period).mean().values
        atr_pct = atr / close * 100

        current_atr = atr_pct[-1] if len(atr_pct) > 0 else 0
        atr_mean = np.nanmean(atr_pct[-self.vol_lookback:]) if len(atr_pct) >= self.vol_lookback else np.nanmean(atr_pct)
        atr_std = np.nanstd(atr_pct[-self.vol_lookback:]) if len(atr_pct) >= self.vol_lookback else np.nanstd(atr_pct)

        if atr_std == 0 or np.isnan(atr_std):
            regime = RegimeType.RANGE_BOUND
            strength = 0.3
        elif current_atr > atr_mean + 1.5 * atr_std:
            regime = RegimeType.HIGH_VOLATILITY
            strength = 0.8
        elif current_atr < atr_mean - 1.0 * atr_std:
            regime = RegimeType.LOW_VOLATILITY
            strength = 0.7
        else:
            regime = RegimeType.RANGE_BOUND
            strength = 0.5

        signals = [
            self._make_signal(
                direction=0,
                strength=float(strength),
                confidence=0.6,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                metadata={
                    "regime": regime.value,
                    "current_atr_pct": float(current_atr),
                    "atr_mean": float(atr_mean),
                    "atr_std": float(atr_std),
                },
            )
        ]
        self._store_signals(signals)
        return signals
