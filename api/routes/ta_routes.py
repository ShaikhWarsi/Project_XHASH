from __future__ import annotations

import json
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
    cache_key = get_chart_cache_key(
        request.symbol, interval=request.interval,
        period_days=request.period_days, indicators=str(sorted(request.indicators.items())),
    )
    cached = get_chart_html(cache_key)
    if cached:
        return json.loads(cached)

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

        response_data = {
            "figure_json": fig.to_plotly_json(),
            "symbol": request.symbol,
        }

        set_chart_html(cache_key, json.dumps(response_data))
        return response_data
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

    cache_key = get_chart_cache_key(
        symbol, interval=interval, period_days=period_days, indicators=str(sorted(ind_dict.items())),
    )
    cached = get_chart_html(cache_key)
    if cached:
        return json.loads(cached)

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
        response_data = {
            "figure_json": fig.to_plotly_json(),
            "symbol": symbol,
        }
        set_chart_html(cache_key, json.dumps(response_data))
        return response_data
    except Exception as e:
        logger.exception("Error generating TA chart")
        raise HTTPException(status_code=500, detail=str(e))


class IndicatorComputeRequest(BaseModel):
    symbol: str
    interval: str = "1d"
    period_days: int = 100
    indicators: dict = {}
    signals: bool = False


@router.post("/ta/compute")
async def compute_indicators(request: IndicatorComputeRequest):
    df = _fetch_data(request.symbol, request.interval, request.period_days, "yfinance")
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {request.symbol}")

    from charting.indicators import registry

    results = registry.compute_all(df, request.indicators)
    df_with_indicators = pd.concat([df] + list(results.values()), axis=1)

    serialized = {}
    for name, plugin_df in results.items():
        if plugin_df.empty:
            continue
        col = plugin_df.columns[0]
        last_val = plugin_df[col].iloc[-1] if col in plugin_df else None
        if isinstance(last_val, (int, float)):
            serialized[name] = round(float(last_val), 6) if pd.notna(last_val) else None
        elif isinstance(last_val, (pd.Series, pd.Index)):
            vals = [round(float(v), 6) if pd.notna(v) else None for v in last_val]
            serialized[name] = vals
        else:
            serialized[name] = float(last_val) if pd.notna(last_val) else None

    response = {
        "symbol": request.symbol,
        "indicators": serialized,
    }

    if request.signals:
        from charting.indicators import registry
        sigs = registry.generate_signals(df_with_indicators)
        response["signals"] = {
            plugin: [
                {"name": s.name, "value": str(s.value) if s.value is not None else None, "direction": s.direction, "strength": s.strength, "metadata": s.metadata}
                for s in sig_list
            ]
            for plugin, sig_list in sigs.items()
        }

    return response


@router.get("/ta/available-indicators")
async def get_available_indicators():
    from charting import get_available_indicator_params

    return {
        "indicators": get_available_indicator_params(),
        "categories": ["overlap", "momentum", "trend", "volatility", "volume", "custom"],
    }


@router.get("/ta/signals/{symbol}")
async def get_technical_signals(
    symbol: str,
    interval: str = Query("1d"),
    period_days: int = Query(100),
):
    df = _fetch_data(symbol, interval, period_days, "yfinance")
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")

    from charting.indicators import registry

    results = registry.compute_all(df, {
        "momentum": {"rsi_length": 14},
        "overlap": {"sma_lengths": [20, 50, 200]},
        "volatility": {"bb_length": 20, "bb_std": 2},
    })

    signals = registry.generate_signals(pd.concat([df] + list(results.values()), axis=1))

    return {
        "symbol": symbol,
        "signals": {
            plugin: [
                {"name": s.name, "value": str(s.value) if s.value is not None else None, "direction": s.direction, "strength": s.strength, "metadata": s.metadata}
                for s in sig_list
            ]
            for plugin, sig_list in signals.items()
        },
    }
