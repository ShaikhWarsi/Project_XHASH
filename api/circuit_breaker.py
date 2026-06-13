from __future__ import annotations
import asyncio
import logging
import time
from typing import Any, Callable, Optional, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

CircuitState = str
CLOSED: CircuitState = "closed"
OPEN: CircuitState = "open"
HALF_OPEN: CircuitState = "half-open"


class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 1,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self._state: CircuitState = CLOSED
        self._failure_count = 0
        self._last_failure_time = 0.0
        self._half_open_calls = 0
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        return self._state

    async def call(self, fn: Callable[..., T], *args: Any, fallback: Optional[Callable[..., T]] = None, **kwargs: Any) -> T:
        async with self._lock:
            if self._state == OPEN:
                if time.time() - self._last_failure_time >= self.recovery_timeout:
                    self._state = HALF_OPEN
                    self._half_open_calls = 0
                    logger.info("Circuit %s: transitioning OPEN -> HALF_OPEN", self.name)
                else:
                    if fallback:
                        return await _maybe_async(fallback, *args, **kwargs)
                    raise CircuitBreakerOpenError(f"Circuit {self.name} is OPEN")

            if self._state == HALF_OPEN:
                if self._half_open_calls >= self.half_open_max_calls:
                    if fallback:
                        return await _maybe_async(fallback, *args, **kwargs)
                    raise CircuitBreakerOpenError(f"Circuit {self.name} is HALF_OPEN (max probe calls reached)")

        try:
            result = await _maybe_async(fn, *args, **kwargs)
        except Exception as e:
            async with self._lock:
                self._failure_count += 1
                self._last_failure_time = time.time()
                if self._failure_count >= self.failure_threshold:
                    self._state = OPEN
                    logger.warning("Circuit %s: CLOSED -> OPEN (failures=%d)", self.name, self._failure_count)
                if self._state == HALF_OPEN:
                    self._state = OPEN
                    logger.warning("Circuit %s: HALF_OPEN -> OPEN (probe failed)", self.name)
            if fallback:
                return await _maybe_async(fallback, *args, **kwargs)
            raise

        async with self._lock:
            if self._state == HALF_OPEN:
                self._state = CLOSED
                self._failure_count = 0
                logger.info("Circuit %s: HALF_OPEN -> CLOSED (probe succeeded)", self.name)
                self._half_open_calls = 0
            else:
                self._failure_count = 0

        return result

    def reset(self):
        self._state = CLOSED
        self._failure_count = 0
        self._half_open_calls = 0


class CircuitBreakerOpenError(Exception):
    pass


async def _maybe_async(fn: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    result = fn(*args, **kwargs)
    if hasattr(result, "__await__"):
        return await result
    return result


async def retry(
    fn: Callable[..., T],
    *args: Any,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    retryable_exceptions: tuple = (OSError, ConnectionError, TimeoutError),
    **kwargs: Any,
) -> T:
    last_exc = None
    for attempt in range(max_retries + 1):
        try:
            return await _maybe_async(fn, *args, **kwargs)
        except retryable_exceptions as e:
            last_exc = e
            if attempt < max_retries:
                delay = min(base_delay * (2 ** attempt), max_delay)
                logger.debug("Retry %s/%s after %.1fs: %s", attempt + 1, max_retries, delay, e)
                await asyncio.sleep(delay)
            else:
                logger.warning("All %s retries exhausted: %s", max_retries, e)
    raise last_exc  # type: ignore


# ── Named circuit breakers ──
yfinance_cb = CircuitBreaker(name="yfinance", failure_threshold=3, recovery_timeout=60.0)
finnhub_cb = CircuitBreaker(name="finnhub", failure_threshold=5, recovery_timeout=30.0)
