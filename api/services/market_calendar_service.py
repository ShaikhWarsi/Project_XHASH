from __future__ import annotations

import logging
from datetime import datetime, date, time
from typing import Any

logger = logging.getLogger(__name__)

SUPPORTED_EXCHANGES = ["NSE", "BSE", "NFO", "BFO", "CDS", "MCX", "NCDEX"]

INDIAN_MARKET_HOLIDAYS: dict[int, list[dict[str, Any]]] = {
    2024: [
        {"date": "2024-01-26", "day": "Friday", "description": "Republic Day", "exchange": "NSE"},
        {"date": "2024-03-08", "day": "Friday", "description": "Mahashivratri", "exchange": "NSE"},
        {"date": "2024-03-25", "day": "Monday", "description": "Holi", "exchange": "NSE"},
        {"date": "2024-03-29", "day": "Friday", "description": "Good Friday", "exchange": "NSE"},
        {"date": "2024-04-11", "day": "Thursday", "description": "Id-ul-Fitr", "exchange": "NSE"},
        {"date": "2024-04-17", "day": "Wednesday", "description": "Shri Ram Navami", "exchange": "NSE"},
        {"date": "2024-05-01", "day": "Wednesday", "description": "Maharashtra Day", "exchange": "NSE"},
        {"date": "2024-06-17", "day": "Monday", "description": "Bakri Id", "exchange": "NSE"},
        {"date": "2024-07-17", "day": "Wednesday", "description": "Muharram", "exchange": "NSE"},
        {"date": "2024-08-15", "day": "Thursday", "description": "Independence Day", "exchange": "NSE"},
        {"date": "2024-09-02", "day": "Monday", "description": "Ganesh Chaturthi", "exchange": "NSE"},
        {"date": "2024-10-02", "day": "Wednesday", "description": "Mahatma Gandhi Jayanti", "exchange": "NSE"},
        {"date": "2024-10-31", "day": "Thursday", "description": "Diwali", "exchange": "NSE"},
        {"date": "2024-11-15", "day": "Friday", "description": "Guru Nanak Jayanti", "exchange": "NSE"},
        {"date": "2024-12-25", "day": "Wednesday", "description": "Christmas", "exchange": "NSE"},
    ],
    2025: [
        {"date": "2025-01-26", "day": "Sunday", "description": "Republic Day", "exchange": "NSE"},
        {"date": "2025-02-26", "day": "Wednesday", "description": "Mahashivratri", "exchange": "NSE"},
        {"date": "2025-03-14", "day": "Friday", "description": "Holi", "exchange": "NSE"},
        {"date": "2025-03-31", "day": "Monday", "description": "Id-ul-Fitr", "exchange": "NSE"},
        {"date": "2025-04-10", "day": "Thursday", "description": "Shri Ram Navami", "exchange": "NSE"},
        {"date": "2025-04-18", "day": "Friday", "description": "Good Friday", "exchange": "NSE"},
        {"date": "2025-05-01", "day": "Thursday", "description": "Maharashtra Day", "exchange": "NSE"},
        {"date": "2025-06-07", "day": "Saturday", "description": "Bakri Id", "exchange": "NSE"},
        {"date": "2025-07-06", "day": "Sunday", "description": "Muharram", "exchange": "NSE"},
        {"date": "2025-08-15", "day": "Friday", "description": "Independence Day", "exchange": "NSE"},
        {"date": "2025-09-27", "day": "Saturday", "description": "Ganesh Chaturthi", "exchange": "NSE"},
        {"date": "2025-10-02", "day": "Thursday", "description": "Mahatma Gandhi Jayanti", "exchange": "NSE"},
        {"date": "2025-10-20", "day": "Monday", "description": "Diwali", "exchange": "NSE"},
        {"date": "2025-11-05", "day": "Wednesday", "description": "Guru Nanak Jayanti", "exchange": "NSE"},
        {"date": "2025-12-25", "day": "Thursday", "description": "Christmas", "exchange": "NSE"},
    ],
    2026: [
        {"date": "2026-01-26", "day": "Monday", "description": "Republic Day", "exchange": "NSE"},
        {"date": "2026-02-17", "day": "Tuesday", "description": "Mahashivratri", "exchange": "NSE"},
        {"date": "2026-03-06", "day": "Friday", "description": "Holi", "exchange": "NSE"},
        {"date": "2026-03-20", "day": "Friday", "description": "Id-ul-Fitr", "exchange": "NSE"},
        {"date": "2026-03-27", "day": "Friday", "description": "Shri Ram Navami", "exchange": "NSE"},
        {"date": "2026-04-03", "day": "Friday", "description": "Good Friday", "exchange": "NSE"},
        {"date": "2026-05-01", "day": "Friday", "description": "Maharashtra Day", "exchange": "NSE"},
        {"date": "2026-05-27", "day": "Wednesday", "description": "Bakri Id", "exchange": "NSE"},
        {"date": "2026-06-26", "day": "Friday", "description": "Muharram", "exchange": "NSE"},
        {"date": "2026-08-15", "day": "Saturday", "description": "Independence Day", "exchange": "NSE"},
        {"date": "2026-09-17", "day": "Thursday", "description": "Ganesh Chaturthi", "exchange": "NSE"},
        {"date": "2026-10-02", "day": "Friday", "description": "Mahatma Gandhi Jayanti", "exchange": "NSE"},
        {"date": "2026-10-29", "day": "Thursday", "description": "Diwali", "exchange": "NSE"},
        {"date": "2026-11-26", "day": "Thursday", "description": "Guru Nanak Jayanti", "exchange": "NSE"},
        {"date": "2026-12-25", "day": "Friday", "description": "Christmas", "exchange": "NSE"},
    ],
}

