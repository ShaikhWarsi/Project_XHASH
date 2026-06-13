from __future__ import annotations

import asyncio
import time
import logging
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from persistence.models_traffic import TrafficLog
from persistence.multi_db import multi_db

logger = logging.getLogger(__name__)

EXCLUDED_PATHS = {"/health", "/healthz", "/api/health", "/metrics", "/"}

_log_buffer: list[dict] = []
_buffer_lock = asyncio.Lock()
_BATCH_SIZE = 20
_FLUSH_INTERVAL = 5.0
_flush_task: asyncio.Task | None = None


async def _flush_logs():
    global _log_buffer
    while True:
        await asyncio.sleep(_FLUSH_INTERVAL)
        async with _buffer_lock:
            batch = _log_buffer
            _log_buffer = []
        if not batch:
            continue
        try:
            factory = multi_db.get_factory("logs")
            async with factory() as session:
                for entry in batch:
                    session.add(TrafficLog(**entry))
                await session.commit()
        except Exception as e:
            logger.error("Failed to flush traffic logs batch (%d entries): %s", len(batch), e)


class TrafficLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        global _flush_task
        if _flush_task is None:
            _flush_task = asyncio.create_task(_flush_logs(), name="traffic-log-flush")

        path = request.url.path
        if path in EXCLUDED_PATHS or path.startswith(("/docs", "/redoc", "/openapi.json", "/ws")):
            return await call_next(request)

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as e:
            duration = (time.perf_counter() - start) * 1000
            entry = dict(
                client_ip=request.client.host if request.client else "unknown",
                method=request.method,
                path=path,
                status_code=500,
                duration_ms=duration,
                host=request.headers.get("host", ""),
                error=str(e)[:200],
            )
            async with _buffer_lock:
                _log_buffer.append(entry)
                if len(_log_buffer) >= _BATCH_SIZE:
                    asyncio.create_task(_flush_logs())
            raise

        duration = (time.perf_counter() - start) * 1000
        entry = dict(
            client_ip=request.client.host if request.client else "unknown",
            method=request.method,
            path=path,
            status_code=response.status_code,
            duration_ms=round(duration, 2),
            host=request.headers.get("host", ""),
        )
        async with _buffer_lock:
            _log_buffer.append(entry)
            if len(_log_buffer) >= _BATCH_SIZE:
                asyncio.create_task(_flush_logs())

        return response

    async def _log(self, **kwargs):
        async with _buffer_lock:
            _log_buffer.append(kwargs)
            if len(_log_buffer) >= _BATCH_SIZE:
                asyncio.create_task(_flush_logs())
