from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix

from .base import TradingAgent


class SentimentAnalystAgent(TradingAgent):
    """Sentiment analysis agent using market data proxies.

    Ported from ai-hedge-fund/src/agents/sentiment.py.

    Uses fear-greed proxies, volume analysis, and price action
    to estimate market sentiment.
    """

    def __init__(self, agent_id: str = "sentiment_analyst_agent"):
        super().__init__(agent_id=agent_id, role=AgentRole.SENTIMENT)

    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        market_data = kwargs.get("market_data", {})
        results: dict[str, AnalystSignal] = {}

        overall_sentiment = market_data.get("overall_sentiment", "neutral")
        fear_greed = market_data.get("fear_greed_index", 50.0)

        for ticker in tickers:
            price_data = kwargs.get("prices_df", {}).get(ticker)
            if price_data is None or len(price_data) < 20:
                results[ticker] = self._make_signal(ticker, "neutral", 0.4, "Insufficient sentiment data")
                continue

            df = price_data
            volume_ratio = self._volume_sentiment(df)
            price_sentiment = self._price_sentiment(df)

            sentiment_score = 0.0
            components = 0

            if volume_ratio is not None:
                sentiment_score += volume_ratio
                components += 1
            if price_sentiment is not None:
                sentiment_score += price_sentiment
                components += 1

            fg_normalized = (fear_greed - 50.0) / 50.0
            sentiment_score += fg_normalized
            components += 1

            avg_score = sentiment_score / max(components, 1)

            if avg_score > 0.3:
                signal = "bullish"
                confidence = min(abs(avg_score), 1.0)
            elif avg_score < -0.3:
                signal = "bearish"
                confidence = min(abs(avg_score), 1.0)
            else:
                signal = "neutral"
                confidence = 0.5

            results[ticker] = self._make_signal(
                ticker=ticker,
                signal=signal,
                confidence=confidence,
                reasoning=f"vol_ratio={volume_ratio:.2f}, price_sent={price_sentiment:.2f}, fg={fear_greed:.0f}",
                metadata={"fear_greed": fear_greed, "overall": overall_sentiment},
            )

        return results

    @staticmethod
    def _volume_sentiment(df: pd.DataFrame) -> Optional[float]:
        if "volume" not in df.columns or len(df) < 20:
            return None
        recent_vol = df["volume"].tail(5).mean()
        avg_vol = df["volume"].tail(20).mean()
        if avg_vol == 0:
            return None
        ratio = recent_vol / avg_vol
        if ratio > 1.5:
            close_dir = df["close"].tail(5).pct_change().sum()
            return 1.0 if close_dir > 0 else -1.0
        return 0.0

    @staticmethod
    def _price_sentiment(df: pd.DataFrame) -> Optional[float]:
        if len(df) < 10:
            return None
        closes = df["close"].values
        up_days = np.sum(np.diff(closes) > 0)
        total = len(closes) - 1
        if total == 0:
            return None
        return (up_days / total - 0.5) * 2
