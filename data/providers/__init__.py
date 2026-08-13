from __future__ import annotations

import enum
import logging
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)


class DataProviderName(str, enum.Enum):
    YFINANCE = "yfinance"
    ALPHA_VANTAGE = "alpha_vantage"
    FINNHUB = "finnhub"


class ProviderCache:
    def __init__(self, default_ttl: float = 60.0):
        self._cache: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl

    def get(self, key: str) -> Any | None:
        with self._lock:
            if key not in self._cache:
                return None
            expires, value = self._cache[key]
            if time.time() >= expires:
                del self._cache[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: float | None = None) -> None:
        with self._lock:
            self._cache[key] = (time.time() + (ttl or self._default_ttl), value)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


class ProviderRegistry:
    def __init__(self):
        self._providers: dict[str, Any] = {}
        self._enabled: dict[str, bool] = {}

    def register(self, provider: Any, enabled: bool = True) -> None:
        name = getattr(provider, "name", provider.__class__.__name__.lower())
        self._providers[name] = provider
        self._enabled[name] = enabled
        logger.info("Registered provider: %s (enabled=%s)", name, enabled)

    def get(self, name: str | DataProviderName) -> Any | None:
        return self._providers.get(name.value if isinstance(name, DataProviderName) else name)

    def list_names(self) -> list[str]:
        return list(self._providers.keys())

    def is_enabled(self, name: str) -> bool:
        return self._enabled.get(name, False)

    def get_stats(self) -> dict:
        return {}


global_provider_registry = ProviderRegistry()
global_query_executor = type("QueryExecutor", (), {"execute": lambda **kw: {}})()
