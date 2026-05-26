from charting.indicators.base import IndicatorPlugin, IndicatorRegistry, SignalResult
from charting.indicators.momentum import MomentumPlugin
from charting.indicators.overlap import OverlapPlugin
from charting.indicators.volatility import VolatilityPlugin

registry = IndicatorRegistry()
registry.register(MomentumPlugin())
registry.register(OverlapPlugin())
registry.register(VolatilityPlugin())

__all__ = [
    "IndicatorPlugin",
    "IndicatorRegistry",
    "SignalResult",
    "registry",
]
