from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class BenGrahamAgent(PersonaAgent):
    """Ben Graham persona — deep value investing with emphasis on margin of safety.

    Scoring dimensions (weighted):
      - Earnings stability  (30%) — consistent positive earnings
      - Financial strength  (30%) — low debt, strong liquidity
      - Valuation discount  (40%) — margin of safety vs intrinsic value
    """

    def __init__(self, agent_id: str = "ben_graham"):
        super().__init__(
            agent_id=agent_id,
            name="Ben Graham",
            persona=(
                "Buy with a margin of safety. Look for net-net working capital, "
                "Graham Number discounts, and strong balance sheets. "
                "Avoid speculation; demand quantitative proof."
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

        earnings = self._assess_earnings_stability(df)
        score += 0.30 * earnings
        reasons.append(f"earnings={earnings:.2f}")

        strength = self._assess_financial_strength(df, quant_signals)
        score += 0.30 * strength
        reasons.append(f"strength={strength:.2f}")

        valuation = self._assess_graham_valuation(df, composite_score)
        score += 0.40 * valuation
        reasons.append(f"val={valuation:.2f}")

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

    def _assess_earnings_stability(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 60:
            return 0.0
        returns = df["close"].pct_change().dropna()
        positive_pct = float((returns > 0).mean())
        if positive_pct > 0.55:
            return 0.3
        if positive_pct > 0.48:
            return 0.1
        return -0.2

    def _assess_financial_strength(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        strength = 0.0
        if df is not None and len(df) > 20:
            vol = float(df["close"].pct_change().dropna().std())
            if vol < 0.025:
                strength += 0.20
            elif vol > 0.05:
                strength -= 0.15
        if df is not None and len(df) > 50:
            sma_200 = self._sma(df, 200)
            price = self._price(df)
            if price and sma_200 and price > sma_200:
                strength += 0.10
        return strength

    def _assess_graham_valuation(self, df: Optional[pd.DataFrame], composite_score: float) -> float:
        val = composite_score * 0.4
        if df is not None and len(df) > 50:
            rsi = self._safe_rsi(df)
            if rsi < 25:
                val += 0.3
            elif rsi > 75:
                val -= 0.3
        return val
