from __future__ import annotations

from typing import Any

import pandas as pd

from charting.indicators.base import IndicatorPlugin, SignalResult


class MomentumPlugin(IndicatorPlugin):
    name = "momentum"
    version = "1.0.0"

    def required_columns(self) -> list[str]:
        return ["close", "high", "low"]

    def compute(self, data: pd.DataFrame, **params: Any) -> pd.DataFrame:
        result = data[["close"]].copy()

        rsi_length = params.get("rsi_length", 14)
        macd_fast = params.get("macd_fast", 12)
        macd_slow = params.get("macd_slow", 26)
        macd_signal = params.get("macd_signal", 9)
        stoch_k = params.get("stoch_k", 14)
        stoch_d = params.get("stoch_d", 3)

        result["RSI"] = self._compute_rsi(data["close"], rsi_length)
        macd_line, signal_line, histogram = self._compute_macd(
            data["close"], macd_fast, macd_slow, macd_signal
        )
        result["MACD"] = macd_line
        result["MACD_Signal"] = signal_line
        result["MACD_Histogram"] = histogram

        stoch_k_vals, stoch_d_vals = self._compute_stochastic(
            data["high"], data["low"], data["close"], stoch_k, stoch_d
        )
        result["Stoch_K"] = stoch_k_vals
        result["Stoch_D"] = stoch_d_vals

        return result

    def signals(self, data: pd.DataFrame) -> list[SignalResult]:
        signals: list[SignalResult] = []
        if "RSI" not in data.columns:
            return signals

        last_rsi = data["RSI"].iloc[-1] if not data["RSI"].empty else 50
        if pd.isna(last_rsi):
            return signals

        if last_rsi > 70:
            signals.append(SignalResult("RSI_Overbought", "overbought", direction=-1, strength=min((last_rsi - 70) / 30, 1.0)))
        elif last_rsi < 30:
            signals.append(SignalResult("RSI_Oversold", "oversold", direction=1, strength=min((30 - last_rsi) / 30, 1.0)))

        if "MACD_Histogram" in data.columns and len(data) > 1:
            current = data["MACD_Histogram"].iloc[-1]
            previous = data["MACD_Histogram"].iloc[-2]
            if pd.notna(current) and pd.notna(previous):
                if current > 0 and previous <= 0:
                    signals.append(SignalResult("MACD_CrossAbove", "bullish_cross", direction=1, strength=0.8))
                elif current < 0 and previous >= 0:
                    signals.append(SignalResult("MACD_CrossBelow", "bearish_cross", direction=-1, strength=0.8))

        return signals

    def _compute_rsi(self, prices: pd.Series, length: int = 14) -> pd.Series:
        delta = prices.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(span=length, adjust=False).mean()
        avg_loss = loss.ewm(span=length, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, 1e-10)
        return 100 - (100 / (1 + rs))

    def _compute_macd(
        self, prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
    ) -> tuple[pd.Series, pd.Series, pd.Series]:
        ema_fast = prices.ewm(span=fast, adjust=False).mean()
        ema_slow = prices.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    def _compute_stochastic(
        self, high: pd.Series, low: pd.Series, close: pd.Series, k_period: int = 14, d_period: int = 3
    ) -> tuple[pd.Series, pd.Series]:
        lowest_low = low.rolling(window=k_period).min()
        highest_high = high.rolling(window=k_period).max()
        k = 100 * (close - lowest_low) / (highest_high - lowest_low).replace(0, 1e-10)
        d = k.rolling(window=d_period).mean()
        return k, d