DEFAULT_MARKET_TIMINGS: dict[str, dict[str, str]] = {
    "NSE": {"open": "09:15", "close": "15:30", "description": "Equity Cash"},
    "BSE": {"open": "09:15", "close": "15:30", "description": "Equity Cash"},
    "NFO": {"open": "09:15", "close": "15:30", "description": "Equity Derivatives"},
    "BFO": {"open": "09:15", "close": "15:30", "description": "Equity Derivatives"},
    "CDS": {"open": "09:00", "close": "17:00", "description": "Currency Derivatives"},
    "MCX": {"open": "09:00", "close": "23:30", "description": "Commodity Derivatives"},
    "NCDEX": {"open": "10:00", "close": "17:00", "description": "Commodity Derivatives"},
}

WEEKEND_DAYS = {5, 6}


def get_holidays(year: int) -> tuple[bool, dict[str, Any], int]:
    try:
        holidays = INDIAN_MARKET_HOLIDAYS.get(year, [])
        if not holidays:
            return True, {"status": "success", "year": year, "holidays": []}, 200
        return True, {"status": "success", "year": year, "holidays": holidays}, 200
    except Exception as e:
        logger.exception("Error fetching holidays for %d: %s", year, e)
        return False, {"status": "error", "message": str(e)}, 500


def get_timings(date_str: str | None = None) -> tuple[bool, dict[str, Any], int]:
    try:
        if date_str:
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                return False, {"status": "error", "message": "Invalid date format. Use YYYY-MM-DD"}, 400
        else:
            dt = datetime.now()

        is_weekend = dt.weekday() in WEEKEND_DAYS
        market_status = "closed"

        if is_weekend:
            market_status = "closed"
        else:
            holiday_list = INDIAN_MARKET_HOLIDAYS.get(dt.year, [])
            is_holiday = any(h["date"] == dt.strftime("%Y-%m-%d") for h in holiday_list)
            market_status = "closed" if is_holiday else "open"

        timings = {}
        for exchange, t in DEFAULT_MARKET_TIMINGS.items():
            open_time = datetime.strptime(t["open"], "%H:%M").time()
            close_time = datetime.strptime(t["close"], "%H:%M").time()
            now_time = dt.time()

            if market_status == "open":
                current_status = "open" if open_time <= now_time <= close_time else "closed"
            else:
                current_status = market_status

            timings[exchange] = {
                "open": t["open"],
                "close": t["close"],
                "status": current_status,
                "description": t["description"],
            }

        return True, {
            "status": "success",
            "date": dt.strftime("%Y-%m-%d"),
            "day": dt.strftime("%A"),
            "is_weekend": is_weekend,
            "market_status": market_status,
            "timings": timings,
        }, 200
    except Exception as e:
        logger.exception("Error fetching timings: %s", e)
        return False, {"status": "error", "message": str(e)}, 500


def check_holiday(date_str: str, exchange: str | None = None) -> tuple[bool, dict[str, Any], int]:
    try:
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            return False, {"status": "error", "message": "Invalid date format. Use YYYY-MM-DD"}, 400

        is_weekend = dt.weekday() in WEEKEND_DAYS
        if is_weekend:
            return True, {
                "status": "success",
                "date": date_str,
                "is_holiday": True,
                "reason": "Weekend",
                "exchange": exchange or "ALL",
            }, 200

        holidays = INDIAN_MARKET_HOLIDAYS.get(dt.year, [])
        matching = [h for h in holidays if h["date"] == date_str]
        if exchange:
            matching = [h for h in matching if h["exchange"] == exchange]

        if matching:
            return True, {
                "status": "success",
                "date": date_str,
                "is_holiday": True,
                "reason": matching[0]["description"],
                "exchange": exchange or "ALL",
                "holiday_details": matching,
            }, 200

        return True, {
            "status": "success",
            "date": date_str,
            "is_holiday": False,
            "reason": None,
            "exchange": exchange or "ALL",
        }, 200
    except Exception as e:
        logger.exception("Error checking holiday: %s", e)
        return False, {"status": "error", "message": str(e)}, 500
