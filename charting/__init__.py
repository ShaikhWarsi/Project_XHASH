from __future__ import annotations

import logging
from typing import Any

import pandas as pd
from openbb_charting.core.openbb_figure import OpenBBFigure
from openbb_charting.core.plotly_ta.data_classes import (
    ChartIndicators,
    TAIndicator,
    Arguments,
)
from openbb_charting.core.plotly_ta.ta_class import PlotlyTA

from charting.chart_style import ChartStyle

logger = logging.getLogger(__name__)


def to_chart(
    data: pd.DataFrame,
    indicators: dict[str, dict[str, Any]] | ChartIndicators | None = None,
    symbol: str = "",
    candles: bool = True,
    volume: bool = True,
    prepost: bool = False,
    volume_ticks_x: int = 7,
    theme: str | None = None,
) -> tuple[OpenBBFigure, dict]:
    if isinstance(indicators, dict) and indicators:
        indicators = ChartIndicators.from_dict(indicators)

    pta = PlotlyTA()
    if theme:
        ChartStyle(plt_style=theme)

    fig = pta.plot(
        data,
        indicators=indicators,
        symbol=symbol,
        candles=candles,
        volume=volume,
        prepost=prepost,
        volume_ticks_x=volume_ticks_x,
    )
    return fig, fig.to_plotly_json()


def compute_indicators(
    data: pd.DataFrame,
    indicators: dict[str, dict[str, Any]] | ChartIndicators,
) -> pd.DataFrame:
    if isinstance(indicators, dict):
        indicators = ChartIndicators.from_dict(indicators)
    return indicators.to_dataframe(data)


def build_indicator_config(
    sma_lengths: list[int] | None = None,
    ema_lengths: list[int] | None = None,
    rsi_length: int | None = None,
    macd_fast: int | None = None,
    macd_slow: int | None = None,
    macd_signal: int | None = None,
    bbands_length: int | None = None,
    bbands_std: float | None = None,
) -> dict[str, dict[str, Any]]:
    config: dict[str, dict[str, Any]] = {}
    if sma_lengths:
        config["sma"] = {"length": sma_lengths}
    if ema_lengths:
        config["ema"] = {"length": ema_lengths}
    if rsi_length:
        config["rsi"] = {"length": rsi_length}
    if macd_fast and macd_slow and macd_signal:
        config["macd"] = {"fast": macd_fast, "slow": macd_slow, "signal": macd_signal}
    if bbands_length and bbands_std:
        config["bbands"] = {"length": bbands_length, "std": bbands_std}
    return config


def get_available_indicator_params() -> dict[str, dict[str, Any]]:
    return {
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


__all__ = [
    "OpenBBFigure",
    "PlotlyTA",
    "ChartIndicators",
    "TAIndicator",
    "Arguments",
    "ChartStyle",
    "to_chart",
    "compute_indicators",
    "build_indicator_config",
    "get_available_indicator_params",
]
