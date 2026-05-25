from __future__ import annotations

import numpy as np
import pandas as pd

from core.enums import SignalType
from core.types import Bar
from signals.base import SignalEngine


class OrderBlockEngine(SignalEngine):
    """Order Block detection + FVG confirmation.
    Ported from custom_ob.py and smc_analysis.py.
    """

    def __init__(self, pivot_len: int = 5, fvg_lookback: int = 7, body_size_mult: float = 1.5):
        super().__init__()
        self.pivot_len = pivot_len
        self.fvg_lookback = fvg_lookback
        self.body_size_mult = body_size_mult

    @property
    def signal_type(self) -> SignalType:
        return SignalType.ORDER_BLOCK

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        df["body_size"] = abs(df["close"] - df["open"])
        df["avg_body_size"] = df["body_size"].rolling(window=20).mean()
        df["is_red"] = df["close"] < df["open"]
        df["is_green"] = df["close"] > df["open"]
        df["pivot_low"] = df["low"].rolling(window=2 * self.pivot_len + 1, center=True).min() == df["low"]
        df["pivot_high"] = df["high"].rolling(window=2 * self.pivot_len + 1, center=True).max() == df["high"]

        signals = []
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        for i in range(self.pivot_len, len(df)):
            obs = self._detect_bullish_ob(df, i) + self._detect_bearish_ob(df, i)
            for ob in obs:
                proximity = 1.0 - min(abs(last_price - ob["level"]) / max(last_price, 1), 1.0)
                is_mitigated = ob["mitigated"]
                signals.append(self._make_signal(
                    direction=-1 if ob["type"] == "Bearish" else 1,
                    strength=0.0 if is_mitigated else proximity,
                    confidence=0.7 if not is_mitigated else 0.0,
                    level=ob["level"],
                    symbol=symbol,
                    timeframe=timeframe,
                    price=last_price,
                    metadata={"type": ob["type"], "top": ob["top"], "bottom": ob["bottom"], "mitigated": is_mitigated},
                ))
        self._store_signals(signals)
        return signals

    def update(self, bar: Bar) -> list:
        return self._last_signals

    def _detect_bullish_ob(self, df: pd.DataFrame, i: int) -> list[dict]:
        if not df["pivot_low"].iloc[i]:
            return []
        found_pair = False
        red_idx = green_idx = -1
        if i > 0 and df["is_red"].iloc[i - 1] and df["is_green"].iloc[i]:
            red_idx, green_idx = i - 1, i
            found_pair = True
        elif i + 1 < len(df) and df["is_red"].iloc[i] and df["is_green"].iloc[i + 1]:
            red_idx, green_idx = i, i + 1
            found_pair = True
        if not found_pair:
            return []
        top = df["high"].iloc[red_idx]
        bottom = df["low"].iloc[green_idx]
        fvg_idx = -1
        for k in range(green_idx + 1, min(green_idx + self.fvg_lookback + 1, len(df))):
            if df["is_green"].iloc[k] and df["body_size"].iloc[k] > df["avg_body_size"].iloc[k] * self.body_size_mult:
                fvg_idx = k
                break
        if fvg_idx == -1:
            return []
        mitigation_level = min(df["low"].iloc[red_idx], df["low"].iloc[green_idx])
        is_mitigated = any(df["close"].iloc[m] < mitigation_level for m in range(fvg_idx + 1, len(df)))
        level = (top + bottom) / 2
        return [{"type": "Bullish", "level": level, "top": top, "bottom": bottom, "mitigated": is_mitigated}]

    def _detect_bearish_ob(self, df: pd.DataFrame, i: int) -> list[dict]:
        if not df["pivot_high"].iloc[i]:
            return []
        found_pair = False
        green_idx = red_idx = -1
        if i > 0 and df["is_green"].iloc[i - 1] and df["is_red"].iloc[i]:
            green_idx, red_idx = i - 1, i
            found_pair = True
        elif i + 1 < len(df) and df["is_green"].iloc[i] and df["is_red"].iloc[i + 1]:
            green_idx, red_idx = i, i + 1
            found_pair = True
        if not found_pair:
            return []
        top = df["high"].iloc[green_idx]
        bottom = df["low"].iloc[red_idx]
        fvg_idx = -1
        for k in range(red_idx + 1, min(red_idx + self.fvg_lookback + 1, len(df))):
            if df["is_red"].iloc[k] and df["body_size"].iloc[k] > df["avg_body_size"].iloc[k] * self.body_size_mult:
                fvg_idx = k
                break
        if fvg_idx == -1:
            return []
        mitigation_level = max(df["high"].iloc[green_idx], df["high"].iloc[red_idx])
        is_mitigated = any(df["close"].iloc[m] > mitigation_level for m in range(fvg_idx + 1, len(df)))
        level = (top + bottom) / 2
        return [{"type": "Bearish", "level": level, "top": top, "bottom": bottom, "mitigated": is_mitigated}]


class FVGEngine(SignalEngine):
    """Fair Value Gap detection. Ported from smc_analysis.py _fvg_local."""

    def __init__(self, join_consecutive: bool = False):
        super().__init__()
        self.join_consecutive = join_consecutive

    @property
    def signal_type(self) -> SignalType:
        return SignalType.FVG

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        fvg = np.where(
            ((df["high"].shift(1) < df["low"].shift(-1)) & (df["close"] > df["open"]))
            | ((df["low"].shift(1) > df["high"].shift(-1)) & (df["close"] < df["open"])),
            np.where(df["close"] > df["open"], 1, -1),
            np.nan,
        )
        top = np.where(~np.isnan(fvg), np.where(df["close"] > df["open"], df["low"].shift(-1), df["low"].shift(1)), np.nan)
        bottom = np.where(~np.isnan(fvg), np.where(df["close"] > df["open"], df["high"].shift(1), df["high"].shift(-1)), np.nan)

        signals = []
        for i in np.where(~np.isnan(fvg))[0]:
            direction = 1 if fvg[i] == 1 else -1
            gap_top = float(top[i])
            gap_bottom = float(bottom[i])
            level = (gap_top + gap_bottom) / 2
            gap_size_pct = abs(gap_top - gap_bottom) / max(level, 0.01)
            confidence = min(gap_size_pct * 10, 1.0)
            signals.append(self._make_signal(
                direction=direction,
                strength=confidence,
                confidence=confidence,
                level=level,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                metadata={"top": gap_top, "bottom": gap_bottom, "gap_size_pct": gap_size_pct},
            ))
        self._store_signals(signals)
        return signals
