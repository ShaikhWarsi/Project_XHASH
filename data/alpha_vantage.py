from __future__ import annotations

import logging
import time
from typing import Any, Optional

import pandas as pd

logger = logging.getLogger(__name__)

_VALID_PREFIXES: tuple[str, ...] = (
    "AV",
    "av",
    "demo",
)
_MIN_REQUEST_INTERVAL: float = 12.0


def validate_api_key(api_key: str) -> bool:
    """Check that the API key starts with an expected prefix."""
    if not api_key or not isinstance(api_key, str):
        return False
    if api_key.startswith(_VALID_PREFIXES):
        return True
    logger.warning("Alpha Vantage API key '%s...' does not match expected prefix", api_key[:4])
    return False


class AlphaVantageProvider:
    """Alpha Vantage data provider with API key validation and rate limiting."""

    def __init__(self, api_key: str):
        if not validate_api_key(api_key):
            raise ValueError(f"Invalid Alpha Vantage API key format")
        self._api_key = api_key
        self._last_request: float = 0.0

    def _rate_limit(self):
        elapsed = time.time() - self._last_request
        if elapsed < _MIN_REQUEST_INTERVAL:
            time.sleep(_MIN_REQUEST_INTERVAL - elapsed)
        self._last_request = time.time()

    def fetch(
        self,
        symbol: str,
        function: str = "TIME_SERIES_DAILY",
    ) -> Optional[pd.DataFrame]:
        self._rate_limit()
        try:
            from alpha_vantage.timeseries import TimeSeries
            ts = TimeSeries(key=self._api_key, output_format="pandas")
            data, meta = ts.get_daily(symbol=symbol, outputsize="full")
            if data is not None and not data.empty:
                data.columns = [c.lower().split(". ")[-1] for c in data.columns]
            return data
        except Exception as e:
            logger.warning("Alpha Vantage fetch failed for %s: %s", symbol, e)
            return None
