from __future__ import annotations

from datetime import datetime

import pytest

from core.types import AnalystSignal, PortfolioState, SignalMatrix


@pytest.fixture
def sample_portfolio():
    return PortfolioState(cash=500_000.0, positions={}, total_value=500_000.0)


def test_orchestrator_importable():
    from agents.hedge_fund.orchestrator import HedgeFundOrchestrator
    assert HedgeFundOrchestrator is not None


def test_orchestrator_empty_agents():
    from agents.hedge_fund.orchestrator import HedgeFundOrchestrator
    orchestrator = HedgeFundOrchestrator(persona_agents=[])
    assert orchestrator is not None


def test_orchestrator_with_single_agent(sample_portfolio):
    from agents.hedge_fund.warren_buffett import WarrenBuffettAgent
    from agents.hedge_fund.orchestrator import HedgeFundOrchestrator
    agent = WarrenBuffettAgent()
    orchestrator = HedgeFundOrchestrator(persona_agents=[agent])
    result = orchestrator.deliberate(
        tickers=["AAPL"],
        portfolio=sample_portfolio,
        signals=SignalMatrix(timestamp=datetime.now()),
    )
    assert result is not None


def test_orchestrator_with_multiple_agents(sample_portfolio):
    from agents.hedge_fund.warren_buffett import WarrenBuffettAgent
    from agents.hedge_fund.michael_burry import MichaelBurryAgent
    from agents.hedge_fund.ben_graham import BenGrahamAgent
    from agents.hedge_fund.orchestrator import HedgeFundOrchestrator
    agents = [WarrenBuffettAgent(), MichaelBurryAgent(), BenGrahamAgent()]
    orchestrator = HedgeFundOrchestrator(persona_agents=agents)
    result = orchestrator.deliberate(
        tickers=["AAPL"],
        portfolio=sample_portfolio,
        signals=SignalMatrix(timestamp=datetime.now()),
    )
    assert result is not None
    assert "AAPL" in result
    assert len(result["AAPL"]["opinions"]) == len(agents)
