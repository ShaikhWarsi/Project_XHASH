from __future__ import annotations
from typing import Any
from fastapi.responses import JSONResponse


def success_response(data: Any = None, message: str = "ok", status_code: int = 200):
    body: dict[str, Any] = {"status": "ok", "message": message}
    if data is not None:
        body["data"] = data
    return JSONResponse(content=body, status_code=status_code)


def error_response(detail: str, status_code: int = 400):
    return JSONResponse(
        content={"status": "error", "detail": detail},
        status_code=status_code,
    )


def not_found(detail: str = "Resource not found"):
    return error_response(detail, status_code=404)


def bad_request(detail: str = "Bad request"):
    return error_response(detail, status_code=400)


def unauthorized(detail: str = "Unauthorized"):
    return error_response(detail, status_code=401)


def forbidden(detail: str = "Forbidden"):
    return error_response(detail, status_code=403)


def server_error(detail: str = "Internal server error"):
    return error_response(detail, status_code=500)
