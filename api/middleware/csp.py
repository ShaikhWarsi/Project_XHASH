from __future__ import annotations

import os
import logging
from typing import Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)

_SKIP_PATHS = frozenset({"/docs", "/openapi.json", "/redoc"})


def _env_csp_directive(name: str, default_parts: list[str]) -> list[str]:
    raw = os.getenv(name)
    if raw is None:
        return default_parts
    return [p.strip() for p in raw.split(",") if p.strip()]


def get_csp_config() -> dict[str, list[str]]:
    return {
        "default-src": _env_csp_directive("CSP_DEFAULT_SRC", ["'self'"]),
        "script-src": _env_csp_directive("CSP_SCRIPT_SRC", ["'self'", "'unsafe-inline'"]),
        "style-src": _env_csp_directive("CSP_STYLE_SRC", ["'self'", "'unsafe-inline'"]),
        "img-src": _env_csp_directive("CSP_IMG_SRC", ["'self'", "data:", "blob:"]),
        "connect-src": _env_csp_directive("CSP_CONNECT_SRC", ["'self'", "ws:", "wss:", "https://api.telegram.org", "https://api.twitter.com"]),
        "font-src": _env_csp_directive("CSP_FONT_SRC", ["'self'", "data:"]),
        "frame-ancestors": _env_csp_directive("CSP_FRAME_ANCESTORS", ["'none'"]),
        "form-action": _env_csp_directive("CSP_FORM_ACTION", ["'self'"]),
        "base-uri": _env_csp_directive("CSP_BASE_URI", ["'self'"]),
    }


def build_csp_header(config: dict[str, list[str]]) -> str:
    return "; ".join(f"{key} {' '.join(values)}" for key, values in config.items())


def get_security_headers() -> dict[str, str]:
    is_https = os.getenv("ENV", "development").lower() == "production" or os.getenv("HTTPS", "").lower() in ("1", "true", "yes")
    is_playground = os.getenv("PLAYGROUND", "").lower() in ("1", "true", "yes")

    headers: dict[str, str] = {
        "X-Frame-Options": "SAMEORIGIN" if is_playground else "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    }

    if is_https:
        headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"

    return headers


class CSPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Any) -> Response:
        response = await call_next(request)
        if request.url.path in _SKIP_PATHS:
            return response
        csp_config = get_csp_config()
        response.headers["Content-Security-Policy"] = build_csp_header(csp_config)
        for key, value in get_security_headers().items():
            response.headers[key] = value
        return response
