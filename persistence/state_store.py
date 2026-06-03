from __future__ import annotations

import logging
import threading
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

_DEFAULT_TTL: float = 300.0
_GRACE_PERIOD: float = 60.0
_CLEANUP_INTERVAL: float = 120.0


class TTLStateStore:
    """Thread-safe state store with TTL-based eviction and dirty-flag grace period.

    Entries that have been recently updated (dirty) are protected from eviction
    for an additional ``grace_period`` beyond the base TTL.  This prevents
    in-flight data from being lost during a cleanup cycle.
    """

    def __init__(
        self,
        default_ttl: float = _DEFAULT_TTL,
        grace_period: float = _GRACE_PERIOD,
    ):
        self._default_ttl = default_ttl
        self._grace_period = grace_period
        self._lock = threading.Lock()
        self._store: dict[str, tuple[float, Any, bool]] = {}
        self._last_cleanup: float = time.time()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._store:
                return None
            expires, value, _ = self._store[key]
            if time.time() >= expires:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: Optional[float] = None):
        now = time.time()
        ttl = ttl if ttl is not None else self._default_ttl
        with self._lock:
            self._store[key] = (now + ttl, value, True)
        self._maybe_cleanup()

    def delete(self, key: str):
        with self._lock:
            self._store.pop(key, None)

    def clear(self):
        with self._lock:
            self._store.clear()

    def _maybe_cleanup(self):
        now = time.time()
        if now - self._last_cleanup < _CLEANUP_INTERVAL:
            return
        self._last_cleanup = now
        with self._lock:
            stale = []
            for key, (expires, _, dirty) in self._store.items():
                effective_ttl = expires + (self._grace_period if dirty else 0.0)
                if now >= effective_ttl:
                    stale.append(key)
            for key in stale:
                del self._store[key]
            if stale:
                logger.debug("Evicted %d stale entries from state store", len(stale))
