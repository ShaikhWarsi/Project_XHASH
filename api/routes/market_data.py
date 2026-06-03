from __future__ import annotations

import asyncio
import logging
import threading
from datetime import datetime

logger = logging.getLogger(__name__)


from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from persistence import get_session
from persistence.repositories import AlertRepository, WatchlistRepository

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
_market_lock = threading.Lock()


def _get_finnhub() -> FinnhubDataSource:
    global _finnhub
    with _market_lock:
        if _finnhub is None:
            from data.providers.finnhub import FinnhubDataSource
            _finnhub = FinnhubDataSource()
        return _finnhub


def _get_yfinance():
    global _yfinance
    with _market_lock:
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
        results = _get_finnhub().search_stocks(q)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Search failed: {e}")


@router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    try:
        quote = _get_finnhub().get_quote(symbol)
        return quote
    except Exception as e:
        logger.debug("Finnhub quote failed: %s", e)
    try:
        return _get_yfinance().get_quote(symbol)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Quote failed: {e}")


@router.get("/quotes")
async def get_quotes(symbols: str = "SPY,QQQ"):
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    import yfinance as yf
    import pandas as pd
    import math
    result = {}
    try:
        with _market_lock:
            df = await asyncio.to_thread(lambda: yf.download(" ".join(sym_list), period="1d", group_by="ticker", progress=False))
        for sym in sym_list:
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
                    quote = _get_yfinance().get_quote(sym)
                    price, chg, pct, high, low = quote["c"], quote["d"], quote["dp"], quote["h"], quote["l"]
                def sf(v):
                    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
                        return 0.0
                    return float(v)
                result[sym] = {"c": sf(price), "d": sf(chg), "dp": sf(pct), "h": sf(high), "l": sf(low), "o": sf(price - chg), "pc": sf(price - chg)}
            except Exception as e:
                logger.warning("Failed to fetch price for %s: %s", sym, e)
                result[sym] = None
    except Exception as e:
        for sym in sym_list:
            try:
                quote = _get_yfinance().get_quote(sym)
                def sf(v):
                    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
                        return 0.0
                    return float(v)
                result[sym] = {"c": sf(quote["c"]), "d": sf(quote["d"]), "dp": sf(quote["dp"]), "h": sf(quote["h"]), "l": sf(quote["l"]), "o": sf(quote["o"]), "pc": sf(quote["pc"])}
            except Exception as e2:
                logger.warning("Fallback quote failed for %s: %s", sym, e2)
                result[sym] = None
    if not result or all(v is None for v in result.values()):
        raise HTTPException(status_code=404, detail="No quote data available for requested symbols")
    return result


@router.get("/profile/{symbol}")
async def get_profile(symbol: str):
    try:
        profile = _get_finnhub().get_company_profile(symbol)
        return profile
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Profile failed: {e}")


@router.get("/news/{symbol}")
async def get_news(symbol: str):
    try:
        news = _get_finnhub().get_news(symbol)
        return {"articles": news}
    except Exception as e:
        logger.warning("Finnhub news failed for %s: %s", symbol, e)
        raise HTTPException(status_code=502, detail=f"News provider failed for {symbol}: {e}")


@router.get("/news")
async def get_market_news(category: str = "general"):
    try:
        news = _get_finnhub().get_market_news(category)
        return {"articles": news}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Market news failed: {e}")


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
async def get_alerts(user_id: str = "default", session: AsyncSession = Depends(get_session)):
    alerts = await AlertRepository.get_alerts(session, user_id)
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
            for a in alerts
        ]
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
