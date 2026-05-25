"""Portfolio optimizer package.

Available optimizers:
  - equal_volatility: inverse-volatility weights
  - risk_parity: equal risk contribution (Spinu-style)
  - mean_variance: max Sharpe via scipy
  - max_diversification: maximize diversification ratio

Select via optimizer in config.json; default is off (1/N).
"""

from backtesting.optimizers.equal_volatility import EqualVolatilityOptimizer, optimize as equal_volatility
from backtesting.optimizers.risk_parity import RiskParityOptimizer, optimize as risk_parity

__all__ = [
    "EqualVolatilityOptimizer",
    "RiskParityOptimizer",
    "equal_volatility",
    "risk_parity",
]
