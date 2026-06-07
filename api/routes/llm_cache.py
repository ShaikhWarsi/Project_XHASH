from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

_CACHE: dict[str, tuple[float, str]] = {}
_CACHE_LOCK = threading.Lock()
_CACHE_TTL = 3600
_MAX_CACHE_SIZE = 1000


def _cache_key(model: str, prompt: str) -> str:
    raw = f"{model}:{prompt}"
    return hashlib.sha256(raw.encode()).hexdigest()


def cache_get(model: str, prompt: str) -> Optional[str]:
    key = _cache_key(model, prompt)
    with _CACHE_LOCK:
        entry = _CACHE.get(key)
        if entry is None:
            return None
        ts, content = entry
        if time.time() - ts > _CACHE_TTL:
            del _CACHE[key]
            return None
        return content


def cache_set(model: str, prompt: str, content: str):
    key = _cache_key(model, prompt)
    with _CACHE_LOCK:
        _CACHE[key] = (time.time(), content)
        if len(_CACHE) > _MAX_CACHE_SIZE:
            oldest = sorted(_CACHE.keys(), key=lambda k: _CACHE[k][0])[:100]
            for k in oldest:
                del _CACHE[k]


def cache_clear():
    with _CACHE_LOCK:
        _CACHE.clear()


def cache_stats() -> dict[str, Any]:
    with _CACHE_LOCK:
        return {
            "size": len(_CACHE),
            "max_size": _MAX_CACHE_SIZE,
            "ttl_seconds": _CACHE_TTL,
        }
