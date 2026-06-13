from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["calendar"])


class TickerRequest(BaseModel):
    symbols: list[str]


@router.post("/today")
async def calendar_today(body: TickerRequest):
    symbols = [s.upper().strip() for s in body.symbols if s.strip()]
    result: dict[str, list[dict[str, Any]]] = {
        "macro": [],
        "earnings": [],
        "dividends": [],
    }

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    from api.routes.calendar_routes import get_earnings_calendar, get_dividends_calendar

    try:
        earnings = await get_earnings_calendar(",".join(symbols), days_ahead=1)
        if isinstance(earnings, dict):
            for sym, data in earnings.items():
                if isinstance(data, dict) and data.get("date") == today_str:
                    result["earnings"].append({
                        "ticker": sym.upper(),
                        "time": data.get("time", "N/A"),
                        "estEps": data.get("epsEstimated") or data.get("eps_estimated"),
                    })
    except Exception as e:
        logger.debug("Earnings calendar error: %s", e)

    try:
        dividends = await get_dividends_calendar(",".join(symbols), days_ahead=90)
        if isinstance(dividends, dict):
            for sym, data in dividends.items():
                if isinstance(data, dict):
                    ex_date = data.get("exDate") or data.get("ex_date", "")
                    if ex_date and ex_date[:10] <= today_str:
                        result["dividends"].append({
                            "ticker": sym.upper(),
                            "amount": float(data.get("amount", data.get("dividend", 0))),
                            "exDate": ex_date[:10] if len(ex_date) >= 10 else ex_date,
                        })
    except Exception as e:
        logger.debug("Dividends calendar error: %s", e)

    macro_events = _get_today_macro_events(today_str)
    result["macro"] = macro_events

    return result


def _get_today_macro_events(today_str: str) -> list[dict[str, Any]]:
    """Return hardcoded known macro events for today.
    In production, this would come from a data provider or DB table.
    Falls back to common weekly/daily schedule."""
    weekday = datetime.now(timezone.utc).strftime("%A")

    schedule: dict[str, list[dict[str, Any]]] = {
        "Monday": [
            {"time": "10:00", "label": "ISM Manufacturing PMI", "impact": "high"},
        ],
        "Tuesday": [],
        "Wednesday": [
            {"time": "08:30", "label": "MBA Mortgage Applications", "impact": "medium"},
            {"time": "10:30", "label": "EIA Petroleum Status Report", "impact": "medium"},
        ],
        "Thursday": [
            {"time": "08:30", "label": "Initial Jobless Claims", "impact": "high"},
            {"time": "10:00", "label": "Existing Home Sales", "impact": "medium"},
        ],
        "Friday": [
            {"time": "08:30", "label": "Non-Farm Payrolls", "impact": "high"},
            {"time": "10:00", "label": "Consumer Sentiment Index", "impact": "medium"},
        ],
        "Saturday": [],
        "Sunday": [],
    }

    return schedule.get(weekday, [])
