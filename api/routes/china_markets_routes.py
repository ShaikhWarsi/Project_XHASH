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

router = APIRouter(prefix="/china", tags=["china markets"])


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


_CHINA_STOCKS = [
    {"symbol": "600519.SH", "name": "Kweichow Moutai", "exchange": "SH", "price": 1780.50, "change": 1.2, "volume": 2_150_000, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "000858.SZ", "name": "Wuliangye Yibin", "exchange": "SZ", "price": 158.30, "change": -0.8, "volume": 5_680_000, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "601318.SH", "name": "Ping An Insurance", "exchange": "SH", "price": 52.60, "change": 0.5, "volume": 12_300_000, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "600036.SH", "name": "China Merchants Bank", "exchange": "SH", "price": 34.80, "change": -0.3, "volume": 8_750_000, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "000333.SZ", "name": "Midea Group", "exchange": "SZ", "price": 65.20, "change": 1.5, "volume": 4_320_000, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "601166.SH", "name": "Industrial Bank", "exchange": "SH", "price": 18.45, "change": 0.2, "volume": 6_100_000, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "002415.SZ", "name": "Hikvision", "exchange": "SZ", "price": 32.90, "change": -1.1, "volume": 3_450_000, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "600887.SH", "name": "Inner Mongolia Yili", "exchange": "SH", "price": 28.75, "change": 0.9, "volume": 5_210_000, "timestamp": "2026-05-26T10:30:00Z"},
]

_CHINA_INDICES = [
    {"symbol": "000001.SH", "name": "Shanghai Composite", "exchange": "SH", "price": 3321.45, "change": 0.6, "volume": 0, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "399001.SZ", "name": "SZSE Component", "exchange": "SZ", "price": 10850.20, "change": 0.8, "volume": 0, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "399006.SZ", "name": "ChiNext", "exchange": "SZ", "price": 2240.15, "change": 1.2, "volume": 0, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "000688.SH", "name": "SSE STAR 50", "exchange": "SH", "price": 980.30, "change": -0.5, "volume": 0, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "HSI", "name": "Hang Seng Index", "exchange": "HK", "price": 19850.60, "change": -0.3, "volume": 0, "timestamp": "2026-05-26T10:30:00Z"},
    {"symbol": "HSCEI", "name": "Hang Seng China Enterprises", "exchange": "HK", "price": 7120.80, "change": 0.4, "volume": 0, "timestamp": "2026-05-26T10:30:00Z"},
]


@router.get("/stocks")
async def china_stocks():
    return {"stocks": _CHINA_STOCKS}


@router.get("/indices")
async def china_indices():
    return {"indices": _CHINA_INDICES}
