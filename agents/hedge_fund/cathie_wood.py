from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class CathieWoodAgent(PersonaAgent):
    """Cathie Wood persona — disruptive innovation at scale.

    Scoring dimensions (weighted):
      - Innovation potential  (50%) — exponential growth signals
      - Momentum conviction   (30%) — strong trend, visionary pricing
      - Growth at any cost    (20%) — revenue growth over profitability
    """

    def __init__(self, agent_id: str = "cathie_wood"):
        super().__init__(
            agent_id=agent_id,
            name="Cathie Wood",
            persona=(
                "Invest in disruptive innovation with exponential potential. "
                "Look for S-curve adoption, visionary leadership, and large TAM. "
                "Price is secondary to transformative potential."
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

        innovation = self._assess_innovation_potential(df, quant_signals)
        score += 0.50 * innovation
        reasons.append(f"innovation={innovation:.2f}")

        momentum = self._assess_momentum_conviction(df)
        score += 0.30 * momentum
        reasons.append(f"momentum={momentum:.2f}")

        growth = self._assess_growth_obsession(df)
        score += 0.20 * growth
        reasons.append(f"growth={growth:.2f}")

        signal = "bullish" if score > 0.25 else "bearish" if score < -0.20 else "neutral"
        confidence = min(abs(score), 1.5)

        return AnalystSignal(
            agent=self.agent_id,
            ticker=ticker,
            signal=signal,
            confidence=max(confidence, 0.1),
            reasoning="; ".join(reasons) if reasons else "no clear signal",
            metadata={"raw_score": round(score, 4)},
        )

    def _assess_innovation_potential(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        potential = 0.0
        for s in quant_signals:
            if getattr(s, "strength", 0) > 0.5:
                potential += 0.15
        if df is not None and len(df) > 100:
            price = self._price(df)
            sma_200 = self._sma(df, 200)
            if price and sma_200 and price > sma_200 * 1.3:
                potential += 0.20
        return min(potential, 0.7)

    def _assess_momentum_conviction(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 50:
            return 0.0
        ret_1m = float(df["close"].tail(21).pct_change().sum()) if len(df) > 21 else 0.0
        if ret_1m > 0.10:
            return 0.30
        if ret_1m > 0.05:
            return 0.15
        if ret_1m < -0.10:
            return -0.20
        return 0.0

    def _assess_growth_obsession(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 20:
            return 0.0
        recent_vol = float(df["close"].pct_change().tail(20).std())
        if recent_vol > 0.04:
            return 0.20
        if recent_vol > 0.025:
            return 0.10
        return 0.0
