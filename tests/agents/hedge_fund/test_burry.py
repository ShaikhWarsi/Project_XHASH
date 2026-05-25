from __future__ import annotations

from datetime import datetime

import numpy as np
import pandas as pd
import pytest

from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix


@pytest.fixture
def sample_portfolio():
    return PortfolioState(
        cash=500_000.0,
        positions={},
        total_value=500_000.0,
    )


@pytest.fixture
def risk_limits():
    return RiskLimits()


@pytest.fixture
def sample_data():
    n = 200
    np.random.seed(42)
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    close = 100 + np.linspace(0, 5, n) + np.random.normal(0, 1.0, n)
    high = close + np.abs(np.random.normal(0, 0.5, n))
    low = close - np.abs(np.random.normal(0, 0.5, n))
    df = pd.DataFrame({"open": close - 0.2, "high": high, "low": low, "close": close, "volume": 1000}, index=dates)
    df.attrs["symbol"] = "AAPL"
    return {"AAPL": df}


def test_burry_agent_importable():
    from agents.hedge_fund.michael_burry import MichaelBurryAgent
    agent = MichaelBurryAgent()
    assert agent.name is not None
    assert agent.agent_id == "michael_burry"


def test_burry_analyze_returns_signal(sample_data, sample_portfolio, risk_limits):
    from agents.hedge_fund.michael_burry import MichaelBurryAgent
    agent = MichaelBurryAgent()
    signals = SignalMatrix(timestamp=datetime.now())
    result = agent.analyze(
        tickers=["AAPL"],
        portfolio=sample_portfolio,
        signals=signals,
        risk_limits=risk_limits,
        prices_df=sample_data,
    )
    assert "AAPL" in result
    assert isinstance(result["AAPL"], AnalystSignal)


def test_burry_confidence_range(sample_data, sample_portfolio, risk_limits):
    from agents.hedge_fund.michael_burry import MichaelBurryAgent
    agent = MichaelBurryAgent()
    signals = SignalMatrix(timestamp=datetime.now())
    result = agent.analyze(
        tickers=["AAPL"],
        portfolio=sample_portfolio,
        signals=signals,
        risk_limits=risk_limits,
        prices_df=sample_data,
    )
    assert 0.0 <= result["AAPL"].confidence <= 1.0
