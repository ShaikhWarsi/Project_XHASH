from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/bars", tags=["bars"])

_RANGE_MAP = {
    "1d": timedelta(days=1),
    "5d": timedelta(days=5),
    "1mo": timedelta(days=30),
    "3mo": timedelta(days=90),
    "6mo": timedelta(days=180),
    "1y": timedelta(days=365),
    "2y": timedelta(days=730),
    "5y": timedelta(days=1825),
    "max": None,
}

_VALID_INTERVALS = {"1m", "2m", "5m", "15m", "30m", "60m", "1h", "1d", "1wk", "1mo"}


@router.get("/{symbol}")
async def get_bars(
    symbol: str,
    interval: str = Query("1d"),
    range: str = Query("1mo"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    interval = interval if interval in _VALID_INTERVALS else "1d"
    if start_date:
        start = start_date
    else:
        range = range if range in _RANGE_MAP else "1mo"
        period_delta = _RANGE_MAP[range]
        start = None if period_delta is None else (datetime.now() - period_delta).strftime("%Y-%m-%d")

    yf_interval = interval
    if interval == "1h":
        yf_interval = "60m"

    try:
        df = yf.download(symbol, start=start, end=end_date, interval=yf_interval, progress=False, auto_adjust=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Data provider failed for {symbol}: {e}")

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

    expected = {"open", "high", "low", "close", "volume"}
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0].lower() for c in df.columns]
    else:
        df.columns = [c.lower() for c in df.columns]
    missing = expected - set(df.columns)
    if missing:
        raise HTTPException(status_code=502, detail=f"Unexpected data format for {symbol}: missing columns {missing}")
    df = df[list(expected)]

    bars = []
    seen = set()
    for idx, row in df.iterrows():
        ts = int(idx.timestamp())
        if ts in seen:
            continue
        seen.add(ts)
        bars.append({
            "time": ts,
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
        })
    bars.sort(key=lambda b: b["time"])
    return bars
