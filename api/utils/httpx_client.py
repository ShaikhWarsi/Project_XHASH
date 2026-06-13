from __future__ import annotations

import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_async_client: httpx.AsyncClient | None = None
_sync_client: httpx.Client | None = None


def _http2_available() -> bool:
    try:
        import h2  # noqa: F401

        return True
    except ImportError:
        return False


def _create_async_client() -> httpx.AsyncClient:
    http2 = _http2_available()
    limits = httpx.Limits(
        max_keepalive_connections=int(os.environ.get("HTTPX_MAX_KEEPALIVE", "40")),
        max_connections=int(os.environ.get("HTTPX_MAX_CONNECTIONS", "100")),
        keepalive_expiry=float(os.environ.get("HTTPX_KEEPALIVE_EXPIRY", "30.0")),
    )

    async def log_request(request):
        request.extensions["start_time"] = time.time()

    async def log_response(response):
        start = response.request.extensions.get("start_time")
        if start:
            elapsed = (time.time() - start) * 1000
            logger.debug("%s %s completed in %.0fms", response.request.method, response.request.url, elapsed)

    client = httpx.AsyncClient(
        http2=http2,
        http1=True,
        timeout=float(os.environ.get("HTTPX_TIMEOUT", "120.0")),
        limits=limits,
        verify=True,
        event_hooks={"request": [log_request], "response": [log_response]},
    )
    logger.info("Created async HTTP client (http2=%s)", http2)
    return client


def _create_sync_client() -> httpx.Client:
    http2 = _http2_available()
    limits = httpx.Limits(
        max_keepalive_connections=int(os.environ.get("HTTPX_MAX_KEEPALIVE", "40")),
        max_connections=int(os.environ.get("HTTPX_MAX_CONNECTIONS", "100")),
        keepalive_expiry=float(os.environ.get("HTTPX_KEEPALIVE_EXPIRY", "30.0")),
    )
    client = httpx.Client(
        http2=http2,
        http1=True,
        timeout=float(os.environ.get("HTTPX_TIMEOUT", "120.0")),
        limits=limits,
        verify=True,
    )
    logger.info("Created sync HTTP client (http2=%s)", http2)
    return client


def get_async_client() -> httpx.AsyncClient:
    global _async_client
    if _async_client is None:
        _async_client = _create_async_client()
    return _async_client


def get_sync_client() -> httpx.Client:
    global _sync_client
    if _sync_client is None:
        _sync_client = _create_sync_client()
    return _sync_client


async def async_request(method: str, url: str, **kwargs) -> httpx.Response:
    client = get_async_client()
    return await client.request(method, url, **kwargs)


async def async_get(url: str, **kwargs) -> httpx.Response:
    return await async_request("GET", url, **kwargs)


async def async_post(url: str, **kwargs) -> httpx.Response:
    return await async_request("POST", url, **kwargs)


async def async_put(url: str, **kwargs) -> httpx.Response:
    return await async_request("PUT", url, **kwargs)


async def async_delete(url: str, **kwargs) -> httpx.Response:
    return await async_request("DELETE", url, **kwargs)


def sync_request(method: str, url: str, **kwargs) -> httpx.Response:
    return get_sync_client().request(method, url, **kwargs)


def sync_get(url: str, **kwargs) -> httpx.Response:
    return sync_request("GET", url, **kwargs)


def sync_post(url: str, **kwargs) -> httpx.Response:
    return sync_request("POST", url, **kwargs)


def sync_put(url: str, **kwargs) -> httpx.Response:
    return sync_request("PUT", url, **kwargs)


def sync_delete(url: str, **kwargs) -> httpx.Response:
    return sync_request("DELETE", url, **kwargs)


async def cleanup():
    global _async_client, _sync_client
    if _async_client:
        await _async_client.aclose()
        _async_client = None
    if _sync_client:
        _sync_client.close()
        _sync_client = None
    logger.info("HTTP clients cleaned up")
