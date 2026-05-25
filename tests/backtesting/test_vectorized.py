import pytest
import pandas as pd
import numpy as np

from backtesting.vectorized import VectorBTEngine
from core.errors import TradingEngineError

pytest.importorskip("vectorbt")


def test_requires_close_column():
    df = pd.DataFrame({"open": [1, 2, 3]})
    with pytest.raises(TradingEngineError, match="must contain"):
        VectorBTEngine(df)


def test_engine_creation():
    df = pd.DataFrame({"Close": [100, 101, 102]})
    engine = VectorBTEngine(df)
    assert engine.data is df


def test_run_signal():
    np.random.seed(42)
    close = pd.Series(np.cumsum(np.random.randn(100)) + 100)
    df = pd.DataFrame({"Close": close})
    engine = VectorBTEngine(df)
    entries = pd.Series(False, index=close.index)
    entries.iloc[20::50] = True
    exits = pd.Series(False, index=close.index)
    exits.iloc[40::50] = True
    result = engine.run_signal(entries, exits)
    assert "total_return" in result
    assert "sharpe" in result
    assert "max_drawdown" in result
    assert "total_trades" in result
    assert result["total_trades"] >= 0


def test_run_cross_signals():
    np.random.seed(42)
    close = pd.Series(np.cumsum(np.random.randn(200)) + 100)
    df = pd.DataFrame({"Close": close})
    engine = VectorBTEngine(df)
    result = engine.run_cross_signals(fast_period=5, slow_period=20)
    assert "total_return" in result
    assert isinstance(result["total_return"], float)


def test_run_multiple():
    np.random.seed(42)
    close = pd.Series(np.cumsum(np.random.randn(200)) + 100)
    df = pd.DataFrame({"Close": close})
    engine = VectorBTEngine(df)
    entries = {
        "fast": pd.Series(False, index=close.index),
        "slow": pd.Series(False, index=close.index),
    }
    entries["fast"].iloc[20::50] = True
    entries["slow"].iloc[10::60] = True
    exits = {k: ~v for k, v in entries.items()}
    result = engine.run_multiple(entries, exits)
    assert isinstance(result, pd.DataFrame)
    assert "fast" in result.index
    assert "slow" in result.index




