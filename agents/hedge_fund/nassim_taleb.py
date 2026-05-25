from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class NassimTalebAgent(PersonaAgent):
    """Nassim Taleb persona — tail risk hedging, barbell strategy, anti-fragility.

    Scoring dimensions (weighted):
      - Tail risk       (45%) — fat tails, crash risk, fragility
      - Barbell setup   (35%) — safe core + speculative upside
      - Anti-fragile    (20%) — benefits from volatility/disorder
    """

    def __init__(self, agent_id: str = "nassim_taleb"):
        super().__init__(
            agent_id=agent_id,
            name="Nassim Taleb",
            persona=(
                "Protect against tail risk. Use a barbell strategy — most assets "
                "in ultra-safe instruments, a small portion in high-upside bets. "
                "Avoid the middle. Seek anti-fragility that gains from volatility."
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

        tail = self._assess_tail_risk(df)
        score += 0.45 * tail
        reasons.append(f"tail={tail:.2f}")

        barbell = self._assess_barbell_setup(df, composite_score)
        score += 0.35 * barbell
        reasons.append(f"barbell={barbell:.2f}")

        antifragile = self._assess_antifragility(df, quant_signals)
        score += 0.20 * antifragile
        reasons.append(f"antifrag={antifragile:.2f}")

        signal = "bullish" if score > 0.15 else "bearish" if score < -0.25 else "neutral"
        confidence = min(abs(score), 1.0)

        return AnalystSignal(
            agent=self.agent_id,
            ticker=ticker,
            signal=signal,
            confidence=max(confidence, 0.1),
            reasoning="; ".join(reasons) if reasons else "no clear signal",
            metadata={"raw_score": round(score, 4)},
        )

    def _assess_tail_risk(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 100:
            return 0.0
        returns = df["close"].pct_change().dropna()
        if len(returns) < 60:
            return 0.0
        recent = returns.tail(60)
        kurtosis = float(recent.kurtosis()) if len(recent) > 3 else 0
        neg_days = float((recent < -0.02).sum())
        total = float(len(recent))
        crash_ratio = neg_days / max(total, 1)
        if kurtosis > 3 or crash_ratio > 0.1:
            return -0.45
        if kurtosis > 1:
            return -0.20
        if crash_ratio < 0.02:
            return 0.15
        return 0.0

    def _assess_barbell_setup(self, df: Optional[pd.DataFrame], composite_score: float) -> float:
        if df is not None and len(df) > 50:
            rsi = self._safe_rsi(df)
            if rsi < 25:
                return 0.35
            if rsi > 75:
                return 0.20
        return composite_score * 0.2

    def _assess_antifragility(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        if df is None or len(df) < 60:
            return 0.0
        returns = df["close"].pct_change().dropna()
        up_days = float((returns > 0.02).sum())
        down_days = float((returns < -0.02).sum())
        if up_days > down_days * 1.5:
            return 0.20
        if down_days > up_days * 1.5:
            return -0.20
        return 0.0
