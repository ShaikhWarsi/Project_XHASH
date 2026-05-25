from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from api.services.backtest_cache import get_cached, set_cache, invalidate, stats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backtest-cache", tags=["backtest cache"])


@router.get("/stats")
async def cache_stats():
    return stats()


@router.get("/lookup")
async def cache_lookup(strategy: str, symbol: str, start: str, end: str, params: str = "{}"):
    import json
    p = json.loads(params)
    cached = get_cached(strategy, p, symbol, start, end)
    if cached:
        return {"hit": True, "result": cached}
    return {"hit": False}


@router.post("/store")
async def cache_store(
    strategy: str,
    symbol: str,
    start: str,
    end: str,
    result: dict[str, Any],
    params: str = "{}",
):
    import json
    p = json.loads(params)
    key = set_cache(strategy, p, symbol, start, end, result)
    return {"key": key, "status": "cached"}


@router.delete("/invalidate")
async def cache_invalidate(strategy: str = None, symbol: str = None):
    count = invalidate(strategy, symbol)
    return {"invalidated": count}
