from __future__ import annotations

from datetime import datetime

import numpy as np
import pandas as pd
import pytest

from core.enums import SignalDir, SignalType
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
    close = 100 + np.linspace(0, 5, n) + np.random.normal(0, 0.5, n)
    high = close + np.abs(np.random.normal(0, 0.3, n))
    low = close - np.abs(np.random.normal(0, 0.3, n))
    open_ = close - np.random.normal(0, 0.2, n)
    volume = np.random.poisson(1000, n)
    df = pd.DataFrame({"open": open_, "high": high, "low": low, "close": close, "volume": volume}, index=dates)
    df.attrs["symbol"] = "AAPL"
    return {"AAPL": df}


def test_buffett_agent_importable():
    from agents.hedge_fund.warren_buffett import WarrenBuffettAgent
    agent = WarrenBuffettAgent()
    assert agent.name == "Warren Buffett"
    assert agent.agent_id == "warren_buffett"


def test_buffett_analyze_returns_signal(sample_data, sample_portfolio, risk_limits):
    from agents.hedge_fund.warren_buffett import WarrenBuffettAgent
    agent = WarrenBuffettAgent()
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
    assert result["AAPL"].ticker == "AAPL"
    assert result["AAPL"].signal in ("bullish", "bearish", "neutral")


def test_buffett_scoring_ranges(sample_data, sample_portfolio, risk_limits):
    from agents.hedge_fund.warren_buffett import WarrenBuffettAgent
    agent = WarrenBuffettAgent()
    signals = SignalMatrix(timestamp=datetime.now())
    result = agent.analyze(
        tickers=["AAPL"],
        portfolio=sample_portfolio,
        signals=signals,
        risk_limits=risk_limits,
        prices_df=sample_data,
    )
    signal = result["AAPL"]
    assert 0.0 <= signal.confidence <= 1.0
