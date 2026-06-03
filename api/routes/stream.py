from __future__ import annotations

import asyncio
import json
import logging
import time

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from api.state import app_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["stream"])

_price_cache: dict[str, tuple[float, float]] = {}  # symbol -> (price, timestamp)
_price_cache_ttl = 30.0


async def _refresh_data():
    """Batch-refresh portfolio prices using a single yfinance download call, with caching."""
    try:
        p = await app_state.async_get_portfolio()
        if not p or not p.positions:
            return
        symbols = list(p.positions.keys())
        now = time.time()
        symbols_to_fetch = [s for s in symbols if s not in _price_cache or now - _price_cache[s][1] > _price_cache_ttl]
        if symbols_to_fetch:
            try:
                df = await asyncio.to_thread(
                    lambda: yf.download(" ".join(symbols_to_fetch), period="1d", group_by="ticker", progress=False)
                )
            except Exception:
                logger.warning("yfinance download failed for %s, deferring until cache expiry", symbols_to_fetch)
                for sym in symbols_to_fetch:
                    _price_cache[sym] = (_price_cache.get(sym, (0, 0))[0], now)
                df = pd.DataFrame()
            if not df.empty:
                for sym in symbols_to_fetch:
                    try:
                        if isinstance(df.columns, pd.MultiIndex) and sym in df.columns.levels[0]:
                            price = float(df[sym]["Close"].iloc[-1])
                        elif sym in df.columns:
                            price = float(df[sym].iloc[-1]) if hasattr(df[sym], "iloc") else float(df[sym])
                        else:
                            continue
                        _price_cache[sym] = (price, now)
                    except Exception as e:
                        logger.warning("Failed to refresh price for %s: %s", sym, e)
        for sym, pos in p.positions.items():
            cached = _price_cache.get(sym)
            if cached:
                pos.current_price = cached[0]
                pos.market_value = pos.quantity * cached[0]
                pos.unrealized_pnl = (cached[0] - pos.entry_price) * pos.quantity
    except ImportError:
        logger.warning("yfinance not available — portfolio price refresh disabled")
    except Exception as e:
        logger.warning("Portfolio refresh failed: %s", e)


async def event_generator(request: Request):
    try:
        heartbeat_interval = 60
        ticks = 0
        _max_iter = 1000000
        for _ in range(_max_iter):
            if await request.is_disconnected():
                break

            if ticks % heartbeat_interval == 0:
                await _refresh_data()
                data = await app_state.async_snapshot()
                yield f"data: {json.dumps(data, default=str)}\n\n"
            else:
                yield ": heartbeat\n\n"

            await asyncio.sleep(1)
            ticks += 1
        else:
            logger.warning("event_generator hit max iterations")
    except asyncio.CancelledError:
        pass


@router.get("/live")
async def stream_live(request: Request):
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
