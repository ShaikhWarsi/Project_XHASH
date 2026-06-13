from __future__ import annotations

import logging
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from api.services.security_service import security_service

logger = logging.getLogger(__name__)

HEALTH_CHECK_PATHS = {"/health", "/healthz", "/api/health", "/openalgo/health"}


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return "unknown"


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = _get_client_ip(request)

        if client_ip in ("127.0.0.1", "::1", "localhost", "unknown"):
            return await call_next(request)

        if request.url.path in HEALTH_CHECK_PATHS:
            return await call_next(request)

        if security_service.is_ip_banned(client_ip):
            ban = None
            for b in security_service.get_all_bans():
                if b.get("ip_address") == client_ip:
                    ban = b
                    break
            reason = ban.get("reason", "No reason provided") if ban else "No reason provided"
            return JSONResponse(
                status_code=403,
                content={"detail": "IP banned", "reason": reason},
            )

        response = await call_next(request)

        if response.status_code == 404:
            security_service.track_404(client_ip)

        return response
