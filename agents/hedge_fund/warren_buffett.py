from __future__ import annotations

from typing import Optional

import pandas as pd

from core.types import AnalystSignal, PortfolioState

from .base import PersonaAgent


class WarrenBuffettAgent(PersonaAgent):
    """Warren Buffett persona — value investing with economic moat focus.

    Scoring dimensions (weighted):
      - Moat strength      (40%) — qualitative from signal metadata
      - Valuation sanity   (30%) — composite score vs historical context
      - Financial health   (20%) — trend direction and stability
      - Opportunity cost   (10%) — cash vs position sizing
    """

    def __init__(self, agent_id: str = "warren_buffett"):
        super().__init__(
            agent_id=agent_id,
            name="Warren Buffett",
            persona=(
                "Buy wonderful businesses at a fair price. "
                "Look for durable competitive advantages, consistent earnings, "
                "strong management, and a margin of safety."
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

        # 1. Moat strength from signal patterns (40%)
        moat_score = self._assess_moat(quant_signals)
        score += 0.40 * moat_score
        if moat_score > 0.3:
            reasons.append(f"moat={moat_score:.2f}")

        # 2. Valuation sanity from composite (30%)
        val_score = self._assess_valuation(df, composite_score, quant_signals)
        score += 0.30 * val_score
        if abs(val_score) > 0.1:
            reasons.append(f"val={val_score:.2f}")

        # 3. Financial health (20%)
        health_score = self._assess_health(df, quant_signals)
        score += 0.20 * health_score
        if abs(health_score) > 0.1:
            reasons.append(f"health={health_score:.2f}")

        # 4. Opportunity cost (10%)
        opp_score = self._assess_opportunity(ticker, portfolio)
        score += 0.10 * opp_score
        if abs(opp_score) > 0.1:
            reasons.append(f"opp={opp_score:.2f}")

        signal = "bullish" if score > 0.15 else "bearish" if score < -0.15 else "neutral"
        confidence = min(abs(score), 1.0)

        return self._make_signal(
            ticker=ticker,
            signal=signal,
            confidence=max(confidence, 0.1),
            reasoning="; ".join(reasons) if reasons else "no clear signal",
            metadata={
                "raw_score": round(score, 4),
                "moat_score": round(moat_score, 4),
                "val_score": round(val_score, 4),
                "health_score": round(health_score, 4),
                "opp_score": round(opp_score, 4),
            },
        )

    def _assess_moat(self, quant_signals: list) -> float:
        """Assess competitive advantage from persistent structure signals."""
        if not quant_signals:
            return 0.0
        strong_signals = sum(
            1 for s in quant_signals
            if getattr(s, "strength", 0) > 0.6 and getattr(s, "confidence", 0) > 0.5
        )
        total = len(quant_signals)
        if total == 0:
            return 0.0
        ratio = strong_signals / total
        return 0.5 * ratio - 0.25  # range -0.25 to +0.25

    def _assess_valuation(
        self,
        df: Optional[pd.DataFrame],
        composite_score: float,
        quant_signals: list,
    ) -> float:
        """Assess if price is reasonable relative to intrinsic signals."""
        val = composite_score * 0.5
        if df is not None and len(df) > 50:
            rsi = self._safe_rsi(df)
            if rsi < 30:
                val += 0.3
            elif rsi > 70:
                val -= 0.3
            sma_50 = self._sma(df, 50)
            sma_200 = self._sma(df, 200)
            price = self._price(df)
            if price and sma_50 and sma_200:
                if sma_50 > sma_200 and price > sma_50:
                    val += 0.1
                elif sma_50 < sma_200 and price < sma_50:
                    val -= 0.1
        return val

    def _assess_health(self, df: Optional[pd.DataFrame], quant_signals: list) -> float:
        """Assess financial health from trend stability."""
        health = 0.0
        if df is not None and len(df) > 20:
            returns = df["close"].pct_change().dropna()
            vol = float(returns.std())
            if vol < 0.02:
                health += 0.2
            elif vol > 0.04:
                health -= 0.1
        for s in quant_signals:
            t = getattr(s, "type", None)
            if t is not None and "structure" in str(t) and "BULLISH" in str(getattr(s, "direction", "")):
                health += 0.1
        return health

    def _assess_opportunity(self, ticker: str, portfolio: PortfolioState) -> float:
        """Assess opportunity cost — prefer high-cash scenarios."""
        pos = portfolio.positions.get(ticker)
        if pos is None:
            return 0.1 if portfolio.cash / max(portfolio.total_value, 1) > 0.1 else -0.1
        return 0.0
