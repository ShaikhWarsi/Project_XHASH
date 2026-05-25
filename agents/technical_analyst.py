from __future__ import annotations

import logging
import math

import numpy as np
import pandas as pd

from core.enums import AgentRole

logger = logging.getLogger(__name__)
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix

from .base import TradingAgent


class TechnicalAnalystAgent(TradingAgent):
    """Multi-strategy technical analysis agent.

    Ported from ai-hedge-fund/src/agents/technicals.py.

    Combines: trend following, mean reversion, momentum,
    volatility analysis, and statistical arbitrage signals.
    """

    def __init__(self, agent_id: str = "technical_analyst_agent"):
        super().__init__(agent_id=agent_id, role=AgentRole.TECHNICAL)
        self.strategy_weights = {
            "trend": 0.25,
            "mean_reversion": 0.20,
            "momentum": 0.25,
            "volatility": 0.15,
            "stat_arb": 0.15,
        }

    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        prices_df = kwargs.get("prices_df", {})
        results: dict[str, AnalystSignal] = {}

        for ticker in tickers:
            df = prices_df.get(ticker)
            if df is None or len(df) < 50:
                results[ticker] = self._make_signal(ticker, "neutral", 0.0, "Insufficient data")
                continue

            trend_sig = self._calculate_trend_signals(df)
            mr_sig = self._calculate_mean_reversion_signals(df)
            mom_sig = self._calculate_momentum_signals(df)
            vol_sig = self._calculate_volatility_signals(df)
            stat_sig = self._calculate_stat_arb_signals(df)

            combined = self._weighted_combination({
                "trend": trend_sig,
                "mean_reversion": mr_sig,
                "momentum": mom_sig,
                "volatility": vol_sig,
                "stat_arb": stat_sig,
            })

            results[ticker] = self._make_signal(
                ticker=ticker,
                signal=combined["signal"],
                confidence=combined["confidence"],
                reasoning=(
                    f"trend={trend_sig['signal']}/{trend_sig['confidence']:.2f} "
                    f"mr={mr_sig['signal']}/{mr_sig['confidence']:.2f} "
                    f"mom={mom_sig['signal']}/{mom_sig['confidence']:.2f} "
                    f"vol={vol_sig['signal']}/{vol_sig['confidence']:.2f} "
                    f"stat={stat_sig['signal']}/{stat_sig['confidence']:.2f}"
                ),
                metadata={
                    "trend": trend_sig,
                    "mean_reversion": mr_sig,
                    "momentum": mom_sig,
                    "volatility": vol_sig,
                    "stat_arb": stat_sig,
                },
            )

        return results

    # ── Signal Calculators ────────────────────

    def _calculate_trend_signals(self, df: pd.DataFrame) -> dict:
        ema_8 = df["close"].ewm(span=8, adjust=False).mean()
        ema_21 = df["close"].ewm(span=21, adjust=False).mean()
        ema_55 = df["close"].ewm(span=55, adjust=False).mean()
        adx = self._calculate_adx(df)
        trend_strength = float(adx["adx"].iloc[-1] / 100.0) if len(adx) > 0 else 0.3

        if ema_8.iloc[-1] > ema_21.iloc[-1] and ema_21.iloc[-1] > ema_55.iloc[-1]:
            signal = "bullish"
        elif ema_8.iloc[-1] < ema_21.iloc[-1] and ema_21.iloc[-1] < ema_55.iloc[-1]:
            signal = "bearish"
        else:
            signal = "neutral"

        return {"signal": signal, "confidence": trend_strength}

    def _calculate_mean_reversion_signals(self, df: pd.DataFrame) -> dict:
        ma_50 = df["close"].rolling(50).mean()
        std_50 = df["close"].rolling(50).std()
        z_score = (df["close"] - ma_50) / std_50
        bb_upper, bb_lower = self._calculate_bollinger_bands(df)
        rsi_14 = self._calculate_rsi(df, 14)

        price_vs_bb = (df["close"].iloc[-1] - bb_lower.iloc[-1]) / max(bb_upper.iloc[-1] - bb_lower.iloc[-1], 1e-10)

        z = z_score.iloc[-1]
        if z < -2 and price_vs_bb < 0.2:
            signal = "bullish"
            confidence = min(abs(z) / 4, 1.0)
        elif z > 2 and price_vs_bb > 0.8:
            signal = "bearish"
            confidence = min(abs(z) / 4, 1.0)
        else:
            signal = "neutral"
            confidence = 0.5

        return {"signal": signal, "confidence": confidence}

    def _calculate_momentum_signals(self, df: pd.DataFrame) -> dict:
        returns = df["close"].pct_change()
        mom_1m = returns.rolling(21).sum().iloc[-1]
        mom_3m = returns.rolling(63).sum().iloc[-1]
        mom_6m = returns.rolling(126).sum().iloc[-1]
        volume_ma = df["volume"].rolling(21).mean()
        volume_momentum = (df["volume"] / volume_ma).iloc[-1]

        momentum_score = 0.4 * mom_1m + 0.3 * mom_3m + 0.3 * mom_6m
        volume_confirmation = volume_momentum > 1.0

        if momentum_score > 0.05 and volume_confirmation:
            signal = "bullish"
            confidence = min(abs(momentum_score) * 5, 1.0)
        elif momentum_score < -0.05 and volume_confirmation:
            signal = "bearish"
            confidence = min(abs(momentum_score) * 5, 1.0)
        else:
            signal = "neutral"
            confidence = 0.5

        return {"signal": signal, "confidence": confidence}

    def _calculate_volatility_signals(self, df: pd.DataFrame) -> dict:
        returns = df["close"].pct_change()
        hist_vol = returns.rolling(21).std() * math.sqrt(252)
        vol_ma = hist_vol.rolling(63).mean()
        vol_regime = hist_vol / vol_ma
        vol_z = (hist_vol - vol_ma) / hist_vol.rolling(63).std()

        current_regime = vol_regime.iloc[-1]
        z = vol_z.iloc[-1]

        if current_regime < 0.8 and z < -1:
            signal = "bullish"
            confidence = min(abs(z) / 3, 1.0)
        elif current_regime > 1.2 and z > 1:
            signal = "bearish"
            confidence = min(abs(z) / 3, 1.0)
        else:
            signal = "neutral"
            confidence = 0.5

        return {"signal": signal, "confidence": confidence}

    def _calculate_stat_arb_signals(self, df: pd.DataFrame) -> dict:
        returns = df["close"].pct_change()
        skew = returns.rolling(63).skew().iloc[-1]
        hurst = self._calculate_hurst_exponent(df["close"])

        if hurst < 0.4 and skew > 1:
            signal = "bullish"
            confidence = (0.5 - hurst) * 2
        elif hurst < 0.4 and skew < -1:
            signal = "bearish"
            confidence = (0.5 - hurst) * 2
        else:
            signal = "neutral"
            confidence = 0.5

        return {"signal": signal, "confidence": min(confidence, 1.0)}

    # ── Helpers ───────────────────────────────

    def _weighted_combination(self, signals: dict[str, dict]) -> dict:
        signal_values = {"bullish": 1, "neutral": 0, "bearish": -1}
        weighted_sum = 0.0
        total_confidence = 0.0

        for strategy, sig in signals.items():
            numeric = signal_values.get(sig["signal"], 0)
            weight = self.strategy_weights.get(strategy, 0.2)
            conf = sig.get("confidence", 0.5)
            weighted_sum += numeric * weight * conf
            total_confidence += weight * conf

        final_score = weighted_sum / max(total_confidence, 1e-10)

        if final_score > 0.2:
            return {"signal": "bullish", "confidence": abs(final_score)}
        elif final_score < -0.2:
            return {"signal": "bearish", "confidence": abs(final_score)}
        return {"signal": "neutral", "confidence": abs(final_score)}

    @staticmethod
    def _calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0).fillna(0)
        loss = (-delta.where(delta < 0, 0)).fillna(0)
        avg_gain = gain.rolling(period).mean()
        avg_loss = loss.rolling(period).mean()
        rs = avg_gain / avg_loss.replace(0, 1e-10)
        return 100 - (100 / (1 + rs))

    @staticmethod
    def _calculate_bollinger_bands(df: pd.DataFrame, window: int = 20):
        sma = df["close"].rolling(window).mean()
        std = df["close"].rolling(window).std()
        return sma + std * 2, sma - std * 2

    @staticmethod
    def _calculate_adx(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
        hl = df["high"] - df["low"]
        hc = abs(df["high"] - df["close"].shift())
        lc = abs(df["low"] - df["close"].shift())
        tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)

        up_move = df["high"] - df["high"].shift(1)
        down_move = df["low"].shift(1) - df["low"]
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0)

        plus_di = 100 * (pd.Series(plus_dm, index=df.index).ewm(span=period).mean() / tr.ewm(span=period).mean())
        minus_di = 100 * (pd.Series(minus_dm, index=df.index).ewm(span=period).mean() / tr.ewm(span=period).mean())
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di).replace(0, 1e-10)
        adx = dx.ewm(span=period).mean()
        return pd.DataFrame({"adx": adx, "+di": plus_di, "-di": minus_di})

    @staticmethod
    def _calculate_hurst_exponent(price_series: pd.Series, max_lag: int = 20) -> float:
        lags = range(2, max_lag)
        try:
            tau = [max(1e-8, np.sqrt(np.std(np.subtract(price_series[lag:].values, price_series[:-lag].values)))) for lag in lags]
            reg = np.polyfit(np.log(lags), np.log(tau), 1)
            return float(reg[0])
        except Exception as e:
            logger.debug("Hurst exponent calc failed: %s", e)
            return 0.5
