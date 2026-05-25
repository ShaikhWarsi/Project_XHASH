from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

TUSHARE_MARKET_MAP = {
    "a_share": "A-share",
    "futures": "Chinese futures",
    "fund": "Chinese fund",
}

INTERVAL_MAP = {
    "1d": "D",
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "60m": "60",
}


def fetch_daily(symbol: str, start: str = "", end: str = "") -> list[dict]:
    logger.info("Tushare daily: %s %s-%s", symbol, start, end)
    return _stub_daily(symbol)


def fetch_minute(symbol: str, freq: str = "1m", start: str = "", end: str = "") -> list[dict]:
    logger.info("Tushare minute: %s freq=%s %s-%s", symbol, freq, start, end)
    return _stub_minute(symbol)


def fetch_fundamentals(symbol: str, start: str = "", end: str = "") -> list[dict]:
    logger.info("Tushare fundamentals: %s %s-%s", symbol, start, end)
    return _stub_fundamentals(symbol)


def fetch_financial_statements(symbol: str, statement_type: str = "income") -> list[dict]:
    logger.info("Tushare financial statement: %s type=%s", symbol, statement_type)
    return _stub_financials(symbol, statement_type)


def _stub_daily(symbol: str) -> list[dict]:
    import time
    from random import uniform
    now = int(time.time())
    bars = []
    price = 100.0
    for i in range(30):
        t = now - (30 - i) * 86400
        change = uniform(-3, 3)
        o = price
        c = price + change
        h = max(o, c) + abs(uniform(0, 1))
        l = min(o, c) - abs(uniform(0, 1))
        v = int(uniform(500000, 10000000))
        bars.append({
            "time": t, "open": round(o, 2), "high": round(h, 2),
            "low": round(l, 2), "close": round(c, 2), "volume": v,
        })
        price = c
    return bars


def _stub_minute(symbol: str) -> list[dict]:
    import time
    from random import uniform
    now = int(time.time())
    bars = []
    price = 100.0
    for i in range(240):
        t = now - (240 - i) * 60
        change = uniform(-0.5, 0.5)
        o = price
        c = price + change
        h = max(o, c) + abs(uniform(0, 0.2))
        l = min(o, c) - abs(uniform(0, 0.2))
        v = int(uniform(10000, 500000))
        bars.append({
            "time": t, "open": round(o, 2), "high": round(h, 2),
            "low": round(l, 2), "close": round(c, 2), "volume": v,
        })
        price = c
    return bars


def _stub_fundamentals(symbol: str) -> list[dict]:
    from random import uniform
    return [{
        "symbol": symbol,
        "pe": round(uniform(5, 50), 2),
        "pb": round(uniform(0.5, 5), 2),
        "roe": round(uniform(-10, 30), 2),
        "eps": round(uniform(-0.5, 5), 2),
        "bvps": round(uniform(2, 30), 2),
        "revenue_growth": round(uniform(-20, 40), 1),
        "profit_growth": round(uniform(-30, 50), 1),
    }]


def _stub_financials(symbol: str, statement_type: str) -> list[dict]:
    from random import uniform
    return [{
        "symbol": symbol,
        "type": statement_type,
        "total_revenue": round(uniform(1e8, 1e11), 2),
        "net_profit": round(uniform(-1e7, 1e10), 2),
        "total_assets": round(uniform(1e9, 1e12), 2),
        "total_liabilities": round(uniform(5e8, 8e11), 2),
        "fiscal_year": 2025,
    }]
