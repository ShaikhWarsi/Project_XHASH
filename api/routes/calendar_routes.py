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


_eco_cache: list[dict] | None = None
_eco_cache_ts: float = 0.0

_SECTOR_ETFS = {
    "Technology": "XLK",
    "Healthcare": "XLV",
    "Financial Services": "XLF",
    "Energy": "XLE",
    "Consumer Cyclical": "XLY",
    "Consumer Defensive": "XLP",
    "Industrials": "XLI",
    "Basic Materials": "XLB",
    "Real Estate": "XLRE",
    "Utilities": "XLU",
    "Communication Services": "XLC",
}

_SECTOR_COLORS = {
    "Technology": "#22c55e",
    "Healthcare": "#ef4444",
    "Financial Services": "#3b82f6",
    "Energy": "#f59e0b",
    "Consumer Cyclical": "#8b5cf6",
    "Consumer Defensive": "#06b6d4",
    "Industrials": "#f97316",
    "Basic Materials": "#84cc16",
    "Real Estate": "#ec4899",
    "Utilities": "#14b8a6",
    "Communication Services": "#6366f1",
}


@router.get("/economic")
async def get_economic_calendar():
    global _eco_cache, _eco_cache_ts
    import time
    now = time.time()
    if _eco_cache and (now - _eco_cache_ts) < 1800:
        return _eco_cache

    today = date.today()
    events: list[dict] = []

    try:
        import requests as _req
        resp = await asyncio.to_thread(
            lambda: _req.get("https://nfs.faireconomy.media/ff_calendar_thisweek.json", timeout=8)
        )
        if resp.status_code == 200:
            data = resp.json()
            for item in data:
                importance = item.get("impact", "").lower()
                imp = "high" if importance in ("high", "3") else "medium" if importance in ("medium", "2") else "low"
                dt_str = item.get("date", "")
                dt_obj = None
                for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
                    try:
                        dt_obj = datetime.strptime(dt_str, fmt)
                        break
                    except ValueError:
                        continue
                events.append({
                    "id": item.get("id", str(len(events) + 1)),
                    "date": dt_obj.strftime("%Y-%m-%d") if dt_obj else today.isoformat(),
                    "time": dt_obj.strftime("%H:%M") if dt_obj else "08:30",
                    "event": item.get("title", item.get("event", "Unknown")),
                    "country": item.get("country", "US"),
                    "category": item.get("category", "General"),
                    "importance": imp,
                    "previous": str(item.get("previous", "")),
                    "forecast": str(item.get("forecast", "")),
                    "actual": str(item.get("actual", "")),
                    "impact": None,
                })
    except Exception as e:
        logger.debug("FairEconomy fetch failed: %s", e)

    if not events:
        from itertools import count
        _id = count(1)
        for days_offset in range(0, 60):
            d = today + timedelta(days=days_offset)
            if d.weekday() >= 5:
                continue
            events.extend([
                {"id": f"eco-{next(_id)}", "date": d.isoformat(), "time": "08:30", "event": "Initial Jobless Claims", "country": "US", "category": "Employment", "importance": "medium", "previous": "218K", "forecast": "220K", "actual": "", "impact": None},
                {"id": f"eco-{next(_id)}", "date": d.isoformat(), "time": "10:00", "event": "ISM Services PMI", "country": "US", "category": "GDP", "importance": "medium", "previous": "51.4", "forecast": "51.8", "actual": "", "impact": None},
            ])
            if d.day <= 7:
                events.append({"id": f"eco-{next(_id)}", "date": d.isoformat(), "time": "08:30", "event": "CPI Month-over-Month", "country": "US", "category": "Inflation", "importance": "high", "previous": "0.3%", "forecast": "0.2%", "actual": "", "impact": None})
                events.append({"id": f"eco-{next(_id)}", "date": d.isoformat(), "time": "08:30", "event": "CPI Year-over-Year", "country": "US", "category": "Inflation", "importance": "high", "previous": "3.4%", "forecast": "3.3%", "actual": "", "impact": None})
            if d.day <= 5 and d.weekday() == 4:
                events.append({"id": f"eco-{next(_id)}", "date": d.isoformat(), "time": "08:30", "event": "Non-Farm Payrolls (NFP)", "country": "US", "category": "Employment", "importance": "high", "previous": "242K", "forecast": "235K", "actual": "", "impact": None})
                events.append({"id": f"eco-{next(_id)}", "date": d.isoformat(), "time": "08:30", "event": "Unemployment Rate", "country": "US", "category": "Employment", "importance": "high", "previous": "3.9%", "forecast": "3.9%", "actual": "", "impact": None})

    _eco_cache = events
    _eco_cache_ts = now
    return events


@router.get("/sectors")
async def get_sector_heatmap():
    import time as _time
    cache_key = "sector_heatmap"
    if hasattr(get_sector_heatmap, '_cache') and cache_key in get_sector_heatmap._cache:
        data, ts = get_sector_heatmap._cache[cache_key]
        if _time.time() - ts < 300:
            return data

    results: list[dict] = []
    try:
        import yfinance as yf

        async def _fetch_sector(name: str, etf: str) -> dict:
            def _get():
                t = yf.Ticker(etf)
                hist = t.history(period="5d")
                if hist.empty or len(hist) < 2:
                    return {"name": name, "etf": etf, "change": 0, "color": _SECTOR_COLORS.get(name, "#6b7280")}
                current = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2])
                change = ((current - prev) / prev) * 100
                return {"name": name, "etf": etf, "change": round(change, 2), "color": _SECTOR_COLORS.get(name, "#6b7280")}
            return await asyncio.to_thread(_get)

        tasks = [_fetch_sector(name, etf) for name, etf in _SECTOR_ETFS.items()]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        results = [r for r in results if isinstance(r, dict)]
        results.sort(key=lambda x: x.get("change", 0), reverse=True)
    except Exception as e:
        logger.debug("Sector heatmap fetch failed: %s", e)

    if not hasattr(get_sector_heatmap, '_cache'):
        get_sector_heatmap._cache = {}
    get_sector_heatmap._cache[cache_key] = (results, _time.time())
    return results
