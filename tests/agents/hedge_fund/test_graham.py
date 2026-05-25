from __future__ import annotations

from datetime import datetime

import numpy as np
import pandas as pd
import pytest

from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix


@pytest.fixture
def sample_portfolio():
    return PortfolioState(cash=500_000.0, positions={}, total_value=500_000.0)


@pytest.fixture
def risk_limits():
    return RiskLimits()


@pytest.fixture
def sample_data():
    n = 200
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    np.random.seed(42)
    close = 50 + np.random.normal(0, 2, n).cumsum() % 10
    df = pd.DataFrame({
        "open": close - 0.5, "high": close + 1, "low": close - 1,
        "close": close, "volume": 1000,
    }, index=dates)
    df.attrs["symbol"] = "AAPL"
    return {"AAPL": df}


def test_graham_importable():
    from agents.hedge_fund.ben_graham import BenGrahamAgent
    agent = BenGrahamAgent()
    assert agent.name is not None


def test_graham_returns_signal(sample_data, sample_portfolio, risk_limits):
    from agents.hedge_fund.ben_graham import BenGrahamAgent
    agent = BenGrahamAgent()
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
