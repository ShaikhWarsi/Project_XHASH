import pytest
from datetime import date, datetime, timedelta

from core.calendars import (
    get_calendar,
    trading_days,
    is_trading_day,
    next_trading_day,
    previous_trading_day,
    market_open_now,
    market_schedule,
    EXCHANGE_MAP,
)


class TestCalendars:
    def test_exchange_map_has_major(self):
        assert "NYSE" in EXCHANGE_MAP
        assert "NASDAQ" in EXCHANGE_MAP
        assert "LSE" in EXCHANGE_MAP
        assert "HKEX" in EXCHANGE_MAP
        assert "CME" in EXCHANGE_MAP

    def test_get_calendar_default(self):
        cal = get_calendar("UNKNOWN")
        assert cal is not None
        assert hasattr(cal, "is_session")

    def test_get_calendar_known(self):
        cal = get_calendar("NYSE")
        assert cal is not None

    def test_is_trading_day_weekday(self):
        wed = date(2024, 1, 3)
        assert is_trading_day("NYSE", wed) is True

    def test_is_trading_day_weekend(self):
        sat = date(2024, 1, 6)
        assert is_trading_day("NYSE", sat) is False

    def test_next_trading_day_from_friday(self):
        fri = date(2024, 1, 5)
        nxt = next_trading_day("NYSE", fri)
        assert nxt.weekday() < 5

    def test_previous_trading_day_from_monday(self):
        mon = date(2024, 1, 8)
        prev = previous_trading_day("NYSE", mon)
        assert prev.weekday() < 5

    def test_trading_days_range(self):
        days = trading_days("NYSE", "2024-01-01", "2024-01-10")
        assert len(days) > 0
        assert all(d.dayofweek < 5 for d in days)

    def test_market_open_now_weekday(self):
        now = datetime(2024, 1, 3, 15, 0)  # 10 AM ET
        assert market_open_now("NYSE", now) is True

    def test_market_open_now_weekend(self):
        sat = datetime(2024, 1, 6, 15, 0)
        assert market_open_now("NYSE", sat) is False

    def test_market_schedule_default(self):
        sched = market_schedule("NYSE", date(2024, 1, 3))
        assert "open" in sched
        assert "close" in sched

    def test_default_calendar_is_session(self):
        from core.calendars import _DefaultCalendar
        cal = _DefaultCalendar("TEST")
        assert cal.is_session(date(2024, 1, 3)) is True
        assert cal.is_session(date(2024, 1, 6)) is False

    def test_default_calendar_sessions_range(self):
        from core.calendars import _DefaultCalendar
        cal = _DefaultCalendar("TEST")
        days = cal.sessions_in_range("2024-01-01", "2024-01-10")
        assert len(days) > 0
