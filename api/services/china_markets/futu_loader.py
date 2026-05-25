from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

FUTU_SYMBOL_MAP = {
    "HK": {"prefix": "HK.", "suffix": ""},
    "SZ": {"prefix": "SZ.", "suffix": ""},
    "SH": {"prefix": "SH.", "suffix": ""},
}

INTERVAL_MAP = {
    "1d": "1D",
    "1h": "1H",
    "4h": "4H",
    "1wk": "1W",
    "1mo": "1M",
}


def convert_symbol(symbol: str) -> dict:
    symbol = symbol.upper().strip()
    if symbol.endswith(".HK"):
        code = symbol.replace(".HK", "")
        return {"market": "hk_equity", "futu_symbol": f"HK.{code.zfill(5)}", "original": symbol}
    if symbol.endswith(".SZ"):
        code = symbol.replace(".SZ", "")
        return {"market": "a_share", "futu_symbol": f"SZ.{code}", "original": symbol}
    if symbol.endswith(".SH"):
        code = symbol.replace(".SH", "")
        return {"market": "a_share", "futu_symbol": f"SH.{code}", "original": symbol}
    return {"market": "unknown", "futu_symbol": symbol, "original": symbol}


def fetch_ohlcv(symbol: str, interval: str = "1d", count: int = 500) -> list[dict]:
    converted = convert_symbol(symbol)
    futu_interval = INTERVAL_MAP.get(interval, "1D")
    if converted["market"] == "unknown":
        logger.warning("Unknown market for symbol %s, using stub data", symbol)
        return _stub_data(symbol, count)
    logger.info(
        "Futu OHLCV: %s (%s) interval=%s count=%d",
        converted["futu_symbol"], converted["market"], futu_interval, count,
    )
    return _stub_data(symbol, count)


def _stub_data(symbol: str, count: int) -> list[dict]:
    import math
    import time
    from random import uniform
    now = int(time.time())
    bars = []
    price = 100.0
    for i in range(count):
        t = now - (count - i) * 86400
        change = uniform(-2, 2)
        o = price
        c = price + change
        h = max(o, c) + abs(uniform(0, 0.5))
        l = min(o, c) - abs(uniform(0, 0.5))
        v = int(uniform(100000, 5000000))
        bars.append({
            "time": t,
            "open": round(o, 2),
            "high": round(h, 2),
            "low": round(l, 2),
            "close": round(c, 2),
            "volume": v,
        })
        price = c
    return bars
