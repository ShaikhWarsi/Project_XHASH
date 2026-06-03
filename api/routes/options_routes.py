from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/options", tags=["options"])

_chain_cache: dict[str, tuple[list, float]] = {}
_CHAIN_TTL = 300.0


@router.get("/chain/{symbol}")
async def get_options_chain(symbol: str):
    now = datetime.now(timezone.utc).timestamp()
    key = symbol.upper()

    if key in _chain_cache:
        data, ts = _chain_cache[key]
        if now - ts < _CHAIN_TTL:
            return {"symbol": key, "calls": data[0], "puts": data[1], "cached": True}

    try:
        ticker = yf.Ticker(key)
        expirations = await asyncio.to_thread(lambda: ticker.options)
        if not expirations:
            raise HTTPException(404, f"No options chain for {key}")
        nearest = expirations[0]
        opt = await asyncio.to_thread(lambda: ticker.option_chain(nearest))
        if opt is None:
            raise HTTPException(404, f"No options data for {key}")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Failed to fetch options chain for %s: %s", key, e)
        if key in _chain_cache:
            data, ts = _chain_cache[key]
            return {"symbol": key, "calls": data[0], "puts": data[1], "cached": True, "stale": True}
        raise HTTPException(502, f"Options data unavailable for {key}")

    calls_raw = opt.calls.to_dict("records") if hasattr(opt.calls, "to_dict") else []
    puts_raw = opt.puts.to_dict("records") if hasattr(opt.puts, "to_dict") else []

    def serialize(rows):
        return [
            {
                "strike": r.get("strike", 0),
                "lastPrice": r.get("lastPrice", 0),
                "bid": r.get("bid", 0),
                "ask": r.get("ask", 0),
                "change": r.get("change", 0),
                "percentChange": r.get("percentChange", 0),
                "volume": r.get("volume", 0) or 0,
                "openInterest": r.get("openInterest", 0) or 0,
                "impliedVolatility": round(r["impliedVolatility"], 4) if r.get("impliedVolatility") else None,
                "inTheMoney": r.get("inTheMoney", False),
                "expiration": nearest,
            }
            for r in rows
        ]

    calls = serialize(calls_raw)
    puts = serialize(puts_raw)

    _chain_cache[key] = ([calls, puts, nearest], now)

    return {
        "symbol": key,
        "expiration": nearest,
        "expirations": expirations[:10],
        "calls": calls,
        "puts": puts,
        "cached": False,
    }
