from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class GrowthPersona(PersonaAgent):
    """Growth Agent — focuses on high-growth, high-momentum stocks.

    Scoring dimensions (weighted):
      - Revenue acceleration (40%) — earnings/growth momentum
      - Price momentum       (35%) — trend strength
      - Market opportunity   (25%) — TAM, market share potential
    """

    def __init__(self, agent_id: str = "growth_agent"):
        super().__init__(
            agent_id=agent_id,
            name="Growth Agent",
            persona=(
                "Invest in companies with strong revenue growth and expanding "
                "market opportunities. Momentum is your friend — ride the trend "
                "until fundamentals change."
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

        acceleration = self._assess_growth_acceleration(df)
        score += 0.40 * acceleration
        reasons.append(f"accel={acceleration:.2f}")

        momentum = self._assess_price_momentum(df)
        score += 0.35 * momentum
        reasons.append(f"momentum={momentum:.2f}")

        opportunity = self._assess_market_opportunity(df, quant_signals)
        score += 0.25 * opportunity
        reasons.append(f"opp={opportunity:.2f}")

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

    def _assess_growth_acceleration(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 60:
            return 0.0
        sma_20 = self._sma(df, 20)
        sma_50 = self._sma(df, 50)
        sma_200 = self._sma(df, 200)
        price = self._price(df)
        if price and sma_20 and sma_50 and sma_200:
            if price > sma_20 > sma_50 > sma_200:
                return 0.40
            if price > sma_50 > sma_200:
                return 0.20
            if price < sma_50:
                return -0.25
        return 0.0

    def _assess_price_momentum(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 63:
            return 0.0
        ret_3m = float(df["close"].pct_change(63).iloc[-1]) if len(df) > 63 else 0
        ret_1m = float(df["close"].pct_change(21).iloc[-1]) if len(df) > 21 else 0
        if ret_3m > 0.20 and ret_1m > 0:
            return 0.35
        if ret_3m > 0.10:
            return 0.15
        if ret_3m < -0.10:
            return -0.25
        return 0.0

    def _assess_market_opportunity(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        opp = 0.0
        for s in quant_signals:
            if "BULLISH" in str(getattr(s, "direction", "")) and getattr(s, "strength", 0) > 0.6:
                opp += 0.05
        if df is not None and len(df) > 20:
            vol = float(df["close"].pct_change().tail(20).std())
            if vol > 0.035:
                opp += 0.10
        return min(opp, 0.4)
