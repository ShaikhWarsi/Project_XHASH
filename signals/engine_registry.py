"""Declarative signal engine registry — auto-discovers and creates engines."""

from __future__ import annotations

from signals.base import SignalEngine

from .indicators import (
    ATRMarketStructureEngine,
    CandlePatternEngine,
    EQHEQLEngine,
    FlagsPennantsEngine,
    FVGEngine,
    HarmonicPatternEngine,
    HeadShouldersEngine,
    LiquidityEngine,
    MarketStructureEngine,
    OrderBlockEngine,
    PIPEngine,
    PriceActionEngine,
    SupportResistanceEngine,
)
from .ml import PIPPatternMinerEngine, TrendlineBreakoutEngine
from .regime import TrendRegimeEngine, VolatilityRegimeEngine, WassersteinRegimeEngine

ENGINE_REGISTRY: dict[str, type[SignalEngine]] = {
    "order_block": OrderBlockEngine,
    "fvg": FVGEngine,
    "bos": MarketStructureEngine,
    "liquidity": LiquidityEngine,
    "candle_pattern": CandlePatternEngine,
    "eqh_eql": EQHEQLEngine,
    "harmonic": HarmonicPatternEngine,
    "head_shoulders": HeadShouldersEngine,
    "flags_pennants": FlagsPennantsEngine,
    "market_structure": ATRMarketStructureEngine,
    "support_resistance": SupportResistanceEngine,
    "price_action": PriceActionEngine,
    "pip": PIPEngine,
    "trend_regime": TrendRegimeEngine,
    "volatility_regime": VolatilityRegimeEngine,
    "wasserstein_regime": WassersteinRegimeEngine,
    "pip_miner": PIPPatternMinerEngine,
    "trendline_breakout": TrendlineBreakoutEngine,
}

ENGINE_CATEGORIES: dict[str, list[str]] = {
    "smc": ["order_block", "fvg", "bos", "liquidity"],
    "pattern": ["candle_pattern", "eqh_eql", "harmonic", "head_shoulders", "flags_pennants"],
    "structure": ["market_structure", "price_action", "pip", "support_resistance"],
    "regime": ["trend_regime", "volatility_regime", "wasserstein_regime"],
    "ml": ["pip_miner", "trendline_breakout"],
}


def create_engine(name: str, **kwargs) -> SignalEngine | None:
    cls = ENGINE_REGISTRY.get(name)
    if cls is None:
        return None
    return cls(**kwargs)


def list_engines(category: str | None = None) -> dict[str, type[SignalEngine]]:
    if category is None:
        return dict(ENGINE_REGISTRY)  # return copy
    names = ENGINE_CATEGORIES.get(category, [])
    return {n: ENGINE_REGISTRY[n] for n in names if n in ENGINE_REGISTRY}
