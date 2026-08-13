from __future__ import annotations

import logging
import threading
import time
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class TTLCache:
    """Thread-safe in-memory cache with TTL-based eviction.

    Evicts entries whose TTL has expired on access and during periodic
    background cleanup (triggered every ``_cleanup_interval`` seconds).
    """

    def __init__(self, default_ttl: float = 60.0, cleanup_interval: float = 120.0):
        self._default_ttl = default_ttl
        self._cleanup_interval = cleanup_interval
        self._lock = threading.Lock()
        self._cache: dict[str, tuple[float, Any]] = {}
        self._last_cleanup: float = time.time()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            expires, value = self._cache[key]
            if time.time() >= expires:
                del self._cache[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: Optional[float] = None):
        now = time.time()
        ttl = ttl if ttl is not None else self._default_ttl
        with self._lock:
            self._cache[key] = (now + ttl, value)
        self._maybe_cleanup()

    def delete(self, key: str):
        with self._lock:
            self._cache.pop(key, None)

    def clear(self):
        with self._lock:
            self._cache.clear()

    def _maybe_cleanup(self):
        now = time.time()
        if now - self._last_cleanup < self._cleanup_interval:
            return
        self._last_cleanup = now
        with self._lock:
            stale = [k for k, (exp, _) in self._cache.items() if now >= exp]
            for k in stale:
                del self._cache[k]
            if stale:
                logger.debug("TTLCache: evicted %d stale entries", len(stale))


_instance: Optional[TTLCache] = None


def get_cache(default_ttl: float = 60.0) -> TTLCache:
    global _instance
    if _instance is None:
        _instance = TTLCache(default_ttl=default_ttl)
    return _instance
