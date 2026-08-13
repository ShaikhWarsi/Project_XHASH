from __future__ import annotations

import logging
import time
from typing import Any, Callable, Optional, TypeVar

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


def with_retry(
    fn: Callable[..., Any],
    max_retries: int = 3,
    base_delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,),
) -> Callable[..., Any]:
    """Decorator that retries a callable with exponential backoff."""
    import functools

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        last_exc = None
        delay = base_delay
        for attempt in range(max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except exceptions as e:
                last_exc = e
                if attempt < max_retries:
                    logger.debug(
                        "Retry %d/%d for %s after %.1fs: %s",
                        attempt + 1, max_retries, fn.__name__, delay, e,
                    )
                    time.sleep(delay)
                    delay *= backoff
        raise last_exc  # type: ignore
    return wrapper


async def with_async_retry(
    fn: Callable[..., Any],
    max_retries: int = 3,
    base_delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,),
) -> Any:
    """Retry an async callable with exponential backoff."""
    import asyncio

    last_exc = None
    delay = base_delay
    for attempt in range(max_retries + 1):
        try:
            return await fn()
        except exceptions as e:
            last_exc = e
            if attempt < max_retries:
                logger.debug(
                    "Async retry %d/%d after %.1fs: %s",
                    attempt + 1, max_retries, delay, e,
                )
                await asyncio.sleep(delay)
                delay *= backoff
    raise last_exc  # type: ignore
