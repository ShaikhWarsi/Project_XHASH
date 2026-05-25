from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class MohnishPabraiAgent(PersonaAgent):
    """Mohnish Pabrai persona — clone investing, asymmetric risk/reward.

    Scoring dimensions (weighted):
      - Clone signal    (40%) — following proven investors
      - Asymmetry       (35%) — limited downside, significant upside
      - Deep value      (25%) — significant discount to intrinsic value
    """

    def __init__(self, agent_id: str = "mohnish_pabrai"):
        super().__init__(
            agent_id=agent_id,
            name="Mohnish Pabrai",
            persona=(
                "Heads I win, tails I don't lose much. Find asymmetric bets "
                "with significant upside and limited downside. "
                "Clone the best investors, but do your own homework."
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

        clone = self._assess_clone_signals(quant_signals)
        score += 0.40 * clone
        reasons.append(f"clone={clone:.2f}")

        asymmetry = self._assess_asymmetry(df, composite_score)
        score += 0.35 * asymmetry
        reasons.append(f"asym={asymmetry:.2f}")

        deep = self._assess_deep_value(df)
        score += 0.25 * deep
        reasons.append(f"deep={deep:.2f}")

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

    def _assess_clone_signals(self, quant_signals: list) -> float:
        if not quant_signals:
            return 0.0
        strong = sum(1 for s in quant_signals if getattr(s, "strength", 0) > 0.6)
        ratio = strong / max(len(quant_signals), 1)
        return 0.4 * ratio - 0.2

    def _assess_asymmetry(self, df: Optional[pd.DataFrame], composite_score: float) -> float:
        asym = composite_score * 0.3
        if df is not None and len(df) > 50:
            rsi = self._safe_rsi(df)
            if rsi < 25:
                asym += 0.35
            elif rsi < 35:
                asym += 0.15
        return asym

    def _assess_deep_value(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 100:
            return 0.0
        min_52w = float(df["close"].rolling(252).min().iloc[-1]) if len(df) > 252 else float(df["close"].min())
        max_52w = float(df["close"].rolling(252).max().iloc[-1]) if len(df) > 252 else float(df["close"].max())
        price = self._price(df)
        if price and max_52w > min_52w:
            pct_from_low = (price - min_52w) / max_52w
            if pct_from_low < 0.1:
                return 0.25
            if pct_from_low < 0.2:
                return 0.15
            if pct_from_low > 0.8:
                return -0.20
        return 0.0
