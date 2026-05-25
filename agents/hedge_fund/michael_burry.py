from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class MichaelBurryAgent(PersonaAgent):
    """Michael Burry persona — deep value contrarian, short thesis focus.

    Scoring dimensions (weighted):
      - Valuation extremes  (40%) — deep discount signals
      - Contrarian setup    (30%) — sentiment extremes, crowded trades
      - Short thesis        (30%) — weakness indicators, fragility
    """

    def __init__(self, agent_id: str = "michael_burry"):
        super().__init__(
            agent_id=agent_id,
            name="Michael Burry",
            persona=(
                "Find deep value where others see disaster. Look for extreme "
                "pessimism, misunderstood assets, and asymmetric payoff structures. "
                "Be willing to be early and wrong before being right."
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

        value_extreme = self._assess_value_extremes(df, composite_score)
        score += 0.40 * value_extreme
        reasons.append(f"val_extreme={value_extreme:.2f}")

        contrarian = self._assess_contrarian_setup(df, quant_signals)
        score += 0.30 * contrarian
        reasons.append(f"contrarian={contrarian:.2f}")

        short_case = self._assess_short_thesis(df)
        score += 0.30 * short_case
        reasons.append(f"short={short_case:.2f}")

        signal = "bullish" if score > 0.20 else "bearish" if score < -0.15 else "neutral"
        confidence = min(abs(score), 1.0)

        return AnalystSignal(
            agent=self.agent_id,
            ticker=ticker,
            signal=signal,
            confidence=max(confidence, 0.1),
            reasoning="; ".join(reasons) if reasons else "no clear signal",
            metadata={"raw_score": round(score, 4)},
        )

    def _assess_value_extremes(self, df: Optional[pd.DataFrame], composite_score: float) -> float:
        val = composite_score * 0.3
        if df is not None and len(df) > 50:
            rsi = self._safe_rsi(df)
            if rsi < 20:
                val += 0.5
            elif rsi < 30:
                val += 0.2
            elif rsi > 80:
                val -= 0.5
        return val

    def _assess_contrarian_setup(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        bearish_signals = sum(1 for s in quant_signals if getattr(s, "direction", None) == "BEARISH")
        bullish_signals = sum(1 for s in quant_signals if getattr(s, "direction", None) == "BULLISH")
        total = bearish_signals + bullish_signals
        if total < 3:
            return 0.0
        bearish_ratio = bearish_signals / total
        if bearish_ratio > 0.7:
            return 0.3
        if bullish_ratio < 0.33:
            return -0.2
        return -0.1

    def _assess_short_thesis(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 30:
            return 0.0
        returns = df["close"].pct_change().dropna()
        recent = returns.tail(20)
        if len(recent) < 5:
            return 0.0
        recent_vol = float(recent.std())
        recent_ret = float(recent.mean())
        if recent_ret < -0.01 and recent_vol > 0.03:
            return -0.3
        if recent_ret < -0.005:
            return -0.15
        return 0.1
