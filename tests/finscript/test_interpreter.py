from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from finscript import execute


@pytest.fixture
def sample_data():
    n = 100
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    close = 100 + np.linspace(0, 5, n) + np.random.default_rng(42).normal(0, 0.5, n)
    high = close + np.abs(np.random.default_rng(42).normal(0, 0.3, n))
    low = close - np.abs(np.random.default_rng(42).normal(0, 0.3, n))
    open_ = close - np.random.default_rng(42).normal(0, 0.2, n)
    volume = np.random.default_rng(42).poisson(1000, n)
    df = pd.DataFrame({"open": open_, "high": high, "low": low, "close": close, "volume": volume}, index=dates)
    df.attrs["symbol"] = "TEST"
    return {"TEST": df}


def test_simple_expression():
    result = execute("42")
    assert result is not None
    assert "signals" in result


def test_variable_assignment():
    result = execute("x = 10\ny = x * 2")
    assert result is not None


def test_buy_signal():
    code = """
if close > sma(close, 5)
    buy("TEST", 10)
"""
    result = execute(code)
    assert result is not None


def test_sma_function():
    code = 'sma(close, 3)'
    result = execute(code)
    assert result is not None


def test_ema_function():
    code = 'ema(close, 10)'
    result = execute(code)
    assert result is not None


def test_rsi_function():
    code = 'rsi(close, 14)'
    result = execute(code)
    assert result is not None


def test_macd_function():
    code = 'macd(close)'
    result = execute(code)
    assert result is not None


def test_bb_function():
    code = 'bb(close, 20)'
    result = execute(code)
    assert result is not None


def test_plot_generates_output():
    code = 'plot(sma(close, 10))'
    result = execute(code)
    assert result is not None
    assert "plots" in result


def test_full_strategy_with_data(sample_data):
    code = """
strategy("Test", overlay=true)
if crossover(close, sma(close, 5))
    buy("TEST", 10)
if crossunder(close, sma(close, 5))
    sell("TEST", 10)
plot(sma(close, 5))
"""
    result = execute(code, sample_data)
    assert result is not None
    assert "signals" in result
    assert "plots" in result


def test_crossover_detection(sample_data):
    code = """
if crossover(close, sma(close, 5))
    buy("TEST", 10)
"""
    result = execute(code, sample_data)
    assert result is not None


def test_crossunder_detection(sample_data):
    code = """
if crossunder(close, sma(close, 5))
    sell("TEST", 10)
"""
    result = execute(code, sample_data)
    assert result is not None


def test_multiple_symbols(sample_data):
    data = {"TEST": sample_data["TEST"], "TEST2": sample_data["TEST"].copy()}
    data["TEST2"].attrs["symbol"] = "TEST2"
    code = """
if close > sma(close, 5)
    buy("TEST", 10)
    buy("TEST2", 5)
"""
    result = execute(code, data)
    assert result is not None
