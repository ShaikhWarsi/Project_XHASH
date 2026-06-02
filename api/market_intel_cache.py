import json
import threading
import time
from typing import Any, Optional

_cache: dict[str, tuple[float, str]] = {}
_cache_lock = threading.Lock()


def get_json(key: str) -> Optional[Any]:
    now = time.time()
    with _cache_lock:
        item = _cache.get(key)
    if item is None:
        return None
    expires_at, payload = item
    if now >= expires_at:
        with _cache_lock:
            _cache.pop(key, None)
        return None
    try:
        return json.loads(payload)
    except (json.JSONDecodeError, TypeError):
        return None


def set_json(key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
    expires_at = time.time() + max(1, (ttl_seconds or 300))
    payload = json.dumps(value, separators=(",", ":"), default=str)
    with _cache_lock:
        _cache[key] = (expires_at, payload)
    return True


def delete(key: str) -> int:
    with _cache_lock:
        if key in _cache:
            del _cache[key]
            return 1
    return 0


def delete_pattern(pattern: str) -> int:
    count = 0
    with _cache_lock:
        keys = list(_cache.keys())
        for key in keys:
            if pattern in key or key.startswith(pattern):
                del _cache[key]
                count += 1
    return count
