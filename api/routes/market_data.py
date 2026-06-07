from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime

logger = logging.getLogger(__name__)


from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from persistence import get_session
from persistence.repositories import AlertRepository, WatchlistRepository
from api.circuit_breaker import yfinance_cb, finnhub_cb, retry

class QuoteItem(BaseModel):
    c: float
    d: float
    dp: float
    h: float
    l: float
    o: float
    pc: float


router = APIRouter(prefix="/market", tags=["market-data"])

_finnhub: FinnhubDataSource | None = None
_yfinance: YFinanceDataSource | None = None
_market_lock = asyncio.Lock()
_quotes_cache: dict[str, tuple[dict, float]] = {}
_QUOTES_CACHE_TTL = 10.0


async def _get_finnhub() -> FinnhubDataSource:
    global _finnhub
    async with _market_lock:
        if _finnhub is None:
            from data.providers.finnhub import FinnhubDataSource
            _finnhub = FinnhubDataSource()
        return _finnhub


async def _get_yfinance():
    global _yfinance
    async with _market_lock:
        if _yfinance is None:
            from data.yfinance_provider import YFinanceProvider
            _yfinance = YFinanceProvider()
        return _yfinance


@router.get("/search")
async def search_stocks(q: str = ""):
    if not q.strip():
        from .market_data_constants import POPULAR_SYMBOLS
        return {"results": POPULAR_SYMBOLS}
    try:
        results = (await _get_finnhub()).search_stocks(q)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Search failed: {e}")


@router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    # Try Finnhub first with retry on transient failures
    try:
        finnhub = await _get_finnhub()
        quote = await retry(lambda: finnhub.get_quote(symbol), max_retries=2, retryable_exceptions=(Exception,))
        return quote
    except Exception as e:
        logger.debug("Finnhub quote failed: %s", e)
    # Fallback to yfinance with circuit breaker
    try:
        fin = await _get_yfinance()
        quote = await yfinance_cb.call(lambda: fin.get_quote(symbol), fallback=None)
        if quote is not None:
            return quote
    except Exception as e:
        logger.warning("yfinance quote failed for %s: %s", symbol, e)
    # Graceful degradation: serve stale cache
    now = time.time()
    cached = _quotes_cache.get(symbol.upper())
    if cached:
        logger.info("Serving stale cache for %s (age=%.1fs)", symbol, now - cached[1])
        return cached[0]
    raise HTTPException(status_code=502, detail=f"Quote failed for {symbol}")


@router.get("/quotes")
async def get_quotes(symbols: str = "SPY,QQQ"):
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    import yfinance as yf
    import pandas as pd
    import math
    now = time.time()
    result = {}

    fresh_needed = [s for s in sym_list if s not in _quotes_cache or now - _quotes_cache[s][1] > _QUOTES_CACHE_TTL]
    for sym in sym_list:
        cached = _quotes_cache.get(sym)
        if cached and sym not in fresh_needed:
            result[sym] = cached[0]

    if fresh_needed:
        try:
            async with _market_lock:
                df = await yfinance_cb.call(lambda: asyncio.to_thread(lambda: yf.download(" ".join(fresh_needed), period="1d", group_by="ticker", progress=False)))
            for sym in fresh_needed:
                try:
                    if not df.empty and isinstance(df.columns, pd.MultiIndex) and sym in df.columns.levels[0]:
                        row = df[sym].iloc[-1]
                        price = float(row["Close"])
                        prev = float(row["Open"])
                        high = float(row["High"])
                        low = float(row["Low"])
                        chg = price - prev
                        pct = (chg / prev * 100) if prev else 0.0
                    else:
                        fin = await _get_yfinance()
                        quote = await asyncio.to_thread(lambda f=fin: f.get_quote(sym))
                        price, chg, pct, high, low = quote["c"], quote["d"], quote["dp"], quote["h"], quote["l"]
                    def sf(v):
                        if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
                            return 0.0
                        return float(v)
                    entry = {"c": sf(price), "d": sf(chg), "dp": sf(pct), "h": sf(high), "l": sf(low), "o": sf(price - chg), "pc": sf(price - chg)}
                    _quotes_cache[sym] = (entry, now)
                    result[sym] = entry
                except Exception as e:
                    logger.warning("Failed to fetch price for %s: %s", sym, e)
                    result[sym] = None
        except Exception as e:
            logger.warning("Bulk yfinance fetch failed: %s — falling back to per-symbol", e)
            for sym in fresh_needed:
                try:
                    fin = await _get_yfinance()
                    quote = await yfinance_cb.call(lambda f=fin: f.get_quote(sym))
                    def sf(v):
                        if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
                            return 0.0
                        return float(v)
                    entry = {"c": sf(quote["c"]), "d": sf(quote["d"]), "dp": sf(quote["dp"]), "h": sf(quote["h"]), "l": sf(quote["l"]), "o": sf(quote["o"]), "pc": sf(quote["pc"])}
                    _quotes_cache[sym] = (entry, now)
                    result[sym] = entry
                except Exception as e2:
                    logger.warning("Fallback quote failed for %s: %s", sym, e2)
                    result[sym] = None
    # Graceful degradation: fill missing symbols from stale cache
    for sym in sym_list:
        if sym not in result or result[sym] is None:
            cached = _quotes_cache.get(sym)
            if cached:
                logger.info("Serving stale cache for %s (age=%.1fs)", sym, now - cached[1])
                result[sym] = cached[0]
    if not result or all(v is None for v in result.values()):
        raise HTTPException(status_code=404, detail="No quote data available for requested symbols")
    return result


