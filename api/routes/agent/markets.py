from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException, Query

logger = logging.getLogger(__name__)

from api.auth.agent_scopes import SCOPE_R
from api.auth.agent_auth import agent_required, AgentTokenData, market_allowed, instrument_allowed
from api.routes.agent import agent_v1
from data.registry import ProviderRegistry
from core.enums import Timeframe


_MARKET_MAP = {
    "crypto": ["ccxt", "crypto_multi"],
    "stocks": ["yfinance"],
    "forex": ["yfinance"],
    "futures": ["yfinance"],
    "indices": ["yfinance"],
}


@agent_v1.get("/markets")
async def list_markets(token: AgentTokenData = Depends(agent_required)):
    allowed = [m for m in _MARKET_MAP if market_allowed(token, m)]
    return {
        "markets": allowed,
        "total": len(allowed),
    }


@agent_v1.get("/markets/{market}/symbols")
async def search_symbols(
    market: str,
    keyword: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    token: AgentTokenData = Depends(agent_required),
):
    if not market_allowed(token, market):
        raise HTTPException(status_code=403, detail="Market not allowed for this token")

    providers = _MARKET_MAP.get(market, [])
    symbols = []
    seen = set()
    for provider_name in providers:
        try:
            provider = ProviderRegistry.get(provider_name)
            if provider and hasattr(provider, "search_symbols"):
                results = provider.search_symbols(keyword=keyword or "", limit=limit)
                for s in results:
                    sym = s.get("symbol", "")
                    if sym not in seen:
                        seen.add(sym)
                        symbols.append(s)
        except Exception as e:
            logger.debug("Provider search_symbols failed: %s", e)

    return {"market": market, "symbols": symbols[:limit], "total": len(symbols[:limit])}


@agent_v1.get("/klines")
async def get_klines(
    market: str = Query(...),
    symbol: str = Query(...),
    timeframe: str = Query("1d"),
    limit: int = Query(100, le=1000),
    before_time: Optional[int] = Query(None),
    token: AgentTokenData = Depends(agent_required),
):
    if not market_allowed(token, market):
        raise HTTPException(status_code=403, detail="Market not allowed")
    if not instrument_allowed(token, symbol):
        raise HTTPException(status_code=403, detail="Symbol not allowed")

    try:
        tf = Timeframe(timeframe)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid timeframe: {timeframe}")

    providers = _MARKET_MAP.get(market, [])
    for provider_name in providers:
        try:
            provider = ProviderRegistry.get(provider_name)
            if provider:
                bars = provider.fetch_bars(
                    symbol=symbol,
                    timeframe=tf,
                    start=datetime(2020, 1, 1),
                    end=datetime.utcnow(),
                )
                if bars is not None and not bars.empty:
                    data = bars.tail(limit).to_dict(orient="records")
                    return {"market": market, "symbol": symbol, "timeframe": timeframe, "klines": data, "total": len(data)}
        except Exception as e:
            logger.debug("Provider fetch_bars failed for %s: %s", provider_name, e)
            continue

    raise HTTPException(status_code=404, detail="No data available")


@agent_v1.get("/price")
async def get_price(
    market: str = Query(...),
    symbol: str = Query(...),
    token: AgentTokenData = Depends(agent_required),
):
    if not market_allowed(token, market):
        raise HTTPException(status_code=403, detail="Market not allowed")
    if not instrument_allowed(token, symbol):
        raise HTTPException(status_code=403, detail="Symbol not allowed")

    providers = _MARKET_MAP.get(market, [])
    for provider_name in providers:
        try:
            provider = ProviderRegistry.get(provider_name)
            if provider:
                ticker = provider.fetch_ticker(symbol=symbol)
                if ticker:
                    return {"market": market, "symbol": symbol, "price": ticker}
        except Exception as e:
            logger.debug("Provider fetch_ticker failed for %s: %s", provider_name, e)
            continue

    raise HTTPException(status_code=404, detail="No price data available")
