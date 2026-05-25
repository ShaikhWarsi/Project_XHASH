from __future__ import annotations

import numpy as np
import pandas as pd

from core.enums import RegimeType, SignalType
from signals.base import SignalEngine


class TrendRegimeEngine(SignalEngine):
    """ADX + moving average based trend regime detection."""

    def __init__(self, adx_period: int = 14, fast_ma: int = 20, slow_ma: int = 50):
        super().__init__()
        self.adx_period = adx_period
        self.fast_ma = fast_ma
        self.slow_ma = slow_ma

    @property
    def signal_type(self) -> SignalType:
        return SignalType.TREND

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        close = df["close"].values
        high, low = df["high"].values, df["low"].values

        # ADX
        tr = np.maximum(high - low, np.maximum(
            np.abs(high - np.roll(close, 1)),
            np.abs(low - np.roll(close, 1)),
        ))
        tr[0] = high[0] - low[0]
        up = high[1:] - high[:-1]
        down = low[:-1] - low[1:]
        plus_dm = np.where((up > down) & (up > 0), up, 0)
        minus_dm = np.where((down > up) & (down > 0), down, 0)
        plus_dm = np.insert(plus_dm, 0, 0)
        minus_dm = np.insert(minus_dm, 0, 0)

        atr = pd.Series(tr).rolling(self.adx_period).mean().values
        plus_di = 100 * pd.Series(plus_dm).rolling(self.adx_period).mean().values / np.maximum(atr, 1e-10)
        minus_di = 100 * pd.Series(minus_dm).rolling(self.adx_period).mean().values / np.maximum(atr, 1e-10)
        dx = 100 * np.abs(plus_di - minus_di) / np.maximum(plus_di + minus_di, 1e-10)
        adx = pd.Series(dx).rolling(self.adx_period).mean().values

        # MAs
        fast = pd.Series(close).rolling(self.fast_ma).mean().values
        slow = pd.Series(close).rolling(self.slow_ma).mean().values

        current_adx = adx[-1] if len(adx) > 0 else 0
        current_fast = fast[-1] if len(fast) > 0 else last_price
        current_slow = slow[-1] if len(slow) > 0 else last_price

        trend_strength = min(current_adx / 50.0, 1.0) if current_adx > 0 else 0

        if current_adx > 25 and current_fast > current_slow:
            regime = RegimeType.BULL_TREND
            direction = 1
        elif current_adx > 25 and current_fast < current_slow:
            regime = RegimeType.BEAR_TREND
            direction = -1
        else:
            regime = RegimeType.RANGE_BOUND
            direction = 0

        signals = [
            self._make_signal(
                direction=direction,
                strength=float(trend_strength),
                confidence=float(trend_strength),
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                metadata={
                    "regime": regime.value,
                    "adx": float(current_adx),
                    "fast_ma": float(current_fast),
                    "slow_ma": float(current_slow),
                },
            )
        ]
        self._store_signals(signals)
        return signals
