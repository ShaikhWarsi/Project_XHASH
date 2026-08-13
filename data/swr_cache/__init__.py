from __future__ import annotations

import time
from typing import Any, Callable

_cache: dict[str, tuple[float, Any]] = {}


def cached_or_compute(key: str, compute_fn: Callable[[], Any], ttl: float = 60) -> Any:
    now = time.time()
    if key in _cache:
        expires, value = _cache[key]
        if now < expires:
            return value
    value = compute_fn()
    _cache[key] = (now + ttl, value)
    return value


def invalidate(key: str) -> None:
    _cache.pop(key, None)


def clear_cache() -> None:
    _cache.clear()
