from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from api.services.backtest_cache import get_cached, set_cache, invalidate, stats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtest-cache", tags=["backtest cache"])


@router.get("/stats")
async def cache_stats():
    return stats()


def _safe_json(val):
    if val is None:
        return {}
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return {}


@router.get("/lookup")
async def cache_lookup(strategy: str, symbol: str, start: str, end: str, params: str = "{}"):
    p = _safe_json(params)
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
    p = _safe_json(params)
    key = set_cache(strategy, p, symbol, start, end, result)
    return {"key": key, "status": "cached"}


@router.delete("/invalidate")
async def cache_invalidate(strategy: str = None, symbol: str = None):
    count = invalidate(strategy, symbol)
    return {"invalidated": count}
