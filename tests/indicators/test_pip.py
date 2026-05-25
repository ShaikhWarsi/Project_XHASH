from __future__ import annotations

import numpy as np
import pandas as pd

from signals.indicators.pip import PIPEngine, find_pips


class TestFindPips:
    def test_returns_correct_number_of_points(self):
        data = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0])
        x, y = find_pips(data, n_pips=4)
        assert len(x) == 4
        assert len(y) == 4

    def test_includes_endpoints(self):
        data = np.array([10.0, 20.0, 15.0, 25.0, 30.0])
        x, y = find_pips(data, n_pips=3)
        assert x[0] == 0
        assert x[-1] == len(data) - 1
        assert y[0] == data[0]
        assert y[-1] == data[-1]

    def test_works_with_flat_data(self):
        data = np.ones(20) * 100.0
        x, y = find_pips(data, n_pips=5)
        assert len(x) == 5
        assert len(y) == 5

    def test_dist_measure_1(self):
        data = np.array([1.0, 5.0, 2.0, 8.0, 3.0])
        x, y = find_pips(data, n_pips=4, dist_measure=1)
        assert len(x) == 4

    def test_dist_measure_2(self):
        data = np.array([1.0, 5.0, 2.0, 8.0, 3.0])
        x, y = find_pips(data, n_pips=4, dist_measure=2)
        assert len(x) == 4

    def test_dist_measure_3(self):
        data = np.array([1.0, 5.0, 2.0, 8.0, 3.0])
        x, y = find_pips(data, n_pips=4, dist_measure=3)
        assert len(x) == 4


class TestPIPEngine:
    def test_signal_type(self):
        engine = PIPEngine()
        assert engine.signal_type.value == "structure"

    def test_compute_returns_signals(self):
        n = 100
        dates = pd.date_range("2024-01-01", periods=n, freq="h")
        close = np.sin(np.linspace(0, 4 * np.pi, n)) * 10 + 100
        df = pd.DataFrame({
            "open": close - 0.5, "high": close + 0.5, "low": close - 0.5,
            "close": close, "volume": 1000,
        }, index=dates)
        df.attrs["symbol"] = "TEST"
        df.attrs["timeframe"] = "1h"

        engine = PIPEngine(n_pips=10)
        signals = engine.compute(df)
        assert len(signals) > 0

    def test_compute_with_flat_data_returns_empty(self):
        engine = PIPEngine(n_pips=10)
        df = pd.DataFrame({
            "open": [100.0], "high": [101.0], "low": [99.0],
            "close": [100.0], "volume": [1000],
        })
        df.attrs["symbol"] = "TEST"
        df.attrs["timeframe"] = "1h"
        signals = engine.compute(df)
        assert signals == []

    def test_signals_have_pip_type_in_metadata(self):
        n = 100
        dates = pd.date_range("2024-01-01", periods=n, freq="h")
        close = np.sin(np.linspace(0, 4 * np.pi, n)) * 10 + 100
        df = pd.DataFrame({
            "open": close - 0.5, "high": close + 0.5, "low": close - 0.5,
            "close": close, "volume": 1000,
        }, index=dates)
        df.attrs["symbol"] = "TEST"
        df.attrs["timeframe"] = "1h"

        engine = PIPEngine(n_pips=10)
        signals = engine.compute(df)
        for sig in signals:
            assert "pip_type" in sig.metadata
            assert sig.metadata["pip_type"] in ("high", "low")

    def test_custom_n_pips(self):
        n = 100
        dates = pd.date_range("2024-01-01", periods=n, freq="h")
        close = np.sin(np.linspace(0, 4 * np.pi, n)) * 10 + 100
        df = pd.DataFrame({
            "open": close - 0.5, "high": close + 0.5, "low": close - 0.5,
            "close": close, "volume": 1000,
        }, index=dates)
        df.attrs["symbol"] = "TEST"
        df.attrs["timeframe"] = "1h"

        engine = PIPEngine(n_pips=5)
        signals = engine.compute(df)
        assert len(signals) > 0
