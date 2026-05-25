from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class BillAckmanAgent(PersonaAgent):
    """Bill Ackman persona — activist investing, concentrated bets.

    Scoring dimensions (weighted):
      - Catalyst potential  (40%) — clear path to value unlock
      - Quality & moat      (30%) — strong businesses worth defending
      - Positioning         (30%) — concentration, conviction sizing
    """

    def __init__(self, agent_id: str = "bill_ackman"):
        super().__init__(
            agent_id=agent_id,
            name="Bill Ackman",
            persona=(
                "High-conviction, concentrated activist investments. "
                "Find simple, understandable businesses with clear catalysts. "
                "Engage management, unlock value, be prepared to be patient."
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

        catalyst = self._assess_catalyst(df, quant_signals)
        score += 0.40 * catalyst
        reasons.append(f"catalyst={catalyst:.2f}")

        quality = self._assess_business_quality(df, quant_signals)
        score += 0.30 * quality
        reasons.append(f"quality={quality:.2f}")

        positioning = self._assess_positioning_score(ticker, portfolio, df)
        score += 0.30 * positioning
        reasons.append(f"position={positioning:.2f}")

        signal = "bullish" if score > 0.25 else "bearish" if score < -0.20 else "neutral"
        confidence = min(abs(score), 1.0)

        return AnalystSignal(
            agent=self.agent_id,
            ticker=ticker,
            signal=signal,
            confidence=max(confidence, 0.1),
            reasoning="; ".join(reasons) if reasons else "no clear signal",
            metadata={"raw_score": round(score, 4)},
        )

    def _assess_catalyst(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        catalyst = 0.0
        for s in quant_signals:
            if "BREAKOUT" in str(getattr(s, "type", "")) or "breakout" in str(getattr(s, "type", "")).lower():
                catalyst += 0.2
            if "BOS" in str(getattr(s, "type", "")):
                catalyst += 0.15
        if df is not None and len(df) > 30:
            recent = df["close"].tail(10)
            if len(recent) > 1 and float(recent.iloc[-1]) > float(recent.iloc[0]) * 1.05:
                catalyst += 0.1
        return min(catalyst, 0.5)

    def _assess_business_quality(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        quality = 0.0
        if df is not None and len(df) > 60:
            vol = float(df["close"].pct_change().dropna().std())
            if vol < 0.03:
                quality += 0.2
        for s in quant_signals:
            if getattr(s, "strength", 0) > 0.6:
                quality += 0.1
        return min(quality, 0.5)

    def _assess_positioning_score(self, ticker: str, portfolio: PortfolioState, df: Optional[pd.DataFrame]) -> float:
        pos = portfolio.positions.get(ticker)
        if pos is None:
            return -0.1
        pct = pos.market_value / max(portfolio.total_value, 1)
        if pct > 0.15:
            return -0.3
        if pct > 0.05:
            return 0.2
        return 0.1
