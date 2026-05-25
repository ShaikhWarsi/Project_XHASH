from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PairlistContext:
    symbols: list[str]
    prices: dict[str, float]
    volumes: dict[str, float]
    market_caps: dict[str, float] = field(default_factory=dict)
    volatility: dict[str, float] = field(default_factory=dict)
    spreads: dict[str, float] = field(default_factory=dict)
    metadata: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class FilterResult:
    symbol: str
    passed: bool
    reason: str = ""
    score: float = 1.0


class PairlistFilter(ABC):
    name: str = "base"
    description: str = ""

    @abstractmethod
    def filter(self, ctx: PairlistContext) -> list[FilterResult]:
        ...


class VolumeFilter(PairlistFilter):
    name = "volume"
    description = "Filters by minimum average volume"

    def __init__(self, min_volume: float = 1_000_000, max_volume: float = float("inf")):
        self.min_volume = min_volume
        self.max_volume = max_volume

    def filter(self, ctx: PairlistContext) -> list[FilterResult]:
        results = []
        for sym in ctx.symbols:
            vol = ctx.volumes.get(sym, 0)
            if vol < self.min_volume:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Volume {vol:,.0f} < {self.min_volume:,.0f}"))
            elif vol > self.max_volume:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Volume {vol:,.0f} > {self.max_volume:,.0f}"))
            else:
                results.append(FilterResult(symbol=sym, passed=True))
        return results


class VolatilityFilter(PairlistFilter):
    name = "volatility"
    description = "Filters by volatility range"

    def __init__(self, min_vol: float = 0.0, max_vol: float = 0.05):
        self.min_vol = min_vol
        self.max_vol = max_vol

    def filter(self, ctx: PairlistContext) -> list[FilterResult]:
        results = []
        for sym in ctx.symbols:
            vol = ctx.volatility.get(sym, 0)
            if vol < self.min_vol:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Volatility {vol:.4f} < {self.min_vol:.4f}"))
            elif vol > self.max_vol:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Volatility {vol:.4f} > {self.max_vol:.4f}"))
            else:
                results.append(FilterResult(symbol=sym, passed=True))
        return results


class SpreadFilter(PairlistFilter):
    name = "spread"
    description = "Filters by bid-ask spread"

    def __init__(self, max_spread_pct: float = 0.01):
        self.max_spread_pct = max_spread_pct

    def filter(self, ctx: PairlistContext) -> list[FilterResult]:
        results = []
        for sym in ctx.symbols:
            spread = ctx.spreads.get(sym, 0)
            if spread > self.max_spread_pct:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Spread {spread*100:.3f}% > {self.max_spread_pct*100:.2f}%"))
            else:
                results.append(FilterResult(symbol=sym, passed=True))
        return results


class PriceFilter(PairlistFilter):
    name = "price"
    description = "Filters by price range"

    def __init__(self, min_price: float = 1.0, max_price: float = float("inf")):
        self.min_price = min_price
        self.max_price = max_price

    def filter(self, ctx: PairlistContext) -> list[FilterResult]:
        results = []
        for sym in ctx.symbols:
            price = ctx.prices.get(sym, 0)
            if price < self.min_price:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Price {price:.2f} < {self.min_price:.2f}"))
            elif price > self.max_price:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Price {price:.2f} > {self.max_price:.2f}"))
            else:
                results.append(FilterResult(symbol=sym, passed=True))
        return results


class MarketCapFilter(PairlistFilter):
    name = "market_cap"
    description = "Filters by market cap range"

    def __init__(self, min_mcap: float = 100_000_000, max_mcap: float = float("inf")):
        self.min_mcap = min_mcap
        self.max_mcap = max_mcap

    def filter(self, ctx: PairlistContext) -> list[FilterResult]:
        results = []
        for sym in ctx.symbols:
            mcap = ctx.market_caps.get(sym, 0)
            if mcap < self.min_mcap:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Market cap {mcap:,.0f} < {self.min_mcap:,.0f}"))
            elif mcap > self.max_mcap:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Market cap {mcap:,.0f} > {self.max_mcap:,.0f}"))
            else:
                results.append(FilterResult(symbol=sym, passed=True))
        return results


class PerformanceFilter(PairlistFilter):
    name = "performance"
    description = "Filters by recent performance"

    def __init__(self, min_return_pct: float = -20.0, max_return_pct: float = 100.0, lookback_days: int = 30):
        self.min_return_pct = min_return_pct
        self.max_return_pct = max_return_pct
        self.lookback_days = lookback_days

    def filter(self, ctx: PairlistContext) -> list[FilterResult]:
        results = []
        for sym in ctx.symbols:
            meta = ctx.metadata.get(sym, {})
            ret = meta.get(f"return_{self.lookback_days}d", 0)
            if ret < self.min_return_pct:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Return {ret:.1f}% < {self.min_return_pct}%"))
            elif ret > self.max_return_pct:
                results.append(FilterResult(symbol=sym, passed=False, reason=f"Return {ret:.1f}% > {self.max_return_pct}%"))
            else:
                results.append(FilterResult(symbol=sym, passed=True))
        return results


FILTER_REGISTRY: dict[str, type[PairlistFilter]] = {
    "volume": VolumeFilter,
    "volatility": VolatilityFilter,
    "spread": SpreadFilter,
    "price": PriceFilter,
    "market_cap": MarketCapFilter,
    "performance": PerformanceFilter,
}


def apply_filters(
    symbols: list[str],
    filters: list[PairlistFilter],
    ctx: PairlistContext,
) -> tuple[list[str], list[FilterResult]]:
    passing = list(symbols)
    all_results = []
    for f in filters:
        results = f.filter(PairlistContext(
            symbols=passing,
            prices=ctx.prices,
            volumes=ctx.volumes,
            market_caps=ctx.market_caps,
            volatility=ctx.volatility,
            spreads=ctx.spreads,
            metadata=ctx.metadata,
        ))
        failing = {r.symbol for r in results if not r.passed}
        passing = [s for s in passing if s not in failing]
        all_results.extend(results)
    return passing, all_results
