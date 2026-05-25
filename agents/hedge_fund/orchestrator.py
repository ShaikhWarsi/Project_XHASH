from __future__ import annotations

from typing import Optional

import pandas as pd

from agents.base import TradingAgent
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix


class HedgeFundOrchestrator:
    """Runs multiple persona agents and aggregates their signals."""

    def __init__(
        self,
        persona_agents: list[TradingAgent],
        max_workers: int = 4,
        consensus_threshold: float = 0.15,
    ):
        self.persona_agents = persona_agents
        self.max_workers = max_workers
        self.consensus_threshold = consensus_threshold

    def deliberate(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: Optional[RiskLimits] = None,
        prices_df: Optional[dict[str, pd.DataFrame]] = None,
    ) -> dict[str, dict]:
        """Run deliberation across all persona agents.

        Returns per-ticker consensus with individual breakdowns.
        """
        if risk_limits is None:
            risk_limits = RiskLimits()

        all_signals: dict[str, dict[str, AnalystSignal]] = {}

        for agent in self.persona_agents:
            try:
                all_signals[agent.agent_id] = agent.analyze(
                    tickers=tickers,
                    portfolio=portfolio,
                    signals=signals,
                    risk_limits=risk_limits,
                    prices_df=prices_df or {},
                )
            except Exception as e:
                all_signals[agent.agent_id] = {
                    t: AnalystSignal(
                        agent=agent.agent_id,
                        ticker=t,
                        signal="neutral",
                        confidence=0.0,
                        reasoning=f"error: {e}",
                    )
                    for t in tickers
                }

        return self._build_consensus(tickers, all_signals)

    def _build_consensus(
        self,
        tickers: list[str],
        all_signals: dict[str, dict[str, AnalystSignal]],
    ) -> dict[str, dict]:
        consensus: dict[str, dict] = {}

        for ticker in tickers:
            opinions: list[AnalystSignal] = []
            for agent_id, agent_results in all_signals.items():
                sig = agent_results.get(ticker)
                if sig is not None:
                    opinions.append(sig)

            if not opinions:
                consensus[ticker] = {"consensus": "neutral", "confidence": 0.0, "opinions": []}
                continue

            bullish = sum(1 for o in opinions if o.signal == "bullish")
            bearish = sum(1 for o in opinions if o.signal == "bearish")
            total = len(opinions)
            avg_conf = sum(o.confidence for o in opinions) / total
            net = (bullish - bearish) / total

            if net > self.consensus_threshold:
                consensus_signal = "bullish"
            elif net < -self.consensus_threshold:
                consensus_signal = "bearish"
            else:
                consensus_signal = "neutral"

            consensus[ticker] = {
                "consensus": consensus_signal,
                "confidence": round(abs(net) * avg_conf, 4),
                "bullish_count": bullish,
                "bearish_count": bearish,
                "net_score": round(net, 4),
                "opinions": [
                    {"agent": o.agent, "signal": o.signal, "confidence": o.confidence, "reasoning": o.reasoning}
                    for o in opinions
                ],
            }

        return consensus
