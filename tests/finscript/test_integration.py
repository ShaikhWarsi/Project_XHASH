from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from finscript import execute, extract_symbols


@pytest.fixture
def sample_market_data():
    n = 200
    np.random.seed(42)
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    close = 100 + np.linspace(0, 10, n) + np.random.normal(0, 0.5, n).cumsum()
    high = close + np.abs(np.random.normal(0, 0.5, n))
    low = close - np.abs(np.random.normal(0, 0.5, n))
    open_ = close - np.random.normal(0, 0.3, n)
    volume = np.random.poisson(1000, n)
    df = pd.DataFrame({"open": open_, "high": high, "low": low, "close": close, "volume": volume}, index=dates)
    df.attrs["symbol"] = "AAPL"
    return {"AAPL": df}


def test_full_pipeline_sma_cross(sample_market_data):
    code = """
strategy("SMA Cross", overlay=true)
fast_sma = sma(close, 10)
slow_sma = sma(close, 30)
if crossover(fast_sma, slow_sma)
    buy("AAPL", 100)
if crossunder(fast_sma, slow_sma)
    sell("AAPL", 100)
plot(fast_sma)
plot(slow_sma)
"""
    result = execute(code, sample_market_data)
    assert result is not None
    assert "signals" in result
    assert "plots" in result
    assert "strategy" in result
    assert "globals" in result


def test_full_pipeline_rsi_strategy(sample_market_data):
    code = r"""
strategy("RSI Strategy", overlay=false)
r = rsi(close, 14)
if r < 30
    buy("AAPL", 10)
if r > 70
    sell("AAPL", 10)
plot(r)
"""
    result = execute(code, sample_market_data)
    assert result is not None


def test_extract_symbols():
    code = 'buy("AAPL", 10)'
    symbols = extract_symbols(code)
    assert symbols is not None
    assert isinstance(symbols, list)


def test_extract_symbols_from_strategy(sample_market_data):
    code = """
strategy("Test", overlay=true)
if close > sma(close, 20)
    buy("AAPL", 10)
    sell("MSFT", 5)
"""
    symbols = extract_symbols(code)
    assert isinstance(symbols, list)


def test_empty_code():
    result = execute("")
    assert result is not None


def test_only_comments():
    result = execute("// this is a comment\n// another line")
    assert result is not None
