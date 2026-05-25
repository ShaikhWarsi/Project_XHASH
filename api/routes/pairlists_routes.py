from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from api.services.pairlists import (
    VolumeFilter,
    VolatilityFilter,
    SpreadFilter,
    PriceFilter,
    MarketCapFilter,
    PerformanceFilter,
    FILTER_REGISTRY,
    PairlistContext,
    apply_filters,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pairlists", tags=["pairlists"])


@router.get("/filters")
async def list_filters():
    return {
        "filters": [
            {"name": name, "description": cls(name=name).description}
            for name, cls in FILTER_REGISTRY.items()
        ]
    }


@router.post("/apply")
async def apply_pairlist_filters(
    symbols: list[str],
    prices: dict[str, float] = {},
    volumes: dict[str, float] = {},
    market_caps: dict[str, float] = {},
    volatility: dict[str, float] = {},
    spreads: dict[str, float] = {},
    min_volume: float = 0,
    max_volume: float = float("inf"),
    min_volatility: float = 0,
    max_volatility: float = 0.05,
    max_spread_pct: float = 0.01,
    min_price: float = 1.0,
    max_price: float = float("inf"),
    min_market_cap: float = 0,
    max_market_cap: float = float("inf"),
):
    filters: list = []
    if min_volume > 0 or max_volume < float("inf"):
        filters.append(VolumeFilter(min_volume, max_volume))
    if min_volatility > 0 or max_volatility < 0.05:
        filters.append(VolatilityFilter(min_volatility, max_volatility))
    if max_spread_pct < 1.0:
        filters.append(SpreadFilter(max_spread_pct))
    if min_price > 0 or max_price < float("inf"):
        filters.append(PriceFilter(min_price, max_price))
    if min_market_cap > 0 or max_market_cap < float("inf"):
        filters.append(MarketCapFilter(min_market_cap, max_market_cap))

    ctx = PairlistContext(
        symbols=symbols,
        prices=prices,
        volumes=volumes,
        market_caps=market_caps,
        volatility=volatility,
        spreads=spreads,
    )
    passing, results = apply_filters(symbols, filters, ctx)
    return {
        "total": len(symbols),
        "passed": len(passing),
        "passing_symbols": passing,
        "results": [
            {"symbol": r.symbol, "passed": r.passed, "reason": r.reason}
            for r in results
        ],
    }
