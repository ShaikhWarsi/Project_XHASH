from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from data.providers import (
    global_provider_registry,
    global_query_executor,
    DataProviderName,
    ProviderCache,
)
from data.providers.yfinance_provider import YFinanceProvider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/providers/v2", tags=["providers-v2"])

cache = ProviderCache()


class OHLCVRequest(BaseModel):
    symbol: str
    timeframe: str = "1d"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = 100


class QuoteRequest(BaseModel):
    symbol: str


class FundamentalsRequest(BaseModel):
    symbol: str


class NewsRequest(BaseModel):
    symbol: Optional[str] = None
    limit: int = 50


@router.on_event("startup")
async def startup():
    yfinance = YFinanceProvider()
    global_provider_registry.register(yfinance, enabled=True)
    logger.info("Registered YFinance provider")


@router.get("/")
async def list_providers():
    providers = []
    for name in global_provider_registry.list_names():
        provider = global_provider_registry.get(name)
        if provider:
            providers.append({
                "name": name.value,
                "enabled": global_provider_registry.is_enabled(name),
                "capabilities": provider.capabilities.__dict__,
            })
    return {"providers": providers}


@router.get("/stats")
async def provider_stats():
    stats = {}
    for name, ps in global_provider_registry.get_stats().items():
        stats[name.value] = {
            "requests": ps.requests,
            "successes": ps.successes,
            "failures": ps.failures,
            "avg_latency_ms": ps.avg_latency_ms,
        }
    return {"stats": stats}


@router.post("/ohlcv")
async def get_ohlcv(request: OHLCVRequest):
    try:
        start = datetime.fromisoformat(request.start_date) if request.start_date else None
        end = datetime.fromisoformat(request.end_date) if request.end_date else None

        result = await global_query_executor.execute(
            symbol=request.symbol.upper(),
            timeframe=request.timeframe,
            start=start,
            end=end,
            limit=request.limit,
        )

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching OHLCV: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quote")
async def get_quote(request: QuoteRequest):
    try:
        provider = global_provider_registry.get(DataProviderName.YFINANCE)

        if not provider:
            raise HTTPException(status_code=500, detail="YFinance provider not available")

        if not provider.is_connected():
            await provider.connect()

        result = await provider.fetch_quote(request.symbol.upper())

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fundamentals")
async def get_fundamentals(request: FundamentalsRequest):
    try:
        provider = global_provider_registry.get(DataProviderName.YFINANCE)

        if not provider:
            raise HTTPException(status_code=500, detail="YFinance provider not available")

        if not provider.is_connected():
            await provider.connect()

        result = await provider.fetch_fundamentals(request.symbol.upper())

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching fundamentals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/news")
async def get_news(request: NewsRequest):
    try:
        provider = global_provider_registry.get(DataProviderName.YFINANCE)

        if not provider:
            raise HTTPException(status_code=500, detail="YFinance provider not available")

        if not provider.is_connected():
            await provider.connect()

        result = await provider.fetch_news(request.symbol, request.limit)

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_symbols(q: str = Query(..., min_length=1)):
    try:
        provider = global_provider_registry.get(DataProviderName.YFINANCE)

        if not provider:
            raise HTTPException(status_code=500, detail="YFinance provider not available")

        if not provider.is_connected():
            await provider.connect()

        result = await provider.search_symbols(q)

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching symbols: {e}")
        raise HTTPException(status_code=500, detail=str(e))
