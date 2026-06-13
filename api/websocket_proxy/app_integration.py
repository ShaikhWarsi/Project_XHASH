from __future__ import annotations

import asyncio
import logging
from typing import Any

from .server import WebSocketProxy

logger = logging.getLogger(__name__)

_proxy: WebSocketProxy | None = None
_proxy_task: asyncio.Task | None = None


async def start_proxy(host: str = "127.0.0.1", port: int = 8765) -> dict[str, Any]:
    global _proxy, _proxy_task
    if _proxy and _proxy.running:
        return {"status": "already_running", "host": host, "port": port}
    _proxy = WebSocketProxy(host=host, port=port)
    _proxy_task = asyncio.create_task(_proxy.start())
    logger.info("WebSocket proxy starting on %s:%d", host, port)
    return {"status": "started", "host": host, "port": port}


async def stop_proxy() -> dict[str, Any]:
    global _proxy, _proxy_task
    if _proxy:
        await _proxy.stop()
    if _proxy_task:
        _proxy_task.cancel()
        try:
            await _proxy_task
        except asyncio.CancelledError:
            pass
    _proxy = None
    _proxy_task = None
    logger.info("WebSocket proxy stopped")
    return {"status": "stopped"}


def get_proxy() -> WebSocketProxy | None:
    return _proxy


async def get_proxy_health() -> dict:
    if _proxy and _proxy.running:
        return {"running": True, **_proxy.get_health()}
    return {"running": False}
