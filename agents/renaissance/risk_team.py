from typing import Optional

import numpy as np
import pandas as pd

from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState

from .base import RenaissanceAgent


class RiskTeam:
    def __init__(self, agents: list[RenaissanceAgent]):
        self.agents = agents

    @property
    def agent_list(self) -> list[RenaissanceAgent]:
        return self.agents


class RiskQuantAgent(RenaissanceAgent):
    """Risk management and tail-risk hedging agent.

    Computes VaR, CVaR, stress test scenarios, and tail-risk
    metrics. Recommends hedges for extreme market events.
    """

    def __init__(self, agent_id: str = "risk_quant"):
        super().__init__(
            agent_id=agent_id,
            name="Risk Quant",
            role=AgentRole.PORTFOLIO_MANAGER,
            description="VaR analysis, stress testing, and tail-risk hedging",
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

        returns = df["close"].pct_change().dropna().values
        reasons = []

        var_95 = float(np.percentile(returns, 5))
        cvar_95 = float(np.mean(returns[returns <= var_95])) if np.any(returns <= var_95) else var_95
        vol = float(np.std(returns)) * np.sqrt(252)
        max_dd = self._compute_max_drawdown(df["close"].values)

        risk_score = 0.0
        if abs(var_95) > 0.03:
            risk_score -= 0.2
            reasons.append(f"VaR95={var_95:.2%}")
        if vol > 0.4:
            risk_score -= 0.25
            reasons.append(f"high-vol={vol:.1%}")
        elif vol < 0.1:
            risk_score += 0.1
            reasons.append(f"low-vol={vol:.1%}")
        if max_dd and max_dd > 0.2:
            risk_score -= 0.3
            reasons.append(f"max-dd={max_dd:.1%}")

        atr = self._atr(df)
        if atr > 0:
            atr_pct = atr / max(self._price(df) or 1, 1)
            if atr_pct > 0.05:
                risk_score -= 0.15
                reasons.append(f"wide-atr({atr_pct:.2%})")

        risk_score = max(-1.0, min(0.5, risk_score))
        signal = "bullish" if risk_score > 0.05 else "bearish" if risk_score < -0.2 else "neutral"
        return AnalystSignal(
            agent=self.agent_id, ticker=ticker, signal=signal,
            confidence=min(abs(risk_score) + 0.3, 1.0),
            reasoning="; ".join(reasons) if reasons else "acceptable risk",
            metadata={
                "var_95": var_95, "cvar_95": cvar_95,
                "annualized_vol": vol, "max_drawdown": max_dd,
            },
        )

    @staticmethod
    def _compute_max_drawdown(prices: np.ndarray) -> Optional[float]:
        if len(prices) < 2:
            return None
        peak = np.maximum.accumulate(prices)
        dd = (prices - peak) / peak
        return float(np.min(dd))
