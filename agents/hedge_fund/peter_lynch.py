from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class PeterLynchAgent(PersonaAgent):
    """Peter Lynch persona — GARP, growth at a reasonable price.

    Scoring dimensions (weighted):
      - Growth story   (35%) — revenue/earnings momentum
      - PEG appeal     (35%) — growth vs valuation
      - Knowable biz   (30%) — simple, understandable, boring
    """

    def __init__(self, agent_id: str = "peter_lynch"):
        super().__init__(
            agent_id=agent_id,
            name="Peter Lynch",
            persona=(
                "Invest in what you know. Look for understandable businesses "
                "with strong growth at reasonable valuations. "
                "Boring is beautiful. Buy before the institutions find it."
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

        growth = self._assess_growth_momentum(df)
        score += 0.35 * growth
        reasons.append(f"growth={growth:.2f}")

        peg = self._assess_peg_appeal(df, composite_score)
        score += 0.35 * peg
        reasons.append(f"peg={peg:.2f}")

        simplicity = self._assess_knowability(df, quant_signals)
        score += 0.30 * simplicity
        reasons.append(f"simple={simplicity:.2f}")

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

    def _assess_growth_momentum(self, df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 60:
            return 0.0
        sma_50 = self._sma(df, 50)
        sma_200 = self._sma(df, 200)
        price = self._price(df)
        if price and sma_50 and sma_200:
            if price > sma_50 > sma_200:
                return 0.35
            if price > sma_50:
                return 0.15
            if price < sma_50 < sma_200:
                return -0.20
        return 0.0

    def _assess_peg_appeal(self, df: Optional[pd.DataFrame], composite_score: float) -> float:
        if df is not None and len(df) > 20:
            rsi = self._safe_rsi(df)
            if rsi < 40 and composite_score > 0:
                return 0.30
            if rsi > 70:
                return -0.20
            if composite_score > 0.3:
                return 0.15
        return composite_score * 0.3

    def _assess_knowability(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        if df is not None and len(df) > 100:
            returns = df["close"].pct_change().dropna()
            vol = float(returns.std())
            if vol < 0.025:
                return 0.30
            if vol < 0.04:
                return 0.15
            return -0.15
        return 0.0
