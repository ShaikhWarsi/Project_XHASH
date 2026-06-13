from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime

import pytz

from api.utils.httpx_client import get_async_client

logger = logging.getLogger(__name__)

_IST = pytz.timezone("Asia/Kolkata")

_ENABLED = os.getenv("BROKER_CONNECTION_KEEPALIVE", "TRUE").strip().upper() in (
    "TRUE",
    "1",
    "YES",
)
_PING_INTERVAL = max(5, int(os.getenv("BROKER_KEEPALIVE_INTERVAL", "20")))
_WINDOW = os.getenv("BROKER_KEEPALIVE_WINDOW", "09:00-23:30")

_active_broker_url: str | None = None


def set_active_broker_url(url: str | None) -> None:
    global _active_broker_url
    _active_broker_url = url


def get_active_broker_url() -> str | None:
    return _active_broker_url


def _parse_window(spec: str) -> tuple[int, int]:
    try:
        start_s, end_s = spec.split("-")
        sh, sm = (int(x) for x in start_s.strip().split(":"))
        eh, em = (int(x) for x in end_s.strip().split(":"))
        return sh * 60 + sm, eh * 60 + em
    except (ValueError, AttributeError):
        logger.warning("Invalid BROKER_KEEPALIVE_WINDOW '%s', using 09:00-23:30", spec)
        return 9 * 60, 23 * 60 + 30


_WINDOW_START, _WINDOW_END = _parse_window(_WINDOW)


def _in_market_window() -> bool:
    now = datetime.now(_IST)
    if now.weekday() >= 5:
        return False
    minutes = now.hour * 60 + now.minute
    return _WINDOW_START <= minutes <= _WINDOW_END


async def _keepalive_loop(app_state):
    base_url: str | None = None
    fast_retry_until = 0.0

    while True:
        sleep_seconds = _PING_INTERVAL
        try:
            base_url = get_active_broker_url()

            if base_url is None:
                if fast_retry_until == 0.0:
                    fast_retry_until = asyncio.get_event_loop().time() + 60
                now = asyncio.get_event_loop().time()
                sleep_seconds = 2 if now < fast_retry_until else _PING_INTERVAL
            elif not _in_market_window():
                sleep_seconds = 60
            else:
                client = get_async_client()
                response = await client.head(base_url, timeout=5)
                logger.debug("Keep-warm ping %s -> %s", base_url, response.status_code)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.debug("Keep-warm ping failed: %s", e)

        try:
            await asyncio.sleep(sleep_seconds)
        except asyncio.CancelledError:
            raise


async def start_broker_keepalive(app_state) -> None:
    if not _ENABLED:
        logger.info("Broker connection keep-warm disabled via BROKER_CONNECTION_KEEPALIVE")
        return

    existing = getattr(app_state, "_broker_keepalive_task", None)
    if existing is not None and not existing.done():
        logger.debug("Broker keep-warm task already running")
        return

    task = asyncio.create_task(_keepalive_loop(app_state), name="broker-keepalive")
    app_state._broker_keepalive_task = task
    logger.info(
        "Broker connection keep-warm started: every %ds, window %s IST Mon-Fri",
        _PING_INTERVAL,
        _WINDOW,
    )


async def stop_broker_keepalive(app_state) -> None:
    task: asyncio.Task | None = getattr(app_state, "_broker_keepalive_task", None)
    if task is None or task.done():
        return
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    logger.info("Broker connection keep-warm stopped")
