from __future__ import annotations

from signals.base import SignalEngine
from signals.engine_registry import (
    ENGINE_CATEGORIES,
    ENGINE_REGISTRY,
    create_engine,
    list_engines,
)


class TestEngineRegistry:
    def test_all_18_engines_registered(self):
        assert len(ENGINE_REGISTRY) == 18

    def test_all_are_signalengine_subclasses(self):
        for name, cls in ENGINE_REGISTRY.items():
            assert issubclass(cls, SignalEngine), f"{name} is not a SignalEngine subclass"

    def test_registry_contains_expected_keys(self):
        expected = {
            "order_block", "fvg", "bos", "liquidity",
            "candle_pattern", "eqh_eql", "harmonic", "head_shoulders", "flags_pennants",
            "market_structure", "support_resistance", "price_action", "pip",
            "trend_regime", "volatility_regime", "wasserstein_regime",
            "pip_miner", "trendline_breakout",
        }
        assert set(ENGINE_REGISTRY.keys()) == expected


class TestEngineCategories:
    def test_smc_category(self):
        assert set(ENGINE_CATEGORIES["smc"]) == {"order_block", "fvg", "bos", "liquidity"}

    def test_pattern_category(self):
        assert set(ENGINE_CATEGORIES["pattern"]) == {
            "candle_pattern", "eqh_eql", "harmonic", "head_shoulders", "flags_pennants",
        }

    def test_structure_category(self):
        assert set(ENGINE_CATEGORIES["structure"]) == {
            "market_structure", "price_action", "pip", "support_resistance",
        }

    def test_regime_category(self):
        assert set(ENGINE_CATEGORIES["regime"]) == {
            "trend_regime", "volatility_regime", "wasserstein_regime",
        }

    def test_ml_category(self):
        assert set(ENGINE_CATEGORIES["ml"]) == {"pip_miner", "trendline_breakout"}

    def test_all_engines_in_at_least_one_category(self):
        categorized = set()
        for names in ENGINE_CATEGORIES.values():
            categorized.update(names)
        assert categorized == set(ENGINE_REGISTRY.keys())

    def test_no_duplicate_engine_names_across_categories(self):
        all_names = []
        for names in ENGINE_CATEGORIES.values():
            all_names.extend(names)
        assert len(all_names) == len(set(all_names))


class TestCreateEngine:
    def test_create_smc_engine(self):
        engine = create_engine("order_block")
        assert engine is not None
        assert isinstance(engine, SignalEngine)

    def test_create_pattern_engine(self):
        engine = create_engine("harmonic")
        assert engine is not None

    def test_create_structure_engine(self):
        engine = create_engine("market_structure")
        assert engine is not None

    def test_create_regime_engine(self):
        engine = create_engine("trend_regime")
        assert engine is not None

    def test_create_with_kwargs(self):
        engine = create_engine("harmonic", err_thresh=0.15)
        assert engine is not None
        assert engine.err_thresh == 0.15

    def test_create_invalid_engine_returns_none(self):
        engine = create_engine("nonexistent_engine")
        assert engine is None

    def test_create_all_engines_successfully(self):
        for name in ENGINE_REGISTRY:
            engine = create_engine(name)
            assert engine is not None, f"Failed to create engine: {name}"
            assert isinstance(engine, SignalEngine)


class TestListEngines:
    def test_list_all_returns_copy(self):
        result = list_engines()
        assert result == ENGINE_REGISTRY
        result.clear()
        assert len(ENGINE_REGISTRY) == 18

    def test_list_smc_category(self):
        result = list_engines("smc")
        assert set(result.keys()) == {"order_block", "fvg", "bos", "liquidity"}

    def test_list_pattern_category(self):
        result = list_engines("pattern")
        assert len(result) == 5

    def test_list_ml_category(self):
        result = list_engines("ml")
        assert len(result) == 2

    def test_list_unknown_category_returns_empty(self):
        result = list_engines("unknown")
        assert result == {}
