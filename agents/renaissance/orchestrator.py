from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Optional

import pandas as pd

from agents.base import TradingAgent
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix


class RenaissanceOrchestrator:
    """Full multi-agent hedge fund orchestration modeled on Renaissance Technologies.

    3 teams (Research, Trading, Risk) + Investment Committee.
    Supports pure quant and LLM-enhanced modes.
    """

    def __init__(
        self,
        research_team: list[TradingAgent],
        trading_team: list[TradingAgent],
        risk_team: list[TradingAgent],
        committee: InvestmentCommittee,
        max_workers: int = 8,
        llm_enhanced: bool = False,
    ):
        self.research_team = research_team
        self.trading_team = trading_team
        self.risk_team = risk_team
        self.committee = committee
        self.max_workers = max_workers
        self.llm_enhanced = llm_enhanced

    def deliberate(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: Optional[RiskLimits] = None,
        prices_df: Optional[dict[str, pd.DataFrame]] = None,
    ) -> dict[str, Any]:
        if risk_limits is None:
            risk_limits = RiskLimits()

        all_agents = self.research_team + self.trading_team + self.risk_team
        all_signals: dict[str, dict[str, AnalystSignal]] = {}

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(
                    agent.analyze,
                    tickers=tickers,
                    portfolio=portfolio,
                    signals=signals,
                    risk_limits=risk_limits,
                    prices_df=prices_df or {},
                    llm_enhanced=self.llm_enhanced,
                ): agent
                for agent in all_agents
            }
            for future in as_completed(futures):
                agent = futures[future]
                try:
                    all_signals[agent.agent_id] = future.result()
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

        return self.committee.deliberate(tickers, all_signals, portfolio)

    def run_workflow(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: Optional[RiskLimits] = None,
        prices_df: Optional[dict[str, pd.DataFrame]] = None,
    ) -> dict[str, Any]:
        """Run the full Renaissance workflow with team-level deliberation steps."""
        if risk_limits is None:
            risk_limits = RiskLimits()
        prices_df = prices_df or {}

        research_signals = self._run_team(self.research_team, tickers, portfolio, signals, risk_limits, prices_df)
        risk_signals = self._run_team(self.risk_team, tickers, portfolio, signals, risk_limits, prices_df)
        trading_signals = self._run_team(self.trading_team, tickers, portfolio, signals, risk_limits, prices_df)

        all_signals: dict[str, dict[str, AnalystSignal]] = {}
        for sig_dict in [research_signals, risk_signals, trading_signals]:
            for agent_id, agent_sigs in sig_dict.items():
                all_signals[agent_id] = agent_sigs

        return self.committee.deliberate(tickers, all_signals, portfolio)

    def _run_team(
        self,
        team: list[TradingAgent],
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        prices_df: dict[str, pd.DataFrame],
    ) -> dict[str, dict[str, AnalystSignal]]:
        results: dict[str, dict[str, AnalystSignal]] = {}
        with ThreadPoolExecutor(max_workers=len(team)) as executor:
            futures = {
                executor.submit(
                    agent.analyze,
                    tickers=tickers,
                    portfolio=portfolio,
                    signals=signals,
                    risk_limits=risk_limits,
                    prices_df=prices_df,
                ): agent
                for agent in team
            }
            for future in as_completed(futures):
                agent = futures[future]
                try:
                    results[agent.agent_id] = future.result()
                except Exception as e:
                    results[agent.agent_id] = {
                        t: AnalystSignal(
                            agent=agent.agent_id, ticker=t,
                            signal="neutral", confidence=0.0,
                            reasoning=f"error: {e}",
                        ) for t in tickers
                    }
        return results


class InvestmentCommittee:
    """Deliberates across all team signals to reach consensus."""

    def __init__(self, consensus_threshold: float = 0.15):
        self.consensus_threshold = consensus_threshold

    def deliberate(
        self,
        tickers: list[str],
        all_signals: dict[str, dict[str, AnalystSignal]],
        portfolio: PortfolioState,
    ) -> dict[str, Any]:
        consensus: dict[str, Any] = {}

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
                "total_agents": total,
                "avg_confidence": round(avg_conf, 4),
                "opinions": [
                    {"agent": o.agent, "signal": o.signal, "confidence": o.confidence, "reasoning": o.reasoning}
                    for o in opinions
                ],
            }

        return consensus
