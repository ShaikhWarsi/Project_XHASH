from __future__ import annotations

import hashlib
import os
import time
from typing import Any

_chart_cache: dict[str, tuple[float, str]] = {}
_chart_cache_ttl: float = float(os.environ.get("CHART_CACHE_TTL", "300"))
_cache_hits = 0
_cache_misses = 0


def configure_cache(ttl_seconds: float = 300.0) -> None:
    global _chart_cache_ttl
    _chart_cache_ttl = ttl_seconds


def get_chart_cache_key(symbol: str, **params) -> str:
    raw = f"{symbol}:{sorted(params.items())}"
    return hashlib.md5(raw.encode()).hexdigest()


def get_chart_html(key: str) -> str | None:
    global _cache_hits, _cache_misses
    entry = _chart_cache.get(key)
    if entry and time.time() < entry[0]:
        _cache_hits += 1
        return entry[1]
    if key in _chart_cache:
        del _chart_cache[key]
    _cache_misses += 1
    return None


def set_chart_html(key: str, html: str, ttl: float | None = None) -> None:
    _chart_cache[key] = (time.time() + (ttl or _chart_cache_ttl), html)


def clear_cache() -> None:
    _chart_cache.clear()


def get_cache_stats() -> dict[str, Any]:
    return {
        "size": len(_chart_cache),
        "ttl_seconds": _chart_cache_ttl,
        "hits": _cache_hits,
        "misses": _cache_misses,
        "hit_ratio": round(_cache_hits / (_cache_hits + _cache_misses), 3) if (_cache_hits + _cache_misses) > 0 else 0,
    }


def invalidate_symbol(symbol: str) -> int:
    count = 0
    keys_to_delete = [k for k in _chart_cache if k.startswith(hashlib.md5(f"{symbol}:".encode()).hexdigest()[:8])]
    for key in keys_to_delete:
        del _chart_cache[key]
        count += 1
    return count
