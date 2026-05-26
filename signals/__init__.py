from .base import SignalEngine, SignalResult
from .composite import SignalAggregator, SignalWeight
from .alpha_zoo import Registry

try:
    from .ml import (
        PIPPatternMinerEngine,
        TrendlineBreakoutEngine,
        fit_trendlines_high_low,
    )
except ImportError:
    PIPPatternMinerEngine = None
    TrendlineBreakoutEngine = None
    fit_trendlines_high_low = None

from .ml.validation import MonteCarloPermutationTest

from . import conditions  # noqa: F401

try:
    from . import vision  # noqa: F401
except ImportError:
    pass

__all__ = [
    "SignalEngine", "SignalResult",
    "SignalAggregator", "SignalWeight",
    "TrendlineBreakoutEngine", "PIPPatternMinerEngine",
    "MonteCarloPermutationTest",
    "fit_trendlines_high_low",
    "Registry",
]
