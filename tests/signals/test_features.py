import pytest
import pandas as pd
import numpy as np


class TestFeatureStore:
    @pytest.fixture
    def store(self):
        from signals.features.feature_store import FeatureStore
        import tempfile, os
        db = tempfile.mktemp(suffix=".db")
        fs = FeatureStore(db)
        yield fs
        try:
            os.remove(db)
        except OSError:
            pass

    def test_store_and_get_features(self, store):
        store.store_features("AAPL", {"sma_20": 150.5, "rsi_14": 65.0})
        latest = store.get_latest_features("AAPL")
        assert latest["sma_20"] == 150.5
        assert latest["rsi_14"] == 65.0

    def test_get_empty_features(self, store):
        result = store.get_latest_features("NONEXISTENT")
        assert result == {}

    def test_list_feature_names(self, store):
        store.store_features("AAPL", {"sma_20": 150.0, "ema_50": 148.0})
        names = store.list_feature_names("AAPL")
        assert "sma_20" in names
        assert "ema_50" in names

    def test_register_definition(self, store):
        store.register_feature_definition("sma_20", "Simple moving average 20", category="trend")
        defs = store.list_definitions(category="trend")
        assert len(defs) >= 1
        assert defs[0]["name"] == "sma_20"

    def test_delete_old_features(self, store):
        store.store_features("AAPL", {"test": 1.0})
        store.delete_old_features("2100-01-01")
        count = store.get_feature_count()
        assert count == 0

    def test_get_feature_count(self, store):
        store.store_features("AAPL", {"a": 1.0})
        store.store_features("MSFT", {"b": 2.0})
        assert store.get_feature_count() == 2


class TestFeatureSelector:
    @pytest.fixture
    def selector(self):
        from signals.features.tsfresh_engine import FeatureSelector
        return FeatureSelector()

    def test_remove_high_correlation(self, selector):
        np.random.seed(42)
        data = pd.DataFrame({
            "a": np.random.randn(100),
            "b": np.random.randn(100),
            "c": np.random.randn(100),
        })
        result = selector.remove_high_correlation(data)
        assert len(result.columns) <= 3

    def test_select_by_variance(self, selector):
        data = pd.DataFrame({
            "const": np.ones(100),
            "varying": np.random.randn(100),
        })
        result = selector.select_by_variance(data, threshold=0.01)
        assert "const" not in result.columns
        assert "varying" in result.columns


class TestTSFreshEngine:
    def test_requires_tsfresh(self):
        try:
            from signals.features.tsfresh_engine import TSFreshEngine
            TSFreshEngine()
        except ImportError:
            pass  # Expected if tsfresh not installed
