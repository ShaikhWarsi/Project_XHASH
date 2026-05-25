from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class RakeshJhunjhunwalaAgent(PersonaAgent):
    """Rakesh Jhunjhunwala persona — emerging market value with growth.

    Scoring dimensions (weighted):
      - Growth potential   (35%) — high-growth emerging story
      - Value entry        (35%) — reasonable price for growth
      - Market leadership  (30%) — dominant position, promoter quality
    """

    def __init__(self, agent_id: str = "rakesh_jhunjhunwala"):
        super().__init__(
            agent_id=agent_id,
            name="Rakesh Jhunjhunwala",
            persona=(
                "Find multi-baggers in high-growth markets. Look for strong "
                "management, market leadership, and growth at a reasonable price. "
                "Patience is key — hold for the long term."
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

        growth = self._assess_growth_prospects(df, quant_signals)
        score += 0.35 * growth
        reasons.append(f"growth={growth:.2f}")

        value_entry = self._assess_value_entry_point(df, composite_score)
        score += 0.35 * value_entry
        reasons.append(f"value={value_entry:.2f}")

        leadership = self._assess_market_leadership(df, quant_signals)
        score += 0.30 * leadership
        reasons.append(f"leader={leadership:.2f}")

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

    def _assess_growth_prospects(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        growth = 0.0
        if df is not None and len(df) > 50:
            returns_3m = float(df["close"].pct_change().tail(63).sum()) if len(df) > 63 else 0
            if returns_3m > 0.15:
                growth += 0.25
            elif returns_3m > 0.05:
                growth += 0.10
        for s in quant_signals:
            if getattr(s, "strength", 0) > 0.6 and "BULLISH" in str(getattr(s, "direction", "")):
                growth += 0.05
        return min(growth, 0.5)

    def _assess_value_entry_point(self, df: Optional[pd.DataFrame], composite_score: float) -> float:
        if df is not None and len(df) > 30:
            rsi = self._safe_rsi(df)
            if rsi < 40 and composite_score > 0:
                return 0.30
            if rsi < 30:
                return 0.35
            if rsi > 70:
                return -0.20
        return composite_score * 0.3

    def _assess_market_leadership(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        leader = 0.0
        if df is not None and len(df) > 60:
            vol = float(df["close"].pct_change().dropna().std())
            if vol < 0.03:
                leader += 0.20
            sma_200 = self._sma(df, 200)
            price = self._price(df)
            if price and sma_200 and price > sma_200:
                leader += 0.10
        return leader
