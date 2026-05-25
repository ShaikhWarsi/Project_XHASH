from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.services.china_markets import (
    fetch_ohlcv,
    convert_symbol,
    fetch_daily,
    fetch_minute,
    fetch_fundamentals,
    fetch_financial_statements,
    fetch_penalty_list,
    check_st_risk,
    screen_st_candidates,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/china", tags=["china markets"])


class STScreenRequest(BaseModel):
    symbols: list[str]


@router.get("/bars/{symbol}")
async def china_bars(symbol: str, interval: str = "1d", count: int = 500, provider: str = "futu"):
    if provider == "futu":
        bars = fetch_ohlcv(symbol, interval, count)
    elif provider == "tushare":
        if interval == "1d":
            bars = fetch_daily(symbol)
        else:
            bars = fetch_minute(symbol, interval)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    return {"symbol": symbol, "interval": interval, "bars": bars}


@router.get("/fundamentals/{symbol}")
async def china_fundamentals(symbol: str):
    return {"symbol": symbol, "fundamentals": fetch_fundamentals(symbol)}


@router.get("/financials/{symbol}")
async def china_financials(symbol: str, statement_type: str = "income"):
    return {"symbol": symbol, "financials": fetch_financial_statements(symbol, statement_type)}


@router.get("/penalties")
async def china_penalties(symbol: str = ""):
    return {"penalties": fetch_penalty_list(symbol)}


@router.get("/st-risk/{symbol}")
async def st_risk(symbol: str):
    return check_st_risk(symbol)


@router.post("/st-screen")
async def st_screen(req: STScreenRequest):
    return {"results": screen_st_candidates(req.symbols)}


@router.get("/convert/{symbol}")
async def convert_china_symbol(symbol: str):
    return convert_symbol(symbol)
