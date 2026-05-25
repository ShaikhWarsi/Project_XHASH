from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import yfinance as yf

from .evaluator import ConditionGroup


@dataclass
class ScanResult:
    symbol: str
    matched: bool
    timestamp: datetime = field(default_factory=datetime.utcnow)
    details: Optional[dict] = None


@dataclass
class ScanRequest:
    symbols: list[str]
    condition_group: ConditionGroup
    timeframe: str = "1d"
    lookback: int = 100
    source: str = "yfinance"


class Scanner:
    def __init__(self):
        self._cache: dict[str, pd.DataFrame] = {}

    def scan(self, request: ScanRequest) -> list[ScanResult]:
        results: list[ScanResult] = []
        for symbol in request.symbols:
            df = self._fetch_data(symbol, request.timeframe, request.lookback)
            if df is None or len(df) < 30:
                results.append(ScanResult(symbol=symbol, matched=False, details={"error": "insufficient data"}))
                continue
            matched = request.condition_group.evaluate(df)
            results.append(ScanResult(
                symbol=symbol, matched=matched,
                details={"price": float(df["close"].iloc[-1]),
                         "timestamp": str(df.index[-1])},
            ))
        return results

    def scan_single(self, symbol: str, condition_group: ConditionGroup,
                    timeframe: str = "1d", lookback: int = 100) -> ScanResult:
        return self.scan(ScanRequest([symbol], condition_group, timeframe, lookback))[0]

    def _fetch_data(self, symbol: str, timeframe: str, lookback: int) -> Optional[pd.DataFrame]:
        cache_key = f"{symbol}_{timeframe}_{lookback}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        try:
            period = f"{max(lookback, 30)}d"
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=timeframe)
            if df.empty:
                return None
            df.columns = [c.lower() for c in df.columns]
            df = df.rename(columns={"dividends": "dividend", "stock splits": "split"})
            df = df.drop(columns=["dividend", "split"], errors="ignore")
            self._cache[cache_key] = df
            return df
        except Exception:
            return None

    def clear_cache(self):
        self._cache.clear()
