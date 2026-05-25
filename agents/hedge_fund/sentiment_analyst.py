from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class SentimentAnalystPersona(PersonaAgent):
    """Sentiment Analyst — gauges market sentiment and news-driven mood.

    Scoring dimensions (weighted):
      - Market sentiment (50%) — momentum and breadth signals
      - News context     (30%) — recent news impact
      - Crowd extremes   (20%) — fear/greed via volatility extremes
    """

    def __init__(self, agent_id: str = "sentiment_analyst"):
        super().__init__(
            agent_id=agent_id,
            name="Sentiment Analyst",
            persona=(
                "Gauge the mood of the market. Track sentiment indicators, "
                "news flow, and crowd psychology. Be greedy when others are fearful, "
                "fearful when others are greedy."
            ),
        )

    def _score_ticker(
        self,
        ticker: str,
        df: Optional[pd.DataFrame],
        quant_signals: list,
        composite_score: float,
        regime: object,
        portfolio: PortfolioState,
    ) -> AnalystSignal:
        score = 0.0
        reasons = []

        sentiment = self._assess_market_sentiment(df)
        score += 0.50 * sentiment
        reasons.append(f"sent={sentiment:.2f}")

        news = self._assess_news_context(quant_signals)
        score += 0.30 * news
        reasons.append(f"news={news:.2f}")

        extremes = self._assess_crowd_extremes(df)
        score += 0.20 * extremes
        reasons.append(f"crowd={extremes:.2f}")

        signal = "bullish" if score > 0.20 else "bearish" if score < -0.20 else "neutral"
        confidence = min(abs(score), 1.0)

        return AnalystSignal(
            agent=self.agent_id,
            ticker=ticker,
            signal=signal,
            confidence=max(confidence, 0.1),
            reasoning="; ".join(reasons) if reasons else "no clear signal",
            metadata={"raw_score": round(score, 4)},
        )

    def _assess_market_sentiment(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 30:
            return 0.0
        rsi = self._safe_rsi(df)
        if rsi < 25:
            return 0.4
        if rsi < 35:
            return 0.2
        if rsi > 75:
            return -0.4
        if rsi > 65:
            return -0.2
        return 0.0

    def _assess_news_context(self, quant_signals: list) -> float:
        if not quant_signals:
            return 0.0
        bullish = sum(1 for s in quant_signals if "BULLISH" in str(getattr(s, "direction", "")))
        bearish = sum(1 for s in quant_signals if "BEARISH" in str(getattr(s, "direction", "")))
        total = bullish + bearish
        if total < 3:
            return 0.0
        return (bullish - bearish) / total * 0.3

    def _assess_crowd_extremes(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 20:
            return 0.0
        vol = float(df["close"].pct_change().tail(20).std())
        if vol > 0.05:
            return 0.2
        if vol < 0.015:
            return -0.15
        return 0.0
