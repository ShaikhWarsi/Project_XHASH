"""Multi-asset backtest engines.

BaseEngine (ABC) provides bar-by-bar execution with market-rule hooks.
Concrete engines implement market-specific rules.

Available engines:
  - ChinaAEngine:          A-share (T+1, no short, price limits, stamp tax)
  - GlobalEquityEngine:    US / HK equities (fractional shares, zero comm)
  - CryptoEngine:          Crypto perpetuals (funding fees, liquidation)
  - ForexEngine:           FX spot/CFD (spread, swap, high leverage)
  - FuturesBaseEngine:     Intermediate layer adding contract-multiplier logic
  - ChinaFuturesEngine:    China commodity/financial futures
  - GlobalFuturesEngine:   International futures (CME/ICE/Eurex)
  - CompositeEngine:       Cross-market engine with shared capital pool

Inheritance:
  BaseEngine
  ├── ChinaAEngine
  ├── GlobalEquityEngine
  ├── CryptoEngine
  ├── ForexEngine
  ├── CompositeEngine
  └── FuturesBaseEngine
      ├── ChinaFuturesEngine
      └── GlobalFuturesEngine
"""

from backtesting.market_engines.base import BaseEngine
from backtesting.market_engines.china_a import ChinaAEngine
from backtesting.market_engines.crypto import CryptoEngine
from backtesting.market_engines.forex import ForexEngine
from backtesting.market_engines.global_equity import GlobalEquityEngine
from backtesting.market_engines.futures_base import FuturesBaseEngine
from backtesting.market_engines.china_futures import ChinaFuturesEngine
from backtesting.market_engines.global_futures import GlobalFuturesEngine
from backtesting.market_engines.composite import CompositeEngine

__all__ = [
    "BaseEngine",
    "ChinaAEngine",
    "CryptoEngine",
    "ForexEngine",
    "GlobalEquityEngine",
    "FuturesBaseEngine",
    "ChinaFuturesEngine",
    "GlobalFuturesEngine",
    "CompositeEngine",
]
