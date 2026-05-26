from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/screener", tags=["screener"])


SCREENER_PRESETS: dict[str, dict[str, Any]] = {
    "oversold_rsi": {
        "name": "Oversold Bounce",
        "description": "Stocks with RSI < 30 and positive volume",
        "filters": {"rsi_max": 30, "volume_min": 500000, "price_min": 5},
    },
    "overbought_rsi": {
        "name": "Overbought Momentum",
        "description": "Stocks with RSI > 70 and strong volume",
        "filters": {"rsi_min": 70, "volume_min": 1000000, "price_min": 10},
    },
    "golden_cross": {
        "name": "Golden Cross",
        "description": "50-day SMA crossing above 200-day SMA",
        "filters": {"sma_50_above_sma_200": True, "volume_min": 500000},
    },
    "high_volume": {
        "name": "High Volume Surge",
        "description": "Volume > 2x average with price gain",
        "filters": {"volume_ratio_min": 2.0, "change_pct_min": 2},
    },
    "breakout": {
        "name": "52-Week Breakout",
        "description": "Near 52-week high with expanding volume",
        "filters": {"near_52w_high_pct": 5, "volume_ratio_min": 1.5},
    },
    "bullish_macd": {
        "name": "Bullish MACD Cross",
        "description": "MACD line crossing above signal line",
        "filters": {"macd_bullish_cross": True, "volume_min": 500000},
    },
}


def _fetch_screener_data(symbol: str) -> pd.DataFrame | None:
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        df = ticker.history(period="1y")
        if df.empty:
            return None
        df.columns = [c.lower() for c in df.columns]
        return df
    except ImportError:
        logger.warning("yfinance not available")
        return None


