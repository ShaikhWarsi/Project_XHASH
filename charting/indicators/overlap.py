from __future__ import annotations

from typing import Any

import pandas as pd

from charting.indicators.base import IndicatorPlugin, SignalResult


class OverlapPlugin(IndicatorPlugin):
    name = "overlap"
    version = "1.0.0"

    def required_columns(self) -> list[str]:
        return ["close"]

    def compute(self, data: pd.DataFrame, **params: Any) -> pd.DataFrame:
        result = data[["close"]].copy()

        sma_lengths = params.get("sma_lengths", [20, 50, 200])
        ema_lengths = params.get("ema_lengths", [20, 50])

        for length in sma_lengths:
            result[f"SMA_{length}"] = data["close"].rolling(window=length, min_periods=length).mean()

        for length in ema_lengths:
            result[f"EMA_{length}"] = data["close"].ewm(span=length, adjust=False).mean()

        vwap_period = params.get("vwap_period", 0)
        if vwap_period > 0 and "volume" in data.columns and "high" in data.columns and "low" in data.columns:
            typical_price = (data["high"] + data["low"] + data["close"]) / 3
            cum_valid = typical_price * data["volume"]
            cum_vol = data["volume"]
            if vwap_period > 0:
                cum_valid = cum_valid.rolling(vwap_period).sum()
                cum_vol = cum_vol.rolling(vwap_period).sum()
            result["VWAP"] = cum_valid / cum_vol.replace(0, 1e-10)

        return result

    def signals(self, data: pd.DataFrame) -> list[SignalResult]:
        signals: list[SignalResult] = []

        close = data["close"]
        if "SMA_50" in data.columns and "SMA_200" in data.columns:
            last_50 = data["SMA_50"].iloc[-1] if not data["SMA_50"].empty else None
            last_200 = data["SMA_200"].iloc[-1] if not data["SMA_200"].empty else None
            if pd.notna(last_50) and pd.notna(last_200):
                if last_50 > last_200:
                    signals.append(SignalResult("Golden_Cross", "golden_cross", direction=1, strength=0.7))
                elif last_50 < last_200:
                    signals.append(SignalResult("Death_Cross", "death_cross", direction=-1, strength=0.7))

        if "VWAP" in data.columns:
            last_close = close.iloc[-1] if not close.empty else None
            last_vwap = data["VWAP"].iloc[-1] if not data["VWAP"].empty else None
            if pd.notna(last_close) and pd.notna(last_vwap):
                if last_close > last_vwap:
                    signals.append(SignalResult("Above_VWAP", "bullish", direction=1, strength=0.4))
                else:
                    signals.append(SignalResult("Below_VWAP", "bearish", direction=-1, strength=0.4))

        return signals
