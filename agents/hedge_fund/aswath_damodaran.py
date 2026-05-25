from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class AswathDamodaranAgent(PersonaAgent):
    """Aswath Damodaran persona — DCF-driven intrinsic valuation.

    Scoring dimensions (weighted):
      - Intrinsic value   (45%) — estimated vs current price
      - Margin of safety  (30%) — discount to fair value
      - Narrative & data  (25%) — story must match the numbers
    """

    def __init__(self, agent_id: str = "aswath_damodaran"):
        super().__init__(
            agent_id=agent_id,
            name="Aswath Damodaran",
            persona=(
                "Every asset has an intrinsic value. Estimate it through "
                "discounted cash flow analysis. Price is what you pay, value "
                "is what you get. Let the data drive the narrative, not vice versa."
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

        intrinsic = self._assess_intrinsic_value(df, composite_score)
        score += 0.45 * intrinsic
        reasons.append(f"intrinsic={intrinsic:.2f}")

        safety = self._assess_margin_of_safety(df)
        score += 0.30 * safety
        reasons.append(f"safety={safety:.2f}")

        narrative = self._assess_data_narrative(df, quant_signals)
        score += 0.25 * narrative
        reasons.append(f"narrative={narrative:.2f}")

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

    def _assess_intrinsic_value(self, df: Optional[pd.DataFrame], composite_score: float) -> float:
        val = composite_score * 0.4
        if df is not None and len(df) > 100:
            sma_200 = self._sma(df, 200)
            price = self._price(df)
            if price and sma_200:
                deviation = (price - sma_200) / sma_200
                if deviation < -0.2:
                    val += 0.30
                elif deviation < -0.1:
                    val += 0.15
                elif deviation > 0.3:
                    val -= 0.25
        return val

    def _assess_margin_of_safety(self, df: Optional[pd.DataFrame]) -> float:
        if df is not None and len(df) > 50:
            rsi = self._safe_rsi(df)
            if rsi < 25:
                return 0.30
            if rsi < 35:
                return 0.15
            if rsi > 70:
                return -0.20
        return 0.0

    def _assess_data_narrative(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        narrative = 0.0
        if df is not None and len(df) > 60:
            returns = df["close"].pct_change().dropna()
            vol = float(returns.std())
            if vol < 0.03:
                narrative += 0.15
        for s in quant_signals:
            if getattr(s, "strength", 0) > 0.5 and getattr(s, "confidence", 0) > 0.5:
                narrative += 0.05
        return min(narrative, 0.4)
