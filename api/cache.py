import time
from functools import wraps
from typing import Any, Callable

_cache: dict[str, tuple[float, Any]] = {}
_default_ttl = 30.0


def cached(ttl: float = _default_ttl):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{args}:{kwargs}"
            now = time.time()
            if key in _cache:
                expires, value = _cache[key]
                if now < expires:
                    return value
            result = await func(*args, **kwargs)
            _cache[key] = (now + ttl, result)
            return result
        return wrapper
    return decorator


def invalidate_cache(pattern: str = ""):
    global _cache
    if not pattern:
        _cache.clear()
    else:
        _cache = {k: v for k, v in _cache.items() if pattern not in k}
