from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class NewsSentimentPersona(PersonaAgent):
    """News Sentiment Analyst — NLP-driven news and headline analysis.

    Scoring dimensions (weighted):
      - Headline bias      (40%) — positive/negative tone
      - Volume spike       (30%) — unusual news activity
      - Narrative shift    (30%) — change in story over time
    """

    def __init__(self, agent_id: str = "news_sentiment"):
        super().__init__(
            agent_id=agent_id,
            name="News Sentiment",
            persona=(
                "Analyze news flow for sentiment signals. Track headline "
                "bias, story volume, and narrative shifts. News moves markets — "
                "react to substance, not noise."
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

        headline = self._assess_headline_bias(quant_signals)
        score += 0.40 * headline
        reasons.append(f"headline={headline:.2f}")

        volume = self._assess_news_volume(df)
        score += 0.30 * volume
        reasons.append(f"volume={volume:.2f}")

        shift = self._assess_narrative_shift(df)
        score += 0.30 * shift
        reasons.append(f"shift={shift:.2f}")

        signal = "bullish" if score > 0.15 else "bearish" if score < -0.15 else "neutral"
        confidence = min(abs(score), 1.0)

        return AnalystSignal(
            agent=self.agent_id,
            ticker=ticker,
            signal=signal,
            confidence=max(confidence, 0.1),
            reasoning="; ".join(reasons) if reasons else "no clear signal",
            metadata={"raw_score": round(score, 4)},
        )

    def _assess_headline_bias(self, quant_signals: list) -> float:
        if not quant_signals:
            return 0.0
        positive = sum(1 for s in quant_signals if "BULLISH" in str(getattr(s, "direction", "")))
        negative = sum(1 for s in quant_signals if "BEARISH" in str(getattr(s, "direction", "")))
        total = positive + negative
        if total < 2:
            return 0.0
        bias = (positive - negative) / total
        return bias * 0.4

    def _assess_news_volume(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 20:
            return 0.0
        vol_ratio = float(df["volume"].tail(5).mean() / max(df["volume"].tail(20).mean(), 1))
        if vol_ratio > 2.0:
            return 0.3
        if vol_ratio > 1.5:
            return 0.15
        if vol_ratio < 0.5:
            return -0.15
        return 0.0

    def _assess_narrative_shift(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 30:
            return 0.0
        recent = float(df["close"].tail(5).mean() / max(df["close"].tail(20).mean(), 1) - 1)
        if abs(recent) > 0.03:
            return 0.2 if recent > 0 else -0.2
        return 0.0
