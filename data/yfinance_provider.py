from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Optional

import pandas as pd

logger = logging.getLogger(__name__)

_MIN_REQUEST_INTERVAL: float = 0.5


class YFinanceProvider:
    """Yahoo Finance data provider with rate limiting between API calls."""

    def __init__(self):
        self._last_request: float = 0.0

    def _rate_limit(self):
        elapsed = time.time() - self._last_request
        if elapsed < _MIN_REQUEST_INTERVAL:
            time.sleep(_MIN_REQUEST_INTERVAL - elapsed)
        self._last_request = time.time()

    def fetch(
        self,
        symbol: str,
        interval: str = "1d",
        period: str = "1y",
        auto_adjust: bool = True,
    ) -> Optional[pd.DataFrame]:
        self._rate_limit()
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            df = ticker.history(interval=interval, period=period, auto_adjust=auto_adjust)
            if df.empty:
                logger.warning("yfinance returned empty data for %s", symbol)
                return None
            df.columns = [c.lower() for c in df.columns]
            return df
        except Exception as e:
            logger.warning("yfinance fetch failed for %s: %s", symbol, e)
            return None

    def fetch_bars(
        self,
        symbol: str,
        timeframe: str = "1d",
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        auto_adjust: bool = True,
    ) -> Optional[pd.DataFrame]:
        self._rate_limit()
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            if start and end:
                df = ticker.history(interval=timeframe, start=start.strftime("%Y-%m-%d"), end=end.strftime("%Y-%m-%d"), auto_adjust=auto_adjust)
            else:
                df = ticker.history(interval=timeframe, auto_adjust=auto_adjust)
            if df is None or df.empty:
                logger.warning("yfinance returned empty data for %s", symbol)
                return None
            df.columns = [c.lower() for c in df.columns]
            return df
        except Exception as e:
            logger.warning("yfinance fetch_bars failed for %s: %s", symbol, e)
            return None

    def fetch_multi(
        self,
        symbols: list[str],
        interval: str = "1d",
        period: str = "1y",
        auto_adjust: bool = True,
    ) -> dict[str, Optional[pd.DataFrame]]:
        result: dict[str, Optional[pd.DataFrame]] = {}
        for sym in symbols:
            result[sym] = self.fetch(sym, interval=interval, period=period, auto_adjust=auto_adjust)
        return result