@router.get("/profile/{symbol}")
async def get_profile(symbol: str):
    try:
        profile = (await _get_finnhub()).get_company_profile(symbol)
        return profile
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Profile failed: {e}")


@router.get("/news/{symbol}")
async def get_news(symbol: str):
    try:
        news = (await _get_finnhub()).get_news(symbol)
        return {"articles": news}
    except Exception as e:
        logger.warning("Finnhub news failed for %s: %s", symbol, e)
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        news = await asyncio.to_thread(lambda t=ticker: t.news)
        if news:
            return {"articles": [{"headline": a.get("title", ""), "datetime": a.get("providerPublishTime"), "source": a.get("publisher", "yfinance"), "url": a.get("link")} for a in news[:10]], "_source": "yfinance"}
    except Exception as e2:
        logger.warning("yfinance news fallback failed for %s: %s", symbol, e2)
    raise HTTPException(status_code=502, detail=f"News provider failed for {symbol}")


@router.get("/news")
async def get_market_news(category: str = "general"):
    try:
        news = (await _get_finnhub()).get_market_news(category)
        return {"articles": news}
    except Exception as e:
        logger.warning("Finnhub market news failed: %s", e)
    raise HTTPException(status_code=502, detail="Market news provider failed")


@router.get("/watchlist")
async def get_watchlist(user_id: str = "default", session: AsyncSession = Depends(get_session)):
    items = await WatchlistRepository.list_items(session, user_id)
    return {
        "watchlist": [
            {"symbol": i.symbol, "company": i.company, "addedAt": i.added_at.isoformat() if hasattr(i.added_at, "isoformat") else str(i.added_at)}
            for i in items
        ]
    }


@router.post("/watchlist")
async def add_to_watchlist(body: WatchlistAddRequest, session: AsyncSession = Depends(get_session)):
    symbol = body.symbol.upper()
    company = body.company or symbol
    item = await WatchlistRepository.add_item(session, body.user_id, symbol, company)
    items = await WatchlistRepository.list_items(session, user_id)
    return {
        "watchlist": [
            {"symbol": i.symbol, "company": i.company, "addedAt": i.added_at.isoformat() if hasattr(i.added_at, "isoformat") else str(i.added_at)}
            for i in items
        ]
    }


@router.delete("/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str, user_id: str = "default", session: AsyncSession = Depends(get_session)):
    await WatchlistRepository.remove_item(session, user_id, symbol.upper())
    items = await WatchlistRepository.list_items(session, user_id)
    return {
        "watchlist": [
            {"symbol": i.symbol, "company": i.company, "addedAt": i.added_at.isoformat() if hasattr(i.added_at, "isoformat") else str(i.added_at)}
            for i in items
        ]
    }


@router.get("/watchlist/check/{symbol}")
async def check_watchlist(symbol: str, user_id: str = "default", session: AsyncSession = Depends(get_session)):
    result = await WatchlistRepository.check_item(session, user_id, symbol.upper())
    return {"in_watchlist": result}


@router.get("/alerts")
async def get_alerts(
    user_id: str = "default",
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    alerts = await AlertRepository.get_alerts(session, user_id)
    total = len(alerts)
    page = alerts[offset:offset + limit]
    return {
        "alerts": [
            {
                "id": a.id,
                "symbol": a.symbol,
                "targetPrice": a.target_price,
                "condition": a.condition,
                "active": bool(a.active),
                "triggered": bool(a.triggered),
                "createdAt": a.created_at.isoformat() if hasattr(a.created_at, "isoformat") else str(a.created_at),
                "expiresAt": a.expires_at.isoformat() if a.expires_at and hasattr(a.expires_at, "isoformat") else str(a.expires_at),
            }
            for a in page
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/alerts")
async def create_alert(body: AlertCreateRequest, session: AsyncSession = Depends(get_session)):
    symbol = body.symbol.upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol required")
    if body.condition not in ("ABOVE", "BELOW"):
        raise HTTPException(status_code=400, detail="condition must be ABOVE or BELOW")

    alert = await AlertRepository.create_alert(session, body.user_id, symbol, body.target_price, body.condition)
    return {
        "alert": {
            "id": alert.id,
            "symbol": alert.symbol,
            "targetPrice": alert.target_price,
            "condition": alert.condition,
            "active": bool(alert.active),
            "triggered": bool(alert.triggered),
            "createdAt": alert.created_at.isoformat() if hasattr(alert.created_at, "isoformat") else str(alert.created_at),
            "expiresAt": alert.expires_at.isoformat() if alert.expires_at and hasattr(alert.expires_at, "isoformat") else str(alert.expires_at),
        }
    }


@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: int, user_id: str = "default", session: AsyncSession = Depends(get_session)):
    success = await AlertRepository.delete_alert(session, alert_id, user_id)
    return {"success": success}
