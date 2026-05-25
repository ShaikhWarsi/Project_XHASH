from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class PhilFisherAgent(PersonaAgent):
    """Phil Fisher persona — scuttlebutt methodology, growth quality focus.

    Scoring dimensions (weighted):
      - Growth quality        (40%) — sustainable competitive growth
      - R&D & innovation      (30%) — investment in future
      - Sales & management    (30%) — distribution capability
    """

    def __init__(self, agent_id: str = "phil_fisher"):
        super().__init__(
            agent_id=agent_id,
            name="Phil Fisher",
            persona=(
                "Invest in companies with sustainable growth advantages. "
                "Look for superior R&D, marketing savvy, and honest management. "
                "Scuttlebutt — know the business better than anyone."
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

        growth_quality = self._assess_growth_quality(df)
        score += 0.40 * growth_quality
        reasons.append(f"growth_q={growth_quality:.2f}")

        innovation = self._assess_innovation_signals(quant_signals)
        score += 0.30 * innovation
        reasons.append(f"innovation={innovation:.2f}")

        sales_mgmt = self._assess_sales_momentum(df)
        score += 0.30 * sales_mgmt
        reasons.append(f"sales={sales_mgmt:.2f}")

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

    def _assess_growth_quality(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 120:
            return 0.0
        sma_50 = self._sma(df, 50)
        sma_200 = self._sma(df, 200)
        price = self._price(df)
        if price and sma_50 and sma_200:
            if price > sma_50 > sma_200 and price / sma_200 < 1.5:
                return 0.35
            if price > sma_50 > sma_200:
                return 0.20
            if price < sma_50 and sma_50 < sma_200:
                return -0.25
        return 0.0

    def _assess_innovation_signals(self, quant_signals: list) -> float:
        if not quant_signals:
            return 0.0
        total_strength = sum(getattr(s, "strength", 0) for s in quant_signals if getattr(s, "type", None) is not None)
        avg = total_strength / max(len(quant_signals), 1)
        return 0.3 * (avg - 0.5)

    def _assess_sales_momentum(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 30:
            return 0.0
        vol = float(df["close"].pct_change().dropna().std())
        recent_ret = float(df["close"].pct_change().tail(20).mean())
        if recent_ret > 0.005 and vol < 0.03:
            return 0.25
        if recent_ret > 0:
            return 0.10
        return -0.15
