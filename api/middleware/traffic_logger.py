from __future__ import annotations

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


class TrafficLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if path in EXCLUDED_PATHS or path.startswith(("/docs", "/redoc", "/openapi.json", "/ws")):
            return await call_next(request)

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as e:
            duration = (time.perf_counter() - start) * 1000
            await self._log(
                client_ip=request.client.host if request.client else "unknown",
                method=request.method,
                path=path,
                status_code=500,
                duration_ms=duration,
                host=request.headers.get("host", ""),
                error=str(e)[:200],
            )
            raise

        duration = (time.perf_counter() - start) * 1000
        status = response.status_code

        factory = multi_db.get_factory("logs")
        async with factory() as session:
            log = TrafficLog(
                client_ip=request.client.host if request.client else "unknown",
                method=request.method,
                path=path,
                status_code=status,
                duration_ms=round(duration, 2),
                host=request.headers.get("host", ""),
            )
            session.add(log)
            await session.commit()

        return response

    async def _log(self, **kwargs):
        try:
            factory = multi_db.get_factory("logs")
            async with factory() as session:
                log = TrafficLog(**kwargs)
                session.add(log)
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to log traffic: {e}")
