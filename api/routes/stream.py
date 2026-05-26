from __future__ import annotations

import asyncio
import json
import logging

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from api.state import app_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["stream"])


async def _refresh_data():
    """Batch-refresh portfolio prices using a single yfinance download call."""
    try:
        p = await app_state.async_get_portfolio()
        if not p or not p.positions:
            return
        symbols = list(p.positions.keys())
        df = await asyncio.to_thread(
            lambda: yf.download(" ".join(symbols), period="1d", group_by="ticker", progress=False)
        )
        if df.empty:
            return
        for sym, pos in p.positions.items():
            try:
                if isinstance(df.columns, pd.MultiIndex) and sym in df.columns.levels[0]:
                    price = float(df[sym]["Close"].iloc[-1])
                elif sym in df.columns:
                    price = float(df[sym].iloc[-1]) if hasattr(df[sym], "iloc") else float(df[sym])
                else:
                    continue
                pos.current_price = price
                pos.market_value = pos.quantity * price
                pos.unrealized_pnl = (price - pos.entry_price) * pos.quantity
            except Exception as e:
                logger.warning("Failed to refresh price for %s: %s", sym, e)
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
