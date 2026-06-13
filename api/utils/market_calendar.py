from __future__ import annotations

from datetime import date, datetime, time

import pytz

from api.services.market_calendar_db import (
    get_market_timings_for_date,
    is_market_holiday,
)

IST = pytz.timezone("Asia/Kolkata")

CRYPTO_EXCHANGES = {"binance", "bybit", "okx", "CRYPTO"}

_WEEKDAY_TIMINGS: dict[str, dict[str, time]] = {
    "NSE": {"open": time(9, 15), "close": time(15, 30)},
    "BSE": {"open": time(9, 15), "close": time(15, 30)},
    "NFO": {"open": time(9, 15), "close": time(15, 30)},
    "BFO": {"open": time(9, 15), "close": time(15, 30)},
    "CDS": {"open": time(9, 0), "close": time(17, 0)},
    "MCX": {"open": time(9, 0), "close": time(23, 30)},
    "NCDEX": {"open": time(10, 0), "close": time(17, 0)},
}


def is_market_open(exchange: str) -> bool:
    exch = exchange.upper()
    if exch in CRYPTO_EXCHANGES:
        return True
    now = datetime.now(IST)
    today = now.date()
    if is_market_holiday(today, exch):
        return False
    if today.weekday() >= 5:
        return False
    timings = _WEEKDAY_TIMINGS.get(exch)
    if timings is None:
        return False
    open_t = timings["open"]
    close_t = timings["close"]
    current_t = now.time()
    if open_t <= current_t <= close_t:
        return True
    return False


def get_market_status(exchange: str) -> dict:
    exch = exchange.upper()
    is_open = is_market_open(exch)
    if exch in CRYPTO_EXCHANGES:
        return {"exchange": exch, "is_open": True, "message": "Crypto market open 24/7"}
    if not is_open:
        now = datetime.now(IST)
        today = now.date()
        if is_market_holiday(today, exch):
            return {"exchange": exch, "is_open": False, "message": "Market holiday"}
        if today.weekday() >= 5:
            return {"exchange": exch, "is_open": False, "message": "Weekend"}
        return {"exchange": exch, "is_open": False, "message": "Outside trading hours"}
    return {"exchange": exch, "is_open": True, "message": "Market open"}
