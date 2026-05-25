from __future__ import annotations

import logging
from datetime import datetime, timedelta

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.chart_cache import get_chart_cache_key, get_chart_html, set_chart_html

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chart", tags=["chart-technical"])


def _fetch_data(symbol: str, interval: str, period_days: int, provider: str) -> pd.DataFrame | None:
    try:
        from openbb import obb
        btc = obb.crypto.price.historical(
            symbol=symbol, provider=provider,
            interval=interval,
            start_date=(datetime.now() - timedelta(days=period_days)).strftime("%Y-%m-%d"),
        ).to_df()
        return btc
    except Exception as e:
        logger.warning("openbb failed for %s: %s", symbol, e)

    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        period = f"{period_days}d"
        interval_map = {"1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "60m", "1d": "1d"}
        yf_interval = interval_map.get(interval, "15m")
        df = ticker.history(period=period, interval=yf_interval)
        if df.empty:
            return None
        df.columns = [c.lower() for c in df.columns]
        df.index.name = "date"
        return df
    except ImportError:
        logger.warning("yfinance not available")
        return None


class TARequest(BaseModel):
    symbol: str
    interval: str = "1d"
    period_days: int = 50
    provider: str = "yfinance"
    indicators: dict = {}


@router.post("/ta")
async def get_technical_analysis(request: TARequest):
    df = _fetch_data(request.symbol, request.interval, request.period_days, request.provider)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {request.symbol}")

    from charting import to_chart

    try:
        fig, json_content = to_chart(
            data=df,
            indicators=request.indicators if request.indicators else None,
            symbol=request.symbol,
            candles=True,
            volume=True,
        )

        return {
            "figure_json": fig.to_plotly_json(),
            "symbol": request.symbol,
        }
    except Exception as e:
        logger.exception("Error generating TA chart")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ta/{symbol}")
async def get_technical_analysis_get(
    symbol: str,
    interval: str = Query("1d"),
    period_days: int = Query(50),
    provider: str = Query("yfinance"),
    indicators: str = Query("{}"),
):
    try:
        ind_dict = json.loads(indicators)
    except json.JSONDecodeError:
        ind_dict = {}
    df = _fetch_data(symbol, interval, period_days, provider)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

    from charting import to_chart

    try:
        fig, json_content = to_chart(
            data=df,
            indicators=ind_dict if ind_dict else None,
            symbol=symbol,
            candles=True,
            volume=True,
        )
        return {
            "figure_json": fig.to_plotly_json(),
            "symbol": symbol,
        }
    except Exception as e:
        logger.exception("Error generating TA chart")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ta/available-indicators")
async def get_available_indicators():
    from charting.core.plotly_ta.data_classes import ChartIndicators

    available = ChartIndicators.get_available_indicators()

    indicator_info = {
        "sma": {"name": "Simple Moving Average", "params": {"length": [20, 50, 100]}, "category": "overlap"},
        "ema": {"name": "Exponential Moving Average", "params": {"length": [20, 50]}, "category": "overlap"},
        "wma": {"name": "Weighted Moving Average", "params": {"length": [20]}, "category": "overlap"},
        "hma": {"name": "Hull Moving Average", "params": {"length": [20]}, "category": "overlap"},
        "rsi": {"name": "Relative Strength Index", "params": {"length": 14}, "category": "momentum"},
        "macd": {"name": "MACD", "params": {"fast": 12, "slow": 26, "signal": 9}, "category": "momentum"},
        "stoch": {"name": "Stochastic Oscillator", "params": {"kPeriod": 14, "dPeriod": 3}, "category": "momentum"},
        "cci": {"name": "Commodity Channel Index", "params": {"length": 20}, "category": "momentum"},
        "fisher": {"name": "Fisher Transform", "params": {"length": 9}, "category": "momentum"},
        "cg": {"name": "Center of Gravity", "params": {"length": 10}, "category": "momentum"},
        "adx": {"name": "Average Directional Index", "params": {"length": 14}, "category": "trend"},
        "aroon": {"name": "Aroon", "params": {"length": 25}, "category": "trend"},
        "atr": {"name": "Average True Range", "params": {"length": 14}, "category": "volatility"},
        "bbands": {"name": "Bollinger Bands", "params": {"length": 20, "std": 2}, "category": "volatility"},
        "donchian": {"name": "Donchian Channels", "params": {"length": 20}, "category": "volatility"},
        "kc": {"name": "Keltner Channels", "params": {"length": 20}, "category": "volatility"},
        "ad": {"name": "Accumulation/Distribution", "params": {}, "category": "volume"},
        "adosc": {"name": "Chaikin A/D Oscillator", "params": {}, "category": "volume"},
        "obv": {"name": "On-Balance Volume", "params": {}, "category": "volume"},
        "vwap": {"name": "Volume Weighted Average Price", "params": {}, "category": "overlap"},
        "srlines": {"name": "Support/Resistance Lines", "params": {"window": 200}, "category": "custom"},
        "fib": {"name": "Fibonacci Levels", "params": {"limit": 120}, "category": "custom"},
    }
    return {
        "indicators": {k: v for k, v in indicator_info.items() if k in available},
        "categories": ["overlap", "momentum", "trend", "volatility", "volume", "custom"],
    }
