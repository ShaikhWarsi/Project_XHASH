from __future__ import annotations
import asyncio
import json
import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

_REDIS_URL = os.environ.get("REDIS_URL", "")
_use_redis = bool(_REDIS_URL)


def get_redis_client():
    if not _use_redis:
        return None
    try:
        import redis.asyncio as aioredis
        return aioredis.from_url(_REDIS_URL, decode_responses=True)
    except Exception as e:
        logger.warning("Failed to connect to Redis at %s: %s", _REDIS_URL, e)
        return None


_redis = get_redis_client()


# ── In-memory fallback ──
_mem_cache: dict[str, tuple[float, str]] = {}
_mem_lock = asyncio.Lock()


async def cache_get(key: str) -> Optional[str]:
    if _redis:
        try:
            val = await _redis.get(key)
            if val is not None:
                return val
        except Exception as e:
            logger.debug("Redis get failed: %s", e)
    async with _mem_lock:
        entry = _mem_cache.get(key)
        if entry and time.time() < entry[0]:
            return entry[1]
        if key in _mem_cache:
            del _mem_cache[key]
    return None


async def cache_set(key: str, value: str, ttl: float = 300.0) -> None:
    if _redis:
        try:
            await _redis.setex(key, int(ttl), value)
            return
        except Exception as e:
            logger.debug("Redis set failed: %s", e)
    async with _mem_lock:
        _mem_cache[key] = (time.time() + ttl, value)


async def cache_delete(key: str) -> None:
    if _redis:
        try:
            await _redis.delete(key)
        except Exception:
            pass
    async with _mem_lock:
        _mem_cache.pop(key, None)


async def cache_clear() -> None:
    if _redis:
        try:
            await _redis.flushdb()
        except Exception:
            pass
    async with _mem_lock:
        _mem_cache.clear()


async def cache_get_json(key: str) -> Any:
    raw = await cache_get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


async def cache_set_json(key: str, value: Any, ttl: float = 300.0) -> None:
    await cache_set(key, json.dumps(value, default=str), ttl)


def is_redis_connected() -> bool:
    return _redis is not None
