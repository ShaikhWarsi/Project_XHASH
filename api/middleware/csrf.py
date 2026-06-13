from __future__ import annotations

import os
import hashlib
import hmac
import secrets
import logging
from typing import Any
from datetime import datetime, timezone, timedelta

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse

logger = logging.getLogger(__name__)

_SKIP_PATHS = frozenset({
    "/docs", "/openapi.json", "/redoc",
    "/health", "/healthz", "/metrics",
})

_EXEMPT_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_FORM_FIELD = "csrf_token"


def _get_secret() -> bytes:
    secret = os.environ.get("CSRF_SECRET", os.environ.get("APP_KEY", ""))
    if not secret:
        secret = secrets.token_hex(32)
    return secret.encode("utf-8")


def _make_token() -> str:
    raw = secrets.token_hex(32)
    sig = hmac.new(_get_secret(), raw.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def _validate_token(token: str) -> bool:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return False
        raw, sig = parts
        expected = hmac.new(_get_secret(), raw.encode("utf-8"), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected)
    except (ValueError, IndexError, AttributeError):
        return False


def _get_csrf_age() -> int:
    return int(os.environ.get("CSRF_TOKEN_AGE", "86400"))


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Any) -> Response:
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        if request.method in _EXEMPT_METHODS:
            response = await call_next(request)
            if request.method == "GET" and not request.cookies.get(CSRF_COOKIE_NAME):
                token = _make_token()
                max_age = _get_csrf_age()
                response.set_cookie(
                    key=CSRF_COOKIE_NAME,
                    value=token,
                    max_age=max_age,
                    secure=os.environ.get("ENV", "development").lower() == "production",
                    httponly=True,
                    samesite="lax",
                )
            return response

        token = request.headers.get(CSRF_HEADER_NAME, "")
        if not token:
            form = await request.form()
            token = form.get(CSRF_FORM_FIELD, "")

        if not token or not _validate_token(token):
            logger.warning(f"CSRF validation failed for {request.method} {request.url.path} from {request.client.host if request.client else 'unknown'}")
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing or invalid"},
            )

        return await call_next(request)
