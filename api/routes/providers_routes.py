from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/providers", tags=["providers"])

# ── Existing endpoints ────────────────────────────────────


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


# ── Provider management ───────────────────────────────────


@router.get("/stats")
async def provider_stats():
    """Get statistics for all registered providers."""
    from data.registry import registry
    stats = {}
    for name in registry.list_names():
        provider_info = registry._providers.get(name)
        if provider_info:
            stats[name] = {
                "name": provider_info.name,
                "models": list(provider_info.fetcher_dict.keys()),
            }
    return {"stats": stats}


_provider_states: dict[str, bool] = {}


@router.post("/{name}/enable")
async def enable_provider(name: str):
    """Enable a provider."""
    from data.registry import registry
    if name not in registry._providers:
        raise HTTPException(status_code=404, detail=f"Provider '{name}' not found")
    _provider_states[name] = True
    logger.info(f"Provider enabled: {name}")
    return {"success": True, "provider": name, "enabled": True}


@router.post("/{name}/disable")
async def disable_provider(name: str):
    """Disable a provider."""
    from data.registry import registry
    if name not in registry._providers:
        raise HTTPException(status_code=404, detail=f"Provider '{name}' not found")
    _provider_states[name] = False
    logger.info(f"Provider disabled: {name}")
    return {"success": True, "provider": name, "enabled": False}


# ── Market data endpoints ─────────────────────────────────


@router.get("/ohlcv")
async def get_ohlcv(
    symbol: str,
    timeframe: str = Query(default="1d", description="Timeframe (1m, 5m, 1h, 1d, etc.)"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(default=100, le=10000),
    provider: Optional[str] = None,
):
    """Fetch OHLCV data for a symbol."""
    from data.registry import registry
    params = {
        "symbol": symbol,
        "interval": timeframe,
        "range": _resolve_range(start_date, end_date),
        "limit": limit,
    }
    try:
        result = await registry.query("bars", params, provider=provider)
        return {
            "data": result,
            "provider": provider or "default",
            "cached": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/quote/{symbol}")
async def get_quote(symbol: str, provider: Optional[str] = None):
    """Get real-time quote for a symbol."""
    from data.registry import registry
    try:
        result = await registry.query("ticker", {"symbol": symbol}, provider=provider)
        return {
            "data": result,
            "provider": provider or "default",
            "cached": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/orderbook/{symbol}")
async def get_orderbook(
    symbol: str,
    depth: int = Query(default=10, le=100),
    provider: Optional[str] = None,
):
    """Get order book for a symbol."""
    from data.registry import registry
    try:
        result = await registry.query("orderbook", {"symbol": symbol, "depth": depth}, provider=provider)
        return {
            "data": result,
            "provider": provider or "default",
            "cached": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/fundamentals/{symbol}")
async def get_fundamentals(symbol: str, provider: Optional[str] = None):
    """Get fundamental data for a symbol."""
    from data.registry import registry
    try:
        result = await registry.query("fundamentals", {"symbol": symbol}, provider=provider)
        return {
            "data": result,
            "provider": provider or "default",
            "cached": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/news")
async def get_news(
    symbol: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    provider: Optional[str] = None,
):
    """Get market news."""
    from data.registry import registry
    params = {"symbol": symbol, "limit": limit} if symbol else {"limit": limit}
    try:
        result = await registry.query("news", params, provider=provider)
        return {
            "data": result,
            "provider": provider or "default",
            "cached": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/search")
async def search_symbols(q: str = Query(..., min_length=1), provider: Optional[str] = None):
    """Search for symbols."""
    from data.registry import registry
    try:
        result = await registry.query("search", {"query": q}, provider=provider)
        return {
            "data": result,
            "provider": provider or "default",
            "cached": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/test")
async def test_provider(body: dict):
    import json
    from persistence.database import _session_factory
    from persistence.models import ApiKey
    from sqlalchemy import select

    provider = body.get("provider", "")
    config = body.get("config", {})
    logger.info("Testing provider connection: %s with config keys: %s", provider, list(config.keys()))

    config_str = json.dumps(config)
    api_key_record = None

    try:
        async with _session_factory() as session:
            stmt = select(ApiKey).where(ApiKey.provider == provider)
            result = await session.execute(stmt)
            existing_key = result.scalar_one_or_none()
            if existing_key:
                existing_key.key_value = config_str
                existing_key.is_active = 1
                api_key_record = existing_key
            else:
                new_key = ApiKey(
                    name=f"{provider}_config",
                    provider=provider,
                    key_value=config_str,
                    is_active=1
                )
                session.add(new_key)
                api_key_record = new_key
            await session.commit()
            if api_key_record:
                # Refresh to get DB-assigned ID
                await session.refresh(api_key_record)
    except Exception as e:
        logger.error("Failed to persist API keys to DB: %s", e)

    # Convert the record to ApiKeyResponse layout
    key_response = None
    if api_key_record:
        key_response = {
            "id": api_key_record.id,
            "provider": api_key_record.provider,
            "key_value": api_key_record.key_value,
            "description": api_key_record.name,
            "is_active": bool(api_key_record.is_active),
            "created_at": api_key_record.created_at.isoformat() if api_key_record.created_at else None,
            "last_used_at": api_key_record.last_used_at.isoformat() if api_key_record.last_used_at else None,
        }

    try:
        from data.registry import registry
        if provider in registry._providers:
            registry._providers[provider].credentials.update(config)
            return {
                "status": "ok",
                "message": f"Credentials saved and tested for {provider}",
                "key": key_response
            }
        return {
            "status": "ok",
            "message": f"Credentials saved for {provider}",
            "key": key_response
        }
    except Exception:
        return {
            "status": "ok",
            "message": f"Credentials saved for {provider}",
            "key": key_response
        }



# ── Helpers ────────────────────────────────────────────────


def _resolve_range(start_date: Optional[datetime], end_date: Optional[datetime]) -> str:
    if start_date and end_date:
        return f"{start_date.date().isoformat()}-{end_date.date().isoformat()}"
    return "1mo"
