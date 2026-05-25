from __future__ import annotations

import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse
from plotly.subplots import make_subplots
from scipy.signal import find_peaks

from api.chart_cache import get_chart_cache_key, get_chart_html, set_chart_html

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chart", tags=["chart"])


def _fetch_data(symbol: str, interval: str, period_days: int, provider: str) -> pd.DataFrame | None:
    try:
        from openbb import obb

        btc = obb.crypto.price.historical(
            symbol=symbol,
            provider=provider,
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
        interval_map = {
            "1m": "1m",
            "5m": "5m",
            "15m": "15m",
            "30m": "30m",
            "1h": "60m",
            "1d": "1d",
        }
        yf_interval = interval_map.get(interval, "15m")
        df = ticker.history(period=period, interval=yf_interval)
        if df.empty:
            return None
        df.columns = [c.lower() for c in df.columns]
        df.index.name = "date"
        return df
    except ImportError:
        logger.warning("yfinance not available for chart data")
        return None


def _compute_indicators(btc: pd.DataFrame) -> dict:
    btc["SMA_20"] = btc["close"].rolling(20).mean()
    btc["SMA_50"] = btc["close"].rolling(50).mean()
    btc["SMA_200"] = btc["close"].rolling(200).mean()

    btc["BB_middle"] = btc["close"].rolling(20).mean()
    btc["BB_std"] = btc["close"].rolling(20).std()
    btc["BB_upper"] = btc["BB_middle"] + (btc["BB_std"] * 2)
    btc["BB_lower"] = btc["BB_middle"] - (btc["BB_std"] * 2)
    btc["BB_width"] = (btc["BB_upper"] - btc["BB_lower"]) / btc["BB_middle"]

    delta = btc["close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss
    btc["RSI"] = 100 - (100 / (1 + rs))

    exp1 = btc["close"].ewm(span=12).mean()
    exp2 = btc["close"].ewm(span=26).mean()
    btc["MACD"] = exp1 - exp2
    btc["MACD_signal"] = btc["MACD"].ewm(span=9).mean()
    btc["MACD_hist"] = btc["MACD"] - btc["MACD_signal"]

    btc["TR"] = np.maximum(
        btc["high"] - btc["low"],
        np.maximum(
            abs(btc["high"] - btc["close"].shift()),
            abs(btc["low"] - btc["close"].shift()),
        ),
    )
    btc["ATR"] = btc["TR"].rolling(14).mean()

    peaks_high, _ = find_peaks(btc["high"], distance=20, prominence=btc["high"].std())
    peaks_low, _ = find_peaks(-btc["low"], distance=20, prominence=btc["low"].std())

    resistance_levels = btc["high"].iloc[peaks_high].nlargest(3).values
    support_levels = btc["low"].iloc[peaks_low].nsmallest(3).values

    return {
        "resistance_levels": resistance_levels,
        "support_levels": support_levels,
    }


def _build_chart(btc: pd.DataFrame, symbol: str, levels: dict) -> go.Figure:
    fig = make_subplots(
        rows=5,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=[0.4, 0.15, 0.15, 0.15, 0.15],
        subplot_titles=(
            f"{symbol} Price Action with Bollinger Bands",
            "Volume",
            "RSI",
            "MACD",
            "ATR (Volatility)",
        ),
    )

    fig.add_trace(
        go.Candlestick(
            x=btc.index,
            open=btc["open"],
            high=btc["high"],
            low=btc["low"],
            close=btc["close"],
            name=symbol,
            increasing_line_color="#00ff41",
            decreasing_line_color="#ff4444",
        ),
        row=1,
        col=1,
    )

    fig.add_trace(
        go.Scatter(x=btc.index, y=btc["SMA_20"], name="SMA 20", line=dict(color="cyan", width=1)),
        row=1,
        col=1,
    )
    fig.add_trace(
        go.Scatter(x=btc.index, y=btc["SMA_50"], name="SMA 50", line=dict(color="yellow", width=1)),
        row=1,
        col=1,
    )
    fig.add_trace(
        go.Scatter(x=btc.index, y=btc["SMA_200"], name="SMA 200", line=dict(color="red", width=2)),
        row=1,
        col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=btc.index,
            y=btc["BB_upper"],
            name="BB Upper",
            line=dict(color="gray", dash="dash", width=1),
        ),
        row=1,
        col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=btc.index,
            y=btc["BB_lower"],
            name="BB Lower",
            line=dict(color="gray", dash="dash", width=1),
            fill="tonexty",
            fillcolor="rgba(128,128,128,0.1)",
        ),
        row=1,
        col=1,
    )

    for level in levels["resistance_levels"]:
        fig.add_hline(y=level, line_dash="dot", line_color="red", opacity=0.5, row=1, col=1)
    for level in levels["support_levels"]:
        fig.add_hline(y=level, line_dash="dot", line_color="green", opacity=0.5, row=1, col=1)

    fig.add_trace(
        go.Bar(x=btc.index, y=btc["volume"], name="Volume", marker_color="rgba(255,165,0,0.5)"),
        row=2,
        col=1,
    )

    fig.add_trace(
        go.Scatter(x=btc.index, y=btc["RSI"], name="RSI", line=dict(color="orange", width=2)),
        row=3,
        col=1,
    )
    fig.add_hline(y=70, line_dash="dash", line_color="red", opacity=0.5, row=3, col=1)
    fig.add_hline(y=30, line_dash="dash", line_color="green", opacity=0.5, row=3, col=1)

    fig.add_trace(
        go.Scatter(x=btc.index, y=btc["MACD"], name="MACD", line=dict(color="blue", width=1.5)),
        row=4,
        col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=btc.index, y=btc["MACD_signal"], name="Signal", line=dict(color="red", width=1.5)
        ),
        row=4,
        col=1,
    )
    fig.add_trace(
        go.Bar(x=btc.index, y=btc["MACD_hist"], name="Histogram", marker_color="gray"),
        row=4,
        col=1,
    )

    fig.add_trace(
        go.Scatter(
            x=btc.index,
            y=btc["ATR"],
            name="ATR",
            line=dict(color="purple", width=2),
            fill="tozeroy",
        ),
        row=5,
        col=1,
    )

    fig.update_layout(
        title=f"{symbol} Complete Technical Analysis Dashboard",
        template="plotly_dark",
        height=1400,
        showlegend=True,
        xaxis_rangeslider_visible=False,
    )

    fig.update_yaxes(title_text="Price (USD)", row=1, col=1)
    fig.update_yaxes(title_text="Volume", row=2, col=1)
    fig.update_yaxes(title_text="RSI", row=3, col=1)
    fig.update_yaxes(title_text="MACD", row=4, col=1)
    fig.update_yaxes(title_text="ATR", row=5, col=1)

    return fig


@router.get("/{symbol}")
async def get_chart(
    symbol: str,
    interval: str = Query("15m"),
    period_days: int = Query(50),
    provider: str = Query("yfinance"),
):
    cache_key = get_chart_cache_key(symbol, interval=interval, period=period_days, provider=provider)
    cached = get_chart_html(cache_key)
    if cached:
        from fastapi.responses import HTMLResponse
        return HTMLResponse(cached)

    btc = _fetch_data(symbol, interval, period_days, provider)
    if btc is None or btc.empty:
        return {"error": f"No data found for {symbol}"}

    levels = _compute_indicators(btc)
    fig = _build_chart(btc, symbol, levels)

    html = fig.to_html(full_html=False, include_plotlyjs="cdn")
    set_chart_html(cache_key, html)
    return HTMLResponse(html)
