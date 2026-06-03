from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

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

router = APIRouter(prefix="/pairlists", tags=["pairlists"])


class ApplyFiltersRequest(BaseModel):
    symbols: list[str] = Field(..., min_length=1)
    prices: dict[str, float] = {}
    volumes: dict[str, float] = {}
    market_caps: dict[str, float] = {}
    volatility: dict[str, float] = {}
    spreads: dict[str, float] = {}
    min_volume: float = 0
    max_volume: float = 1e12
    min_volatility: float = 0
    max_volatility: float = 0.05
    max_spread_pct: float = 0.01
    min_price: float = 1.0
    max_price: float = 1e12
    min_market_cap: float = 0
    max_market_cap: float = 1e12


@router.get("/filters")
async def list_filters():
    return {
        "filters": [
            {"name": name, "description": cls(name=name).description}
            for name, cls in FILTER_REGISTRY.items()
        ]
    }


@router.post("/apply")
async def apply_pairlist_filters(req: ApplyFiltersRequest):
    filters: list = []
    if req.min_volume > 0 or req.max_volume < 1e12:
        filters.append(VolumeFilter(req.min_volume, req.max_volume))
    if req.min_volatility > 0 or req.max_volatility < 0.05:
        filters.append(VolatilityFilter(req.min_volatility, req.max_volatility))
    if req.max_spread_pct < 1.0:
        filters.append(SpreadFilter(req.max_spread_pct))
    if req.min_price > 0 or req.max_price < 1e12:
        filters.append(PriceFilter(req.min_price, req.max_price))
    if req.min_market_cap > 0 or req.max_market_cap < 1e12:
        filters.append(MarketCapFilter(req.min_market_cap, req.max_market_cap))

    ctx = PairlistContext(
        symbols=req.symbols,
        prices=req.prices,
        volumes=req.volumes,
        market_caps=req.market_caps,
        volatility=req.volatility,
        spreads=req.spreads,
    )
    passing, results = apply_filters(req.symbols, filters, ctx)
    return {
        "total": len(req.symbols),
        "passed": len(passing),
        "passing_symbols": passing,
        "results": [
            {"symbol": r.symbol, "passed": r.passed, "reason": r.reason}
            for r in results
        ],
    }
