from __future__ import annotations

import asyncio
import logging
from typing import Optional

import yfinance as yf

logger = logging.getLogger(__name__)

_sector_cache: dict[str, str] = {}
_cache_lock = asyncio.Lock()

_SECTOR_COLORS: dict[str, str] = {
    "Technology": "#22c55e",
    "Financial Services": "#3b82f6",
    "Healthcare": "#ef4444",
    "Energy": "#f59e0b",
    "Consumer Cyclical": "#8b5cf6",
    "Consumer Defensive": "#06b6d4",
    "Industrials": "#f97316",
    "Basic Materials": "#84cc16",
    "Real Estate": "#ec4899",
    "Utilities": "#14b8a6",
    "Communication Services": "#6366f1",
    "Unknown": "#6b7280",
}

_SYMBOL_SECTOR_OVERRIDES: dict[str, str] = {
    "SPY": "Technology",
    "QQQ": "Technology",
    "DIA": "Financial Services",
    "IWM": "Financial Services",
    "BTC-USD": "Technology",
    "ETH-USD": "Technology",
}


def _lookup_sector(symbol: str) -> str:
    lower = symbol.upper()
    if lower in _SYMBOL_SECTOR_OVERRIDES:
        return _SYMBOL_SECTOR_OVERRIDES[lower]
    try:
        ticker = yf.Ticker(lower)
        info = ticker.info
        if not info:
            return "Unknown"
        sector = info.get("sector") or info.get("industry") or "Unknown"
        return sector
    except Exception as e:
        logger.debug("Failed to get sector for symbol: %s", e)
        return "Unknown"


async def get_sector(symbol: str) -> str:
    async with _cache_lock:
        if symbol not in _sector_cache:
            _sector_cache[symbol] = await asyncio.to_thread(_lookup_sector, symbol)
        return _sector_cache[symbol]


async def get_sector_exposures(positions: dict) -> list[dict]:
    sector_values: dict[str, float] = {}
    for symbol, pos in positions.items():
        mv = pos.get("market_value", 0) if isinstance(pos, dict) else getattr(pos, "market_value", 0)
        sector = await get_sector(symbol)
        sector_values[sector] = sector_values.get(sector, 0) + mv
    if not sector_values:
        return []
    total = sum(sector_values.values())
    return [
        {
            "sector": sector,
            "exposure": value,
            "exposurePercent": round(value / total * 100, 1) if total else 0,
            "return": 0.0,
            "color": _SECTOR_COLORS.get(sector, "#6b7280"),
        }
        for sector, value in sorted(sector_values.items(), key=lambda x: -x[1])
    ]
