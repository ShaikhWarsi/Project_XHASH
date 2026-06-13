from __future__ import annotations

import os
import logging

logger = logging.getLogger(__name__)


def get_cors_config() -> dict:
    raw_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    cors_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    allow_all = "*" in cors_origins

    raw_methods = os.environ.get("CORS_METHODS", "GET,POST,PUT,DELETE,OPTIONS")
    cors_methods = [m.strip() for m in raw_methods.split(",") if m.strip()]

    raw_headers = os.environ.get("CORS_HEADERS", "Authorization,Content-Type,X-API-Key")
    cors_headers = [h.strip() for h in raw_headers.split(",") if h.strip()]

    raw_credentials = os.environ.get("CORS_CREDENTIALS", "true")
    cors_credentials = raw_credentials.lower() in ("1", "true", "yes")

    config = {
        "allow_origins": ["*"] if allow_all else cors_origins,
        "allow_credentials": not allow_all and cors_credentials,
        "allow_methods": cors_methods,
        "allow_headers": cors_headers,
    }

    if allow_all:
        logger.info("CORS: allowing all origins (credentials disabled)")

    return config
