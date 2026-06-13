from __future__ import annotations

import json
import logging
from datetime import datetime, date, time

logger = logging.getLogger(__name__)

SUPPORTED_EXCHANGES = [
    "NSE", "BSE", "NFO", "BFO", "CDS", "MCX", "NCDEX",
    "binance", "bybit", "okx",
]

_holidays: dict[str, list[dict]] = {}

_INDIAN_HOLIDAYS_2024 = [
    {"date": "2024-01-26", "day": "Friday", "description": "Republic Day", "exchange": "NSE"},
    {"date": "2024-03-25", "day": "Monday", "description": "Holi", "exchange": "NSE"},
    {"date": "2024-03-29", "day": "Friday", "description": "Good Friday", "exchange": "NSE"},
    {"date": "2024-04-11", "day": "Thursday", "description": "Id-ul-Fitr", "exchange": "NSE"},
    {"date": "2024-04-17", "day": "Wednesday", "description": "Ram Navami", "exchange": "NSE"},
    {"date": "2024-05-01", "day": "Wednesday", "description": "Maharashtra Day", "exchange": "NSE"},
    {"date": "2024-06-17", "day": "Monday", "description": "Bakri Id", "exchange": "NSE"},
    {"date": "2024-07-17", "day": "Wednesday", "description": "Muharram", "exchange": "NSE"},
    {"date": "2024-08-15", "day": "Thursday", "description": "Independence Day", "exchange": "NSE"},
    {"date": "2024-09-16", "day": "Monday", "description": "Mahatma Gandhi Jayanti", "exchange": "NSE"},
    {"date": "2024-10-02", "day": "Wednesday", "description": "Mahatma Gandhi Jayanti", "exchange": "NSE"},
    {"date": "2024-10-31", "day": "Thursday", "description": "Diwali", "exchange": "NSE"},
    {"date": "2024-11-15", "day": "Friday", "description": "Gurunanak Jayanti", "exchange": "NSE"},
    {"date": "2024-12-25", "day": "Wednesday", "description": "Christmas", "exchange": "NSE"},
]

_INDIAN_HOLIDAYS_2025 = [
    {"date": "2025-01-26", "day": "Sunday", "description": "Republic Day", "exchange": "NSE"},
    {"date": "2025-02-26", "day": "Wednesday", "description": "Maha Shivaratri", "exchange": "NSE"},
    {"date": "2025-03-14", "day": "Friday", "description": "Holi", "exchange": "NSE"},
    {"date": "2025-03-31", "day": "Monday", "description": "Id-ul-Fitr", "exchange": "NSE"},
    {"date": "2025-04-18", "day": "Friday", "description": "Good Friday", "exchange": "NSE"},
    {"date": "2025-08-15", "day": "Friday", "description": "Independence Day", "exchange": "NSE"},
    {"date": "2025-10-02", "day": "Thursday", "description": "Mahatma Gandhi Jayanti", "exchange": "NSE"},
    {"date": "2025-10-20", "day": "Monday", "description": "Diwali", "exchange": "NSE"},
    {"date": "2025-11-05", "day": "Wednesday", "description": "Gurunanak Jayanti", "exchange": "NSE"},
    {"date": "2025-12-25", "day": "Thursday", "description": "Christmas", "exchange": "NSE"},
]

_INDIAN_HOLIDAYS_2026 = [
    {"date": "2026-01-26", "day": "Monday", "description": "Republic Day", "exchange": "NSE"},
    {"date": "2026-02-16", "day": "Monday", "description": "Maha Shivaratri", "exchange": "NSE"},
    {"date": "2026-03-04", "day": "Wednesday", "description": "Holi", "exchange": "NSE"},
    {"date": "2026-04-03", "day": "Friday", "description": "Good Friday", "exchange": "NSE"},
    {"date": "2026-08-15", "day": "Saturday", "description": "Independence Day", "exchange": "NSE"},
    {"date": "2026-10-02", "day": "Friday", "description": "Mahatma Gandhi Jayanti", "exchange": "NSE"},
    {"date": "2026-11-09", "day": "Monday", "description": "Diwali", "exchange": "NSE"},
    {"date": "2026-12-25", "day": "Friday", "description": "Christmas", "exchange": "NSE"},
]

_YEARLY_HOLIDAYS = {
    "2024": _INDIAN_HOLIDAYS_2024,
    "2025": _INDIAN_HOLIDAYS_2025,
    "2026": _INDIAN_HOLIDAYS_2026,
}

_holidays.update(_YEARLY_HOLIDAYS)


def add_holiday(year: str, date_str: str, day: str, description: str, exchange: str = "NSE"):
    _holidays.setdefault(year, []).append({
        "date": date_str,
        "day": day,
        "description": description,
        "exchange": exchange,
    })
    logger.info("Holiday added: %s - %s (%s)", date_str, description, exchange)


def get_holidays_by_year(year: str) -> list[dict]:
    return _holidays.get(year, [])


def is_market_holiday(query_date: str | date, exchange: str | None = None) -> bool:
    if isinstance(query_date, date):
        query_date = query_date.isoformat()
    year = query_date[:4]
    for h in _holidays.get(year, []):
        if h["date"] == query_date:
            if exchange is None or h["exchange"] == exchange:
                return True
    return False


_INDIAN_TIMINGS = {"open": "09:15", "close": "15:30"}


def get_market_timings_for_date(query_date: str | date) -> dict:
    if isinstance(query_date, date):
        query_date = query_date.isoformat()
    weekday = datetime.strptime(query_date, "%Y-%m-%d").weekday()
    if weekday >= 5:
        return {"date": query_date, "status": "closed", "reason": "weekend"}
    for year_data in _holidays.values():
        for h in year_data:
            if h["date"] == query_date:
                return {"date": query_date, "status": "closed", "reason": f"holiday: {h['description']}"}
    return {
        "date": query_date,
        "status": "open",
        "open": _INDIAN_TIMINGS["open"],
        "close": _INDIAN_TIMINGS["close"],
    }


_CRYPTO_TIMINGS = {"open": "00:00", "close": "23:59"}


def get_crypto_timings() -> list[dict]:
    return [
        {"exchange": "binance", "open": "00:00", "close": "23:59", "timezone": "UTC"},
        {"exchange": "bybit", "open": "00:00", "close": "23:59", "timezone": "UTC"},
        {"exchange": "okx", "open": "00:00", "close": "23:59", "timezone": "UTC"},
    ]


def add_to_calendar(year: str, exchange: str, holidays_list: list[dict]):
    for h in holidays_list:
        h["exchange"] = h.get("exchange", exchange)
    _holidays.setdefault(year, []).extend(holidays_list)
    logger.info("Added %d holidays to %s for %s", len(holidays_list), year, exchange)


def load_from_json(path: str) -> int:
    global _holidays
    try:
        with open(path, "r") as f:
            data = json.load(f)
    except Exception as e:
        logger.error("Failed to load market calendar from %s: %s", path, e)
        return 0
    count = 0
    for year_key, holidays_list in data.items():
        _holidays.setdefault(year_key, [])
        for h in holidays_list:
            h.setdefault("exchange", "NSE")
            _holidays[year_key].append(h)
            count += 1
    logger.info("Loaded %d holidays from %s", count, path)
    return count
