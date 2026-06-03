from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone

import yfinance as yf
from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["calendar"])

_earnings_cache: dict[str, tuple[list, float]] = {}
_dividend_cache: dict[str, tuple[list, float]] = {}
_CACHE_TTL = 3600.0

POPULAR = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "HD", "DIS", "NFLX", "ADBE", "CRM", "INTC", "AMD", "IBM", "CSCO", "QCOM", "TXN", "AVGO", "MU", "ABNB", "UBER", "PYPL", "SNAP", "SQQQ", "TQQQ", "SOXL", "LABU", "XBI", "IYR", "XLF", "XLE", "XLK", "XLV", "XLI", "XLP", "XLU", "XLB", "XLRE"]


@router.get("/earnings")
async def get_earnings(symbols: str = "", days_ahead: int = Query(30, ge=1, le=90)):
    sym_list = [s.upper().strip() for s in symbols.split(",") if s.strip()] or POPULAR[:20]
    now = datetime.now(timezone.utc)
    results = []
    today = date.today()

    for s in sym_list:
        cache_key = f"earnings_{s}"
        if cache_key in _earnings_cache:
            data, ts = _earnings_cache[cache_key]
            if (now.timestamp() - ts) < _CACHE_TTL:
                results.extend(data)
                continue

        try:
            ticker = yf.Ticker(s)
            cal = await asyncio.to_thread(lambda: ticker.calendar)
            if cal is None:
                continue
            cal_dict = cal.to_dict() if hasattr(cal, "to_dict") else {}
            earnings_date = cal_dict.get("Earnings Date", [])
            if not earnings_date:
                continue
            for ed in earnings_date[:3]:
                if isinstance(ed, (int, float)):
                    ed_dt = datetime.fromtimestamp(ed, tz=timezone.utc).date()
                else:
                    continue
                if today <= ed_dt <= today + timedelta(days=days_ahead):
                    results.append({
                        "symbol": s,
                        "date": ed_dt.isoformat(),
                        "type": "earnings",
                    })
        except Exception:
            pass

    return {"events": sorted(results, key=lambda x: x["date"])}


@router.get("/dividends")
async def get_dividends(symbols: str = "", days_ahead: int = Query(90, ge=1, le=365)):
    sym_list = [s.upper().strip() for s in symbols.split(",") if s.strip()] or POPULAR[:30]
    now = datetime.now(timezone.utc)
    results = []
    today = date.today()

    for s in sym_list:
        cache_key = f"div_{s}"
        if cache_key in _dividend_cache:
            data, ts = _dividend_cache[cache_key]
            if (now.timestamp() - ts) < _CACHE_TTL:
                results.extend(data)
                continue

        try:
            ticker = yf.Ticker(s)
            dividends = await asyncio.to_thread(lambda: ticker.dividends)
            if dividends is None or dividends.empty:
                continue
            last_div = dividends.iloc[-1]
            div_date = dividends.index[-1].date()
            ex_date = div_date + timedelta(days=30)
            pay_date = ex_date + timedelta(days=30)
            if today <= ex_date <= today + timedelta(days=days_ahead):
                results.append({
                    "symbol": s,
                    "exDate": ex_date.isoformat(),
                    "payDate": pay_date.isoformat(),
                    "amount": round(float(last_div), 4),
                    "type": "dividend",
                })
        except Exception:
            pass

    return {"events": sorted(results, key=lambda x: x.get("exDate", ""))}
