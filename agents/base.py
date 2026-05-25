from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix


class TradingAgent(ABC):
    """Base class for all analyst and management agents."""

    def __init__(self, agent_id: str, role: AgentRole):
        self.agent_id = agent_id
        self.role = role

    @abstractmethod
    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        """Run analysis for given tickers. Returns ticker -> AnalystSignal."""

    def _make_signal(
        self,
        ticker: str,
        signal: str,
        confidence: float,
        reasoning: str = "",
        metadata: Optional[dict] = None,
    ) -> AnalystSignal:
        return AnalystSignal(
            agent=self.agent_id,
            ticker=ticker,
            signal=signal,
            confidence=confidence,
            reasoning=reasoning,
            metadata=metadata or {},
        )
