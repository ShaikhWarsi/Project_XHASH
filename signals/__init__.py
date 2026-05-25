from .base import SignalEngine, SignalResult
from .composite import SignalAggregator, SignalWeight
from .alpha_zoo import Registry

try:
    from .ml import PIPPatternMinerEngine, TrendlineBreakoutEngine
except ImportError:
    PIPPatternMinerEngine = None
    TrendlineBreakoutEngine = None

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
    "Registry",
]