def _compute_indicators(df: pd.DataFrame) -> dict[str, Any]:
    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]

    result: dict[str, Any] = {}

    # RSI
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(span=14, adjust=False).mean()
    avg_loss = loss.ewm(span=14, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, 1e-10)
    rsi = 100 - (100 / (1 + rs))
    result["rsi"] = round(rsi.iloc[-1], 2) if not rsi.empty else None

    # SMA cross
    sma_50 = close.rolling(50).mean()
    sma_200 = close.rolling(200).mean()
    result["sma_50"] = round(sma_50.iloc[-1], 2) if not sma_50.empty else None
    result["sma_200"] = round(sma_200.iloc[-1], 2) if not sma_200.empty else None
    result["golden_cross"] = bool(
        not sma_50.empty and not sma_200.empty
        and sma_50.iloc[-1] > sma_200.iloc[-1]
        and len(sma_50.dropna()) > 1 and len(sma_200.dropna()) > 1
        and sma_50.iloc[-2] <= sma_200.iloc[-2]
    ) if len(sma_50.dropna()) > 1 and len(sma_200.dropna()) > 1 else False

    # MACD
    ema_fast = close.ewm(span=12, adjust=False).mean()
    ema_slow = close.ewm(span=26, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - signal_line
    result["macd"] = round(macd_line.iloc[-1], 4) if not macd_line.empty else None
    result["macd_signal"] = round(signal_line.iloc[-1], 4) if not signal_line.empty else None
    result["macd_bullish_cross"] = bool(
        not macd_hist.empty and len(macd_hist.dropna()) > 1
        and macd_hist.iloc[-1] > 0 and macd_hist.iloc[-2] <= 0
    ) if len(macd_hist.dropna()) > 1 else False

    # Volume
    result["volume"] = int(volume.iloc[-1]) if not volume.empty else 0
    avg_volume = volume.rolling(20).mean()
    result["avg_volume"] = int(avg_volume.iloc[-1]) if not avg_volume.empty else 0
    result["volume_ratio"] = round(result["volume"] / result["avg_volume"], 2) if result["avg_volume"] > 0 else 0

    # Price
    result["close"] = round(close.iloc[-1], 2) if not close.empty else None
    result["change_pct"] = round(((close.iloc[-1] - close.iloc[-2]) / close.iloc[-2]) * 100, 2) if len(close) > 1 else 0
    result["high_52w"] = round(close.max(), 2) if not close.empty else None
    result["near_52w_high_pct"] = round((close.max() - close.iloc[-1]) / close.max() * 100, 2) if not close.empty else None

    # Bollinger
    bb_mid = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    bb_upper = bb_mid + 2 * bb_std
    bb_lower = bb_mid - 2 * bb_std
    result["bb_upper"] = round(bb_upper.iloc[-1], 2) if not bb_upper.empty else None
    result["bb_lower"] = round(bb_lower.iloc[-1], 2) if not bb_lower.empty else None
    result["bb_width"] = round(((bb_upper - bb_lower) / bb_mid * 100).iloc[-1], 2) if not bb_upper.empty else None

    return result


def _matches_filters(metrics: dict[str, Any], filters: dict[str, Any]) -> tuple[bool, str]:
    for key, value in filters.items():
        if key == "rsi_max":
            if metrics.get("rsi") is not None and metrics["rsi"] >= value:
                return False, f"RSI {metrics['rsi']} >= {value}"
        elif key == "rsi_min":
            if metrics.get("rsi") is not None and metrics["rsi"] <= value:
                return False, f"RSI {metrics['rsi']} <= {value}"
        elif key == "volume_min":
            if metrics.get("volume", 0) < value:
                return False, f"Volume {metrics['volume']} < {value}"
        elif key == "price_min":
            if metrics.get("close") is not None and metrics["close"] < value:
                return False, f"Price {metrics['close']} < {value}"
        elif key == "volume_ratio_min":
            if metrics.get("volume_ratio", 0) < value:
                return False, f"Volume ratio {metrics['volume_ratio']} < {value}"
        elif key == "change_pct_min":
            if metrics.get("change_pct", 0) < value:
                return False, f"Change {metrics['change_pct']}% < {value}%"
        elif key == "near_52w_high_pct":
            if metrics.get("near_52w_high_pct") is not None and metrics["near_52w_high_pct"] > value:
                return False, f"Distance from 52w high {metrics['near_52w_high_pct']}% > {value}%"
        elif key == "sma_50_above_sma_200":
            sma50 = metrics.get("sma_50")
            sma200 = metrics.get("sma_200")
            if sma50 is None or sma200 is None or sma50 <= sma200:
                return False, "SMA 50 not above SMA 200"
        elif key == "macd_bullish_cross":
            if not metrics.get("macd_bullish_cross", False):
                return False, "No bullish MACD cross"
    return True, ""


@router.get("/presets")
async def get_screener_presets():
    return {
        "presets": {k: {"name": v["name"], "description": v["description"], "filters": v["filters"]} for k, v in SCREENER_PRESETS.items()}
    }


@router.get("/scan")
async def scan_symbols(
    symbols: str = Query(..., description="Comma-separated symbols"),
    preset: str | None = Query(None, description="Preset name"),
    rsi_min: float | None = Query(None),
    rsi_max: float | None = Query(None),
    volume_min: int | None = Query(None),
    price_min: float | None = Query(None),
    volume_ratio_min: float | None = Query(None),
    change_pct_min: float | None = Query(None),
    golden_cross: bool | None = Query(None),
    macd_bullish: bool | None = Query(None),
):
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        raise HTTPException(status_code=400, detail="No symbols provided")

    filters: dict[str, Any] = {}
    if preset and preset in SCREENER_PRESETS:
        filters.update(SCREENER_PRESETS[preset]["filters"])
    if rsi_min is not None: filters["rsi_min"] = rsi_min
    if rsi_max is not None: filters["rsi_max"] = rsi_max
    if volume_min is not None: filters["volume_min"] = volume_min
    if price_min is not None: filters["price_min"] = price_min
    if volume_ratio_min is not None: filters["volume_ratio_min"] = volume_ratio_min
    if change_pct_min is not None: filters["change_pct_min"] = change_pct_min
    if golden_cross: filters["sma_50_above_sma_200"] = True
    if macd_bullish: filters["macd_bullish_cross"] = True

    results: list[dict[str, Any]] = []
    errors: list[str] = []

    for symbol in symbol_list:
        try:
            df = _fetch_screener_data(symbol)
            if df is None or df.empty:
                errors.append(f"No data for {symbol}")
                continue

            metrics = _compute_indicators(df)
            if not filters:
                results.append({"symbol": symbol, **metrics})
            else:
                matches, reason = _matches_filters(metrics, filters)
                results.append({"symbol": symbol, **metrics, "match": matches, "reason": reason})
        except Exception as e:
            errors.append(f"Error processing {symbol}: {str(e)}")

    results.sort(key=lambda r: (r.get("match", True) is True, abs(r.get("change_pct", 0) or 0)), reverse=True)

    return {
        "results": results,
        "total": len(results),
        "matches": sum(1 for r in results if r.get("match", True)),
        "errors": errors,
        "filters_applied": filters,
    }


@router.get("/preset/{preset_name}")
async def scan_with_preset(preset_name: str, symbols: str = Query("AAPL,MSFT,GOOGL,AMZN,TSLA,META,NVDA")):
    if preset_name not in SCREENER_PRESETS:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_name}' not found")
    return await scan_symbols(symbols=symbols, preset=preset_name)
