"""Cache for chart HTML indicator computations."""

from __future__ import annotations

import hashlib
import time
from typing import Any

_chart_cache: dict[str, tuple[float, str]] = {}
_chart_cache_ttl = 300.0


def get_chart_cache_key(symbol: str, **params) -> str:
    raw = f"{symbol}:{sorted(params.items())}"
    return hashlib.md5(raw.encode()).hexdigest()


def get_chart_html(key: str) -> str | None:
    entry = _chart_cache.get(key)
    if entry and time.time() < entry[0]:
        return entry[1]
    if key in _chart_cache:
        del _chart_cache[key]
    return None


def set_chart_html(key: str, html: str):
    _chart_cache[key] = (time.time() + _chart_cache_ttl, html)
