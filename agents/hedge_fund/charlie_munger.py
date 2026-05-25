from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class CharlieMungerAgent(PersonaAgent):
    """Charlie Munger persona — mental models, moat focus, inversion thinking.

    Scoring dimensions (weighted):
      - Moat & competitive advantage (40%) — durable advantages
      - Management quality          (25%) — capital allocation, insider behavior
      - Predictability              (25%) — consistent, understandable business
      - Valuation sanity            (10%) — fair price for quality
    """

    def __init__(self, agent_id: str = "charlie_munger"):
        super().__init__(
            agent_id=agent_id,
            name="Charlie Munger",
            persona=(
                "Avoid stupidity, seek brilliance. Look for businesses with "
                "durable competitive advantages, rational management, and "
                "predictable operations. Pay a fair price for a wonderful business."
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

        moat = self._assess_moat_quality(quant_signals)
        score += 0.40 * moat
        reasons.append(f"moat={moat:.2f}")

        mgmt = self._assess_management(df, quant_signals)
        score += 0.25 * mgmt
        reasons.append(f"mgmt={mgmt:.2f}")

        pred = self._assess_predictability(df)
        score += 0.25 * pred
        reasons.append(f"pred={pred:.2f}")

        val = self._assess_munger_valuation(df, composite_score)
        score += 0.10 * val
        reasons.append(f"val={val:.2f}")

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

    def _assess_moat_quality(self, quant_signals: list) -> float:
        if not quant_signals:
            return 0.0
        persistent = sum(1 for s in quant_signals if getattr(s, "strength", 0) > 0.5 and getattr(s, "confidence", 0) > 0.4)
        ratio = persistent / max(len(quant_signals), 1)
        return 0.4 * ratio - 0.2

    def _assess_management(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        if df is None or len(df) < 60:
            return 0.0
        returns = df["close"].pct_change().dropna()
        rolling_sharpe = (returns.mean() / max(returns.std(), 1e-10)) * (252 ** 0.5)
        if rolling_sharpe > 0.5:
            return 0.20
        if rolling_sharpe > 0:
            return 0.05
        return -0.15

    def _assess_predictability(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 100:
            return 0.0
        returns = df["close"].pct_change().dropna()
        vol = float(returns.std())
        if vol < 0.02:
            return 0.25
        if vol < 0.035:
            return 0.10
        return -0.15

    def _assess_munger_valuation(self, df: Optional[pd.DataFrame], composite_score: float) -> float:
        val = composite_score * 0.3
        if df is not None and len(df) > 50:
            rsi = self._safe_rsi(df)
            if rsi < 30:
                val += 0.15
            elif rsi > 70:
                val -= 0.15
        return val
