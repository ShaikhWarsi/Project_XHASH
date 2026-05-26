from __future__ import annotations

from typing import Any

import pandas as pd

from charting.indicators.base import IndicatorPlugin, SignalResult


class VolatilityPlugin(IndicatorPlugin):
    name = "volatility"
    version = "1.0.0"

    def required_columns(self) -> list[str]:
        return ["close", "high", "low"]

    def compute(self, data: pd.DataFrame, **params: Any) -> pd.DataFrame:
        result = pd.DataFrame(index=data.index)

        bb_length = params.get("bb_length", 20)
        bb_std = params.get("bb_std", 2.0)
        atr_length = params.get("atr_length", 14)

        result["BB_Middle"] = data["close"].rolling(window=bb_length, min_periods=bb_length).mean()
        bb_std_val = data["close"].rolling(window=bb_length, min_periods=bb_length).std()
        result["BB_Upper"] = result["BB_Middle"] + bb_std * bb_std_val
        result["BB_Lower"] = result["BB_Middle"] - bb_std * bb_std_val
        result["BB_Width"] = (result["BB_Upper"] - result["BB_Lower"]) / result["BB_Middle"] * 100

        result["ATR"] = self._compute_atr(data["high"], data["low"], data["close"], atr_length)

        return result

    def signals(self, data: pd.DataFrame) -> list[SignalResult]:
        signals: list[SignalResult] = []

        if all(c in data.columns for c in ["BB_Upper", "BB_Lower", "close"]):
            last_close = data["close"].iloc[-1] if not data["close"].empty else None
            last_upper = data["BB_Upper"].iloc[-1] if not data["BB_Upper"].empty else None
            last_lower = data["BB_Lower"].iloc[-1] if not data["BB_Lower"].empty else None
            if pd.notna(last_close) and pd.notna(last_upper) and pd.notna(last_lower):
                if last_close >= last_upper:
                    signals.append(SignalResult("BB_Touch_Upper", "overextended_up", direction=-1, strength=0.6))
                elif last_close <= last_lower:
                    signals.append(SignalResult("BB_Touch_Lower", "overextended_down", direction=1, strength=0.6))

            if "BB_Width" in data.columns:
                recent_widths = data["BB_Width"].dropna().tail(20)
                if len(recent_widths) >= 10:
                    avg_width = recent_widths.mean()
                    if avg_width < 5:
                        signals.append(SignalResult("BB_Squeeze", "squeeze", direction=0, strength=0.5, metadata={"width": avg_width}))

        if "ATR" in data.columns:
            atr_vals = data["ATR"].dropna()
            if len(atr_vals) > 14:
                atr_ratio = atr_vals.iloc[-1] / atr_vals.tail(14).mean() if atr_vals.tail(14).mean() > 0 else 1
                if atr_ratio > 1.5:
                    signals.append(SignalResult("ATR_Spike", "volatility_spike", direction=0, strength=min((atr_ratio - 1.5) / 2, 1.0), metadata={"atr_ratio": atr_ratio}))

        return signals

    def _compute_atr(self, high: pd.Series, low: pd.Series, close: pd.Series, length: int = 14) -> pd.Series:
        prev_close = close.shift(1)
        tr = pd.concat([
            (high - low).abs(),
            (high - prev_close).abs(),
            (low - prev_close).abs(),
        ], axis=1).max(axis=1)
        return tr.rolling(window=length, min_periods=length).mean()
