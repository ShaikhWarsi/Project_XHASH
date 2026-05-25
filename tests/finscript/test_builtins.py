from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


def _runtime_with(data):
    from finscript.builtins import FinScriptRuntime
    rt = FinScriptRuntime()
    rt.set_data("TEST", data)
    return rt


def test_sma_values():
    data = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
    runtime = _runtime_with(pd.DataFrame({"close": data}))
    result = runtime.sma(data, 3)
    assert result is not None
    assert np.isnan(result.iloc[0])
    assert np.isnan(result.iloc[1])
    assert result.iloc[2] == 2.0
    assert result.iloc[3] == 3.0
    assert result.iloc[4] == 4.0


def test_ema_values():
    data = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
    runtime = _runtime_with(pd.DataFrame({"close": data}))
    result = runtime.ema(data, 3)
    assert result is not None
    assert len(result) == 5


def test_rsi_range():
    np.random.seed(42)
    data = pd.Series(100 + np.cumsum(np.random.normal(0, 1, 100)))
    runtime = _runtime_with(pd.DataFrame({"close": data}))
    result = runtime.rsi(data, 14)
    assert result is not None
    valid = result.dropna()
    assert all(0 <= v <= 100 for v in valid)


def test_macd_components():
    np.random.seed(42)
    data = pd.Series(100 + np.cumsum(np.random.normal(0, 1, 100)))
    df = pd.DataFrame({"close": data, "high": data + 1, "low": data - 1})
    runtime = _runtime_with(df)
    result = runtime.macd()
    assert result is not None
    assert len(result[0]) == len(data)


def test_bb_output():
    np.random.seed(42)
    data = pd.Series(100 + np.cumsum(np.random.normal(0, 1, 100)))
    runtime = _runtime_with(pd.DataFrame({"close": data}))
    result = runtime.bb(data, 20)
    assert result is not None


def test_highest_lowest():
    data = pd.Series([1.0, 5.0, 3.0, 2.0, 4.0])
    runtime = _runtime_with(pd.DataFrame({"close": data}))
    assert runtime.highest(data, 5).iloc[-1] == 5.0
    assert runtime.lowest(data, 5).iloc[-1] == 1.0


def test_stdev():
    data = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
    runtime = _runtime_with(pd.DataFrame({"close": data}))
    result = runtime.stdev(data, 5)
    assert result is not None
    assert result.iloc[-1] > 0


def test_atr():
    np.random.seed(42)
    n = 100
    df = pd.DataFrame({
        "high": 100 + np.cumsum(np.random.normal(0, 1, n)) + 0.5,
        "low": 100 + np.cumsum(np.random.normal(0, 1, n)) - 0.5,
        "close": 100 + np.cumsum(np.random.normal(0, 1, n)),
    })
    runtime = _runtime_with(df)
    result = runtime.atr(14)
    assert result is not None


def test_vwap():
    n = 100
    df = pd.DataFrame({
        "high": 100 + np.random.rand(n) * 2,
        "low": 99 + np.random.rand(n) * 2,
        "close": 100 + np.random.rand(n) * 2,
        "volume": np.random.poisson(1000, n),
    })
    runtime = _runtime_with(df)
    result = runtime.vwap()
    assert result is not None
    assert len(result) == n


def test_ohlc_accessors():
    df = pd.DataFrame({"close": [1.0, 2.0, 3.0], "open": [0.9, 1.8, 2.7], "high": [1.1, 2.2, 3.3], "low": [0.8, 1.7, 2.6], "volume": [100, 200, 300]})
    runtime = _runtime_with(df)
    assert runtime.close().iloc[-1] == 3.0
    assert runtime.high().iloc[-1] == 3.3
    assert runtime.low().iloc[-1] == 2.6
    assert runtime.volume().iloc[-1] == 300


def test_crossover_logic():
    fast = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
    slow = pd.Series([2.0, 2.5, 3.0, 3.5, 4.0])
    runtime = _runtime_with(pd.DataFrame({"close": pd.Series([1, 2, 3, 4, 5])}))
    result = runtime.crossover(fast, slow)
    assert result is not None
    assert result.iloc[-1] == False or result.iloc[-1] == 0
