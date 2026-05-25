from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, List, Optional, Set

import pandas as pd

logger = logging.getLogger(__name__)

HAS_EXCHANGE_CALENDARS = False
try:
    import exchange_calendars as ec

    HAS_EXCHANGE_CALENDARS = True
except ImportError:
    ec: Any = None


EXCHANGE_MAP = {
    "NYSE": "XNYS",
    "NASDAQ": "XNAS",
    "LSE": "XLON",
    "TSE": "XTKS",
    "HKEX": "XHKG",
    "SSE": "XSHG",
    "SZSE": "XSHE",
    "TSX": "XTSE",
    "ASX": "XASX",
    "BSE": "XBOM",
    "NSE": "XNSE",
    "EURONEXT": "XPAR",
    "SIX": "XSWX",
    "BMF": "BVMF",
    "CME": "CMES",
    "ICE": "ICEUS",
    "EUREX": "XEUR",
    "LME": "XLME",
    "CBOT": "XCHI",
    "COMEX": "XCEC",
    "NYMEX": "XNYM",
}


def get_calendar(exchange: str):
    exchange_code = EXCHANGE_MAP.get(exchange.upper(), exchange.upper())
    if not HAS_EXCHANGE_CALENDARS:
        logger.warning("exchange_calendars not installed; using default calendar")
        return _DefaultCalendar(exchange_code)
    try:
        return ec.get_calendar(exchange_code)
    except ec.errors.InvalidCalendarName:
        logger.warning("Unknown exchange %s, using default", exchange_code)
        return _DefaultCalendar(exchange_code)


def trading_days(exchange: str, start: str, end: str) -> pd.DatetimeIndex:
    cal = get_calendar(exchange)
    if hasattr(cal, "sessions_in_range"):
        return cal.sessions_in_range(start, end)
    if HAS_EXCHANGE_CALENDARS and isinstance(cal, ec.ExchangeCalendar):
        return cal.sessions_in_range(start, end)
    return pd.bdate_range(start=start, end=end)


def is_trading_day(exchange: str, dt: date) -> bool:
    cal = get_calendar(exchange)
    if hasattr(cal, "is_session"):
        return cal.is_session(dt)
    return dt.weekday() < 5


def next_trading_day(exchange: str, dt: date) -> date:
    cal = get_calendar(exchange)
    if hasattr(cal, "next_session"):
        try:
            return cal.next_session(dt)
        except (ValueError, KeyError):
            pass
    cursor = dt + timedelta(days=1)
    while cursor.weekday() >= 5:
        cursor += timedelta(days=1)
    return cursor


def previous_trading_day(exchange: str, dt: date) -> date:
    cal = get_calendar(exchange)
    if hasattr(cal, "previous_session"):
        try:
            return cal.previous_session(dt)
        except (ValueError, KeyError):
            pass
    cursor = dt - timedelta(days=1)
    while cursor.weekday() >= 5:
        cursor -= timedelta(days=1)
    return cursor


def market_open_now(exchange: str, dt: Optional[datetime] = None) -> bool:
    if dt is None:
        dt = datetime.now()
    cal = get_calendar(exchange)
    if hasattr(cal, "is_open_on_minute"):
        return cal.is_open_on_minute(dt)
    return dt.weekday() < 5


def market_schedule(exchange: str, dt: date) -> dict:
    cal = get_calendar(exchange)
    if hasattr(cal, "schedule"):
        try:
            day = cal.schedule.loc[pd.Timestamp(dt)]
            return {
                "open": day.get("market_open", day.get("open")).isoformat(),
                "close": day.get("market_close", day.get("close")).isoformat(),
            }
        except (KeyError, AttributeError):
            pass
    return {"open": "09:30", "close": "16:00"}


class _DefaultCalendar:
    def __init__(self, exchange_code: str):
        self.exchange_code = exchange_code
        self.name = exchange_code

    def is_session(self, dt: date) -> bool:
        return dt.weekday() < 5

    def sessions_in_range(self, start: str, end: str) -> pd.DatetimeIndex:
        return pd.bdate_range(start=start, end=end)

    def next_session(self, dt: date) -> date:
        cursor = dt + timedelta(days=1)
        while cursor.weekday() >= 5:
            cursor += timedelta(days=1)
        return cursor

    def previous_session(self, dt: date) -> date:
        cursor = dt - timedelta(days=1)
        while cursor.weekday() >= 5:
            cursor -= timedelta(days=1)
        return cursor

    def is_open_on_minute(self, dt: datetime) -> bool:
        return dt.weekday() < 5
