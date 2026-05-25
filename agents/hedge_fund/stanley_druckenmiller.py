from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class StanleyDruckenmillerAgent(PersonaAgent):
    """Stanley Druckenmiller persona — macro trading, momentum inflection.

    Scoring dimensions (weighted):
      - Macro regime   (40%) — trend strength and market context
      - Inflection     (35%) — identifying turning points
      - Risk/Reward    (25%) — asymmetric positioning
    """

    def __init__(self, agent_id: str = "stanley_druckenmiller"):
        super().__init__(
            agent_id=agent_id,
            name="Stanley Druckenmiller",
            persona=(
                "Identify inflections in macro trends. Go long the strongest "
                "stories, short the weakest. Preserve capital during uncertainty. "
                "When you have high conviction, size aggressively."
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

        macro = self._assess_macro_context(df, regime)
        score += 0.40 * macro
        reasons.append(f"macro={macro:.2f}")

        inflection = self._assess_inflection(df, quant_signals)
        score += 0.35 * inflection
        reasons.append(f"inflection={inflection:.2f}")

        risk_reward = self._assess_asymmetry(df, composite_score)
        score += 0.25 * risk_reward
        reasons.append(f"rr={risk_reward:.2f}")

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

    def _assess_macro_context(self, df: Optional[pd.DataFrame], regime: object) -> float:
        score = 0.0
        if df is not None and len(df) > 60:
            sma_50 = self._sma(df, 50)
            sma_200 = self._sma(df, 200)
            price = self._price(df)
            if price and sma_50 and sma_200:
                if sma_50 > sma_200 and price > sma_50:
                    score += 0.30
                elif sma_50 < sma_200:
                    score -= 0.20
        if regime is not None:
            regime_str = str(getattr(regime, "primary", ""))
            if "TRENDING" in regime_str:
                score += 0.10
        return score

    def _assess_inflection(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        inflection = 0.0
        for s in quant_signals:
            stype = str(getattr(s, "type", ""))
            if "CHOCH" in stype or "BOS" in stype:
                inflection += 0.20
        if df is not None and len(df) > 30:
            returns = df["close"].pct_change().tail(10)
            if len(returns) > 0:
                recent = float(returns.sum())
                prior = float(df["close"].pct_change().tail(20).head(10).sum()) if len(df) > 30 else 0
                if recent > 0 and prior < 0:
                    inflection += 0.15
                elif recent < 0 and prior > 0:
                    inflection -= 0.15
        return min(inflection, 0.5)

    def _assess_asymmetry(self, df: Optional[pd.DataFrame], composite_score: float) -> float:
        rr = composite_score * 0.3
        if df is not None and len(df) > 30:
            rsi = self._safe_rsi(df)
            if rsi < 35:
                rr += 0.2
            elif rsi > 70:
                rr -= 0.2
        return rr
