from __future__ import annotations

import asyncio
import hashlib
import os
import time
from typing import Any

_chart_cache: dict[str, tuple[float, str]] = {}
_chart_cache_ttl: float = float(os.environ.get("CHART_CACHE_TTL", "300"))
_cache_hits = 0
_cache_misses = 0
_cache_lock = asyncio.Lock()


def configure_cache(ttl_seconds: float = 300.0) -> None:
    global _chart_cache_ttl
    _chart_cache_ttl = ttl_seconds


def get_chart_cache_key(symbol: str, user_id: str = "", **params) -> str:
    items = sorted((k, str(v)) for k, v in params.items())
    raw = f"{symbol}:{user_id}:{items}"
    return hashlib.md5(raw.encode()).hexdigest()


async def get_chart_html(key: str) -> str | None:
    global _cache_hits, _cache_misses
    async with _cache_lock:
        entry = _chart_cache.get(key)
        if entry and time.time() < entry[0]:
            _cache_hits += 1
            return entry[1]
        if key in _chart_cache:
            del _chart_cache[key]
        _cache_misses += 1
    return None


async def set_chart_html(key: str, html: str, ttl: float | None = None) -> None:
    async with _cache_lock:
        _chart_cache[key] = (time.time() + (ttl or _chart_cache_ttl), html)


async def clear_cache() -> None:
    async with _cache_lock:
        _chart_cache.clear()


async def get_cache_stats() -> dict[str, Any]:
    async with _cache_lock:
        return {
            "size": len(_chart_cache),
            "ttl_seconds": _chart_cache_ttl,
            "hits": _cache_hits,
            "misses": _cache_misses,
            "hit_ratio": round(_cache_hits / (_cache_hits + _cache_misses), 3) if (_cache_hits + _cache_misses) > 0 else 0,
        }


async def invalidate_symbol(symbol: str) -> int:
    prefix = hashlib.md5(f"{symbol}:".encode()).hexdigest()[:8]
    async with _cache_lock:
        keys_to_delete = [k for k in _chart_cache if k.startswith(prefix)]
        for key in keys_to_delete:
            del _chart_cache[key]
        return len(keys_to_delete)
