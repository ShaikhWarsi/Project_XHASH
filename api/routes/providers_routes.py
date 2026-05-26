from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("/")
async def list_providers():
    from data.registry import registry
    providers = []
    for name, info in registry._providers.items():
        providers.append({
            "name": info.name,
            "description": info.description,
            "credentials": info.credentials,
            "models": list(info.fetcher_dict.keys()),
        })
    return {"providers": providers}


@router.get("/models")
async def list_models():
    from data.registry import registry
    return {"models": registry.available_models()}


@router.get("/defaults")
async def list_defaults():
    from data.registry import registry
    return {"defaults": registry._default_provider}


@router.get("/query")
async def query_provider(
    model: str,
    provider: str | None = None,
    symbol: str | None = None,
    interval: str = "1d",
    range: str = "1mo",
):
    from data.registry import registry
    params = {"symbol": symbol, "interval": interval, "range": range}
    try:
        result = await registry.query(model, params, provider=provider)
        return {"model": model, "provider": provider or "default", "result": result}
    except ValueError as e:
        return {"error": str(e), "available": registry.available_providers(model)}
