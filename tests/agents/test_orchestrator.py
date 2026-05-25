from __future__ import annotations

from datetime import datetime

from unittest.mock import MagicMock, patch

import pytest

from core.types import PortfolioState, SignalMatrix


@pytest.fixture
def sample_portfolio():
    return PortfolioState(cash=500_000.0, positions={}, total_value=500_000.0)


@pytest.fixture
def sample_signals():
    return SignalMatrix(timestamp=datetime.now())


def test_trading_orchestrator_importable():
    from agents.orchestrator import TradingOrchestrator
    assert TradingOrchestrator is not None


def test_orchestrator_initialization():
    from agents.orchestrator import TradingOrchestrator
    orchestrator = TradingOrchestrator()
    assert orchestrator is not None


def test_orchestrator_run_with_mock_agents(sample_portfolio, sample_signals):
    from agents.orchestrator import TradingOrchestrator
    orchestrator = TradingOrchestrator()
    result = orchestrator.run(tickers=["AAPL"], portfolio=sample_portfolio, signals=sample_signals)
    assert result is not None
