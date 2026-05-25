from __future__ import annotations

import numpy as np
import pandas as pd

from core.enums import SignalType
from signals.base import SignalEngine


class CandlePatternEngine(SignalEngine):
    """Candlestick pattern recognition.
    Ported from candle_patterns.py.
    """

    def __init__(self):
        super().__init__()

    @property
    def signal_type(self) -> SignalType:
        return SignalType.CANDLE_PATTERN

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        df["body_size"] = abs(df["close"] - df["open"])
        df["total_range"] = df["high"] - df["low"]
        df["total_range"] = df["total_range"].replace(0, np.nan)
        df["is_green"] = df["close"] > df["open"]
        df["is_red"] = df["close"] < df["open"]
        df["upper_wick"] = df["high"] - df[["open", "close"]].max(axis=1)
        df["lower_wick"] = df[["open", "close"]].min(axis=1) - df["low"]

        signals = []
        for i in range(len(df)):
            row = df.iloc[i]
            patterns = []
            # Hammer
            if self._is_hammer(row):
                patterns.append(("hammer", 1, 0.6))
            # Hanging Man
            if self._is_hanging_man(row):
                patterns.append(("hanging_man", -1, 0.6))
            # Inverse Hammer
            if self._is_inverse_hammer(row):
                patterns.append(("inverse_hammer", 1, 0.5))
            # Shooting Star
            if self._is_shooting_star(row):
                patterns.append(("shooting_star", -1, 0.5))
            # Bullish Engulfing (needs prev candle)
            if i > 0 and self._is_bullish_engulfing(df, i):
                patterns.append(("bullish_engulfing", 1, 0.7))
            # Bearish Engulfing
            if i > 0 and self._is_bearish_engulfing(df, i):
                patterns.append(("bearish_engulfing", -1, 0.7))

            for name, direction, confidence in patterns:
                signals.append(self._make_signal(
                    direction=direction,
                    strength=confidence,
                    confidence=confidence,
                    symbol=symbol,
                    timeframe=timeframe,
                    price=float(row["close"]),
                    metadata={"pattern": name},
                ))

        self._store_signals(signals)
        return self._last_signals

    def _is_hammer(self, row) -> bool:
        return bool(
            row["is_green"]
            and row["body_size"] < row["total_range"] * 0.35
            and row["lower_wick"] > row["body_size"] * 2
            and row["upper_wick"] < row["body_size"]
        )

    def _is_hanging_man(self, row) -> bool:
        return bool(
            row["is_red"]
            and row["body_size"] < row["total_range"] * 0.35
            and row["lower_wick"] > row["body_size"] * 2
            and row["upper_wick"] < row["body_size"]
        )

    def _is_inverse_hammer(self, row) -> bool:
        return bool(
            row["is_green"]
            and row["body_size"] < row["total_range"] * 0.35
            and row["upper_wick"] > row["body_size"] * 2
            and row["lower_wick"] < row["body_size"]
        )

    def _is_shooting_star(self, row) -> bool:
        return bool(
            row["is_red"]
            and row["body_size"] < row["total_range"] * 0.35
            and row["upper_wick"] > row["body_size"] * 2
            and row["lower_wick"] < row["body_size"]
        )

    def _is_bullish_engulfing(self, df: pd.DataFrame, i: int) -> bool:
        prev = df.iloc[i - 1]
        curr = df.iloc[i]
        return bool(prev["is_red"] and curr["is_green"] and curr["close"] > prev["high"])

    def _is_bearish_engulfing(self, df: pd.DataFrame, i: int) -> bool:
        prev = df.iloc[i - 1]
        curr = df.iloc[i]
        return bool(prev["is_green"] and curr["is_red"] and curr["close"] < prev["low"])


class EQHEQLEngine(SignalEngine):
    """Equal Highs / Equal Lows detection.
    Ported from candle_patterns.py EQH/EQL logic.
    """

    def __init__(self, threshold_pct: float = 0.0005):
        super().__init__()
        self.threshold_pct = threshold_pct

    @property
    def signal_type(self) -> SignalType:
        return SignalType.EQH_EQL

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0
        median_price = float(np.nanmedian(df["close"].values))
        threshold = median_price * self.threshold_pct

        highs = df["high"].values
        lows = df["low"].values
        eqh_count = 0
        eql_count = 0

        active_highs = []
        active_lows = []
        signals = []

        for i in range(len(df)):
            c_high, c_low = highs[i], lows[i]
            matched_eqh = None
            for h, orig_idx, max_h in active_highs:
                max_h = max(max_h, c_high)
                if max_h > h:
                    continue
                if abs(c_high - h) <= threshold:
                    matched_eqh = (h, orig_idx)
            if matched_eqh:
                eqh_count += 1
                if i == len(df) - 1:
                    signals.append(self._make_signal(
                        direction=-1,  # EQH is bearish (resistance)
                        strength=0.6,
                        confidence=0.5,
                        level=float(matched_eqh[0]),
                        symbol=symbol,
                        timeframe=timeframe,
                        price=last_price,
                        metadata={"type": "EQH", "origin_idx": int(matched_eqh[1])},
                    ))
            else:
                active_highs.append((c_high, i, c_high))

            matched_eql = None
            for l, orig_idx, min_l in active_lows:
                min_l = min(min_l, c_low)
                if min_l < l:
                    continue
                if abs(c_low - l) <= threshold:
                    matched_eql = (l, orig_idx)
            if matched_eql:
                eql_count += 1
                if i == len(df) - 1:
                    signals.append(self._make_signal(
                        direction=1,  # EQL is bullish (support)
                        strength=0.6,
                        confidence=0.5,
                        level=float(matched_eql[0]),
                        symbol=symbol,
                        timeframe=timeframe,
                        price=last_price,
                        metadata={"type": "EQL", "origin_idx": int(matched_eql[1])},
                    ))
            else:
                active_lows.append((c_low, i, c_low))

        self._store_signals(signals)
        return signals
