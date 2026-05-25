"""Benchmark ticker resolution and fetch for backtest comparison.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

MARKET_BENCHMARKS: dict[str, Optional[str]] = {
    "us_equity":  "SPY",
    "hk_equity":  "HK.03100",
    "a_share":    "000300.SH",
    "crypto":     "BTC-USDT",
    "futures":    "ES.CME",
    "forex":      None,
}


@dataclass
class BenchmarkResult:
    ticker:     str
    ret_series: pd.Series
    total_ret: float


def resolve_benchmark(
    strategy_codes: list[str],
    source:       str,
    start_date:   str,
    end_date:     str,
    interval:     str = "1D",
    explicit:     Optional[str] = None,
) -> Optional[BenchmarkResult]:
    ticker = _resolve_ticker(strategy_codes, source, explicit)
    if ticker is None:
        return None

    try:
        bench_df = _fetch_benchmark(ticker, start_date, end_date, interval)
    except Exception as e:
        logger.warning("Failed to fetch benchmark %s: %s", ticker, e)
        return None

    if bench_df.empty or "close" not in bench_df.columns:
        return None

    close = bench_df["close"].dropna()
    if len(close) < 2:
        return None

    ret_series = close.pct_change().fillna(0.0)
    total_ret   = float((1 + ret_series).prod() - 1)

    return BenchmarkResult(ticker=ticker, ret_series=ret_series, total_ret=total_ret)


def _resolve_ticker(
    codes:     list[str],
    source:    str,
    explicit:  Optional[str],
) -> Optional[str]:
    if explicit:
        return explicit
    market = _infer_market(codes, source)
    return MARKET_BENCHMARKS.get(market)


def _infer_market(codes: list[str], source: str) -> str:
    if not codes:
        return "us_equity"

    first = codes[0].upper()

    if source in ("okx", "ccxt") or "-" in first or "/" in first:
        return "crypto"
    if first.endswith(".US"):
        return "us_equity"
    if first.endswith(".HK"):
        return "hk_equity"
    if source in ("tushare", "akshare"):
        if first.isdigit() and len(first) == 6:
            return "a_share"
        if first.startswith(("IF", "IC", "IH", "IM", "T", "TF")):
            return "futures"
        return "a_share"
    return "us_equity"


def _fetch_benchmark(
    ticker:    str,
    start_date: str,
    end_date:   str,
    interval:   str,
) -> pd.DataFrame:
    """Fetch benchmark OHLCV via yfinance."""
    try:
        import yfinance as yf
    except ImportError:
        return pd.DataFrame()

    try:
        df = yf.download(ticker, start=start_date, end=end_date, interval=interval, progress=False, auto_adjust=True)
    except Exception as e:
        logger.warning("yfinance download failed for benchmark %s: %s", ticker, e)
        return pd.DataFrame()

    if df.empty:
        return pd.DataFrame()

    df.columns = [col[0].lower() if isinstance(col, tuple) else col.lower() for col in df.columns]
    if "close" in df.columns:
        return df.reset_index(drop=False).rename(columns={"index": "date"}).set_index("date")
    return df
