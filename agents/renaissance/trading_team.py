from typing import Optional

import numpy as np
import pandas as pd

from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState

from .base import RenaissanceAgent


class TradingTeam:
    def __init__(self, agents: list[RenaissanceAgent]):
        self.agents = agents

    @property
    def agent_list(self) -> list[RenaissanceAgent]:
        return self.agents


class ExecutionQuantAgent(RenaissanceAgent):
    """Execution optimization and market microstructure agent.

    Analyzes order flow, spread dynamics, and implements
    optimal execution algorithms (TWAP, VWAP, iceberg).
    """

    def __init__(self, agent_id: str = "execution_quant"):
        super().__init__(
            agent_id=agent_id,
            name="Execution Quant",
            role=AgentRole.PORTFOLIO_MANAGER,
            description="Execution optimization and market microstructure analysis",
        )

    def _compute_signal(
        self,
        ticker: str,
        df: Optional[pd.DataFrame],
        quant_signals: list,
        composite_score: float,
        regime: object,
        portfolio: PortfolioState,
        llm_enhanced: bool,
    ) -> AnalystSignal:
        if df is None or len(df) < 30:
            return AnalystSignal(agent=self.agent_id, ticker=ticker, signal="neutral", confidence=0.0,
                                 reasoning="insufficient data")

        score = 0.0
        reasons = []

        volume = df["volume"].values
        if len(volume) > 20:
            recent_avg = np.mean(volume[-5:])
            hist_avg = np.mean(volume[-20:])
            if hist_avg > 0:
                vol_ratio = recent_avg / hist_avg
                if vol_ratio > 1.5:
                    price_trend = (df["close"].iloc[-1] > df["close"].iloc[-5]) if len(df) >= 5 else False
                    score += 0.2 if price_trend else -0.2
                    reasons.append(f"vol-surge({vol_ratio:.2f}x)")

        spread_estimate = self._estimate_spread(df)
        if spread_estimate is not None:
            if spread_estimate < 0.001:
                score += 0.1
                reasons.append(f"tight-spread({spread_estimate:.4f})")
            elif spread_estimate > 0.01:
                score -= 0.15
                reasons.append(f"wide-spread({spread_estimate:.4f})")

        price = self._price(df)
        sma_20 = self._sma(df, 20)
        if price and sma_20:
            deviation = (price - sma_20) / sma_20
            if abs(deviation) > 0.03:
                reasons.append(f"dev={deviation:.2%}")
                if deviation > 0:
                    score -= 0.1
                else:
                    score += 0.1

        l2_signals = [s for s in quant_signals if hasattr(s, "type") and s.type in ("liquidity",)]
        if l2_signals:
            score += 0.1 * len(l2_signals)
            reasons.append(f"{len(l2_signals)}-liq-signals")

        score = max(-1.0, min(1.0, score))
        signal = "bullish" if score > 0.15 else "bearish" if score < -0.15 else "neutral"
        return AnalystSignal(
            agent=self.agent_id, ticker=ticker, signal=signal,
            confidence=min(abs(score), 1.0),
            reasoning="; ".join(reasons) if reasons else "neutral",
            metadata={"spread_estimate": spread_estimate, "score": score},
        )

    @staticmethod
    def _estimate_spread(df: pd.DataFrame) -> Optional[float]:
        try:
            high_low = (df["high"] - df["low"]).values
            spread = np.median(high_low[-20:]) / df["close"].iloc[-1] if df["close"].iloc[-1] > 0 else None
            return float(spread) if spread else None
        except Exception:
            return None


class ComplianceOfficer(RenaissanceAgent):
    """Regulatory compliance and risk governance agent.

    Ensures all trading decisions comply with position limits,
    concentration rules, and regulatory requirements.
    """

    def __init__(self, agent_id: str = "compliance_officer"):
        super().__init__(
            agent_id=agent_id,
            name="Compliance Officer",
            role=AgentRole.PORTFOLIO_MANAGER,
            description="Regulatory compliance and risk governance",
        )

    def _compute_signal(
        self,
        ticker: str,
        df: Optional[pd.DataFrame],
        quant_signals: list,
        composite_score: float,
        regime: object,
        portfolio: PortfolioState,
        llm_enhanced: bool,
    ) -> AnalystSignal:
        reasons = []
        violations = []

        portfolio_value = portfolio.total_value
        if ticker in portfolio.positions:
            pos = portfolio.positions[ticker]
            exposure_pct = abs(pos.market_value) / max(portfolio_value, 1.0)
            if exposure_pct > 0.25:
                violations.append(f"concentration={exposure_pct:.1%}>25%")
        else:
            exposure_pct = 0.0

        all_positions_count = len(portfolio.positions)
        max_positions = portfolio.margin_requirement or 20
        if all_positions_count >= max_positions:
            violations.append(f"max-positions({all_positions_count})")

        if violations:
            reasons.extend(violations)
            return AnalystSignal(
                agent=self.agent_id, ticker=ticker, signal="neutral",
                confidence=1.0,
                reasoning="COMPLIANCE HALT: " + "; ".join(violations),
                metadata={"violations": violations, "halted": True},
            )

        score = 0.1
        price = self._price(df)
        reasons.append("compliant")
        return AnalystSignal(
            agent=self.agent_id, ticker=ticker, signal="bullish" if score > 0 else "neutral",
            confidence=0.5,
            reasoning="; ".join(reasons),
            metadata={"halted": False},
        )
