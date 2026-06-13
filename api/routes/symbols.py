from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.models.symtoken import init_db, Base
from api.services.token_db import (
    search_symbols as ts_search,
    get_symbol_info as ts_info,
    get_distinct_exchanges as ts_exchanges,
    get_symbol_count as ts_count,
    clear_cache as ts_clear,
    get_cache_stats as ts_stats,
)
from api.services.qty_freeze_service import (
    get_freeze_qty,
    set_freeze_qty,
    get_all as get_all_freeze,
    load_from_json as load_freeze_json,
)
from api.services.market_calendar_db import (
    get_holidays_by_year,
    is_market_holiday,
    get_market_timings_for_date,
    get_crypto_timings,
    add_holiday,
    load_from_json as load_calendar_json,
)
from persistence.database import _session_factory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/symbols", tags=["symbols"])


def _get_sync_session():
    from persistence.database import _engine
    return Session(_engine)


class SetFreezeQtyRequest(BaseModel):
    symbol: str
    exchange: str
    qty: int


# Startup handled by app._startup() - init_db already called there
# @router.on_event("startup")
# async def on_startup():
#     from persistence.database import _engine
#     if _engine:
#         init_db(_engine)
#         logger.info("SymToken DB initialized on startup")


@router.get("/search")
async def search_symbols(
    q: str = Query(..., min_length=1),
    exchange: str | None = Query(None),
    limit: int = Query(20, ge=1, le=200),
):
    session = _get_sync_session()
    try:
        results = ts_search(session, q, exchange, limit)
        return {"status": "success", "data": results, "total": len(results)}
    finally:
        session.close()


@router.get("/{symbol}")
async def get_symbol(
    symbol: str,
    exchange: str = Query(...),
):
    session = _get_sync_session()
    try:
        info = ts_info(session, symbol, exchange)
        if not info:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found on {exchange}")
        return {"status": "success", "data": info}
    finally:
        session.close()


@router.get("/exchanges")
async def list_exchanges():
    session = _get_sync_session()
    try:
        exchanges = ts_exchanges(session)
        return {"status": "success", "data": exchanges}
    finally:
        session.close()


@router.get("/freeze-qty")
async def get_freeze_qty_endpoint(
    symbol: str = Query(...),
    exchange: str = Query(...),
):
    qty = get_freeze_qty(symbol, exchange)
    return {"status": "success", "symbol": symbol, "exchange": exchange, "freeze_qty": qty}


@router.get("/holidays")
async def get_holidays(year: int = Query(2025, ge=2020, le=2030)):
    holidays = get_holidays_by_year(str(year))
    return {"status": "success", "year": year, "data": holidays}


@router.get("/timings")
async def get_timings(date_str: str | None = Query(None, alias="date")):
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    timings = get_market_timings_for_date(date_str)
    crypto = get_crypto_timings()
    return {
        "status": "success",
        "indian": timings,
        "crypto": crypto,
    }


@router.post("/freeze-qty")
async def set_freeze_qty_endpoint(req: SetFreezeQtyRequest):
    set_freeze_qty(req.symbol, req.exchange, req.qty)
    return {
        "status": "success",
        "message": f"Freeze qty set to {req.qty} for {req.symbol} on {req.exchange}",
    }


@router.get("/stats/cache")
async def cache_stats():
    return {"status": "success", "data": ts_stats()}


@router.post("/cache/clear")
async def clear_cache():
    ts_clear()
    return {"status": "success", "message": "Token cache cleared"}


@router.get("/count")
async def symbol_count():
    session = _get_sync_session()
    try:
        count = ts_count(session)
        return {"status": "success", "count": count}
    finally:
        session.close()
