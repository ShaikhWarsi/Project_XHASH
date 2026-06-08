from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

_DATA_DIR = Path(os.getenv("MARKETPLACE_DATA_DIR", "data/marketplace"))
_DATA_DIR.mkdir(parents=True, exist_ok=True)

_INDICATORS_FILE = _DATA_DIR / "indicators.json"
_STRATEGIES_FILE = _DATA_DIR / "strategies.json"
_LAYOUTS_FILE = _DATA_DIR / "layouts.json"

_DEFAULT_INDICATORS = [
    {"id": "i1", "name": "Smart Money Concepts", "description": "Advanced smart money concepts including FVG, order blocks, and liquidity zones", "author": "xka_team", "category": "custom", "downloads": 0, "rating": 4.9, "tags": ["smart-money", "fvg", "order-block"], "installed": False},
    {"id": "i2", "name": "Market Structure", "description": "Automatically labels HH/HL/LH/LL market structure levels", "author": "xka_team", "category": "pattern", "downloads": 0, "rating": 4.7, "tags": ["structure", "trend"], "installed": False},
    {"id": "i3", "name": "Order Flow Imbalance", "description": "Visualizes delta and cumulative delta for order flow analysis", "author": "xka_team", "category": "volume", "downloads": 0, "rating": 4.8, "tags": ["orderflow", "delta"], "installed": False},
    {"id": "i4", "name": "Auto Fibonacci", "description": "Automatic Fibonacci retracement and extension levels from swing points", "author": "xka_team", "category": "drawing", "downloads": 0, "rating": 4.5, "tags": ["fib", "auto"], "installed": False},
    {"id": "i5", "name": "Divergence Finder", "description": "Detects RSI, MACD, and stochastic divergences automatically", "author": "xka_team", "category": "custom", "downloads": 0, "rating": 4.6, "tags": ["divergence", "rsi", "macd"], "installed": False},
    {"id": "i6", "name": "Volume Profile", "description": "Visible range and fixed range volume profile with HVNs and LVNs", "author": "xka_team", "category": "volume", "downloads": 0, "rating": 4.4, "tags": ["volume-profile", "vah", "val"], "installed": False},
    {"id": "i7", "name": "Multi-Timeframe MA", "description": "Moving averages from higher timeframes overlaid on current chart", "author": "xka_team", "category": "overlap", "downloads": 0, "rating": 4.3, "tags": ["ma", "mtf"], "installed": False},
    {"id": "i8", "name": "GEX (Gamma Exposure)", "description": "Options gamma exposure levels and support/resistance", "author": "xka_team", "category": "custom", "downloads": 0, "rating": 4.7, "tags": ["options", "gamma"], "installed": False},
]

_DEFAULT_STRATEGIES = [
    {"id": "s1", "name": "Mean Reversion Pro", "description": "Statistical arbitrage using z-score mean reversion with dynamic bands", "author": "xka_team", "type": "both", "assetClasses": ["stocks", "etfs"], "avgReturn": 18.5, "sharpe": 1.8, "downloads": 0, "rating": 4.8, "tags": ["mean-reversion", "statistical"], "installed": False},
    {"id": "s2", "name": "Trend Following", "description": "Multi-timeframe trend following with ADX and EMA filters", "author": "xka_team", "type": "long", "assetClasses": ["futures", "crypto"], "avgReturn": 24.2, "sharpe": 1.5, "downloads": 0, "rating": 4.7, "tags": ["trend", "adx", "ema"], "installed": False},
    {"id": "s3", "name": "Momentum Burst", "description": "Captures breakout momentum with volatility-adjusted position sizing", "author": "xka_team", "type": "both", "assetClasses": ["stocks", "crypto"], "avgReturn": 32.1, "sharpe": 1.3, "downloads": 0, "rating": 4.5, "tags": ["momentum", "breakout"], "installed": False},
    {"id": "s4", "name": "Volatility Arbitrage", "description": "Trades VIX term structure and volatility premium decay", "author": "xka_team", "type": "short", "assetClasses": ["options", "futures"], "avgReturn": 15.8, "sharpe": 2.1, "downloads": 0, "rating": 4.9, "tags": ["volatility", "vix", "arb"], "installed": False},
    {"id": "s5", "name": "Grid Bot Classic", "description": "Automated grid trading with dynamic range adjustment", "author": "xka_team", "type": "both", "assetClasses": ["crypto"], "avgReturn": 12.5, "sharpe": 0.9, "downloads": 0, "rating": 4.2, "tags": ["grid", "crypto", "automated"], "installed": False},
    {"id": "s6", "name": "Pair Trading", "description": "Cointegration-based pairs trading with hedge ratio optimization", "author": "xka_team", "type": "both", "assetClasses": ["stocks", "etfs"], "avgReturn": 21.3, "sharpe": 2.3, "downloads": 0, "rating": 4.6, "tags": ["pairs", "cointegration", "hedge"], "installed": False},
    {"id": "s7", "name": "Swing Momentum", "description": "2-5 day swing trades using RSI divergence and volume confirmation", "author": "xka_team", "type": "long", "assetClasses": ["stocks", "etfs", "crypto"], "avgReturn": 28.7, "sharpe": 1.6, "downloads": 0, "rating": 4.4, "tags": ["swing", "rsi", "divergence"], "installed": False},
    {"id": "s8", "name": "Option Wheel", "description": "Cash-secured puts + covered call wheel strategy with IV targeting", "author": "xka_team", "type": "long", "assetClasses": ["options", "stocks"], "avgReturn": 16.4, "sharpe": 1.9, "downloads": 0, "rating": 4.7, "tags": ["options", "wheel", "income"], "installed": False},
]

_DEFAULT_LAYOUTS = [
    {"id": "l1", "name": "Pro Trader", "description": "Multi-monitor layout with chart, order book, and portfolio side by side", "author": "xka_team", "downloads": 0, "rating": 4.8, "tags": ["multi-monitor", "pro"], "installed": True},
    {"id": "l2", "name": "Swing Trader", "description": "Daily chart focus with signal panel and watchlist", "author": "xka_team", "downloads": 0, "rating": 4.5, "tags": ["swing", "daily"], "installed": False},
    {"id": "l3", "name": "Scalper", "description": "Tight timeframes with Level 2 data and quick trade buttons", "author": "xka_team", "downloads": 0, "rating": 4.7, "tags": ["scalping", "fast"], "installed": False},
    {"id": "l4", "name": "Portfolio Manager", "description": "Portfolio-centric view with risk metrics and P&L charts", "author": "xka_team", "downloads": 0, "rating": 4.3, "tags": ["portfolio", "risk"], "installed": False},
    {"id": "l5", "name": "Algo Developer", "description": "Strategy editor, backtester, and optimization results side panel", "author": "xka_team", "downloads": 0, "rating": 4.6, "tags": ["backtest", "algo"], "installed": False},
    {"id": "l6", "name": "Minimal", "description": "Clean, distraction-free trading view with essential tools", "author": "xka_team", "downloads": 0, "rating": 4.2, "tags": ["minimal", "clean"], "installed": False},
]


def _load_json(path: Path, defaults: list[dict]) -> list[dict]:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            pass
    return defaults


def _save_json(path: Path, data: list[dict]):
    path.write_text(json.dumps(data, indent=2))


def _init_data():
    if not _INDICATORS_FILE.exists():
        _save_json(_INDICATORS_FILE, _DEFAULT_INDICATORS)
    if not _STRATEGIES_FILE.exists():
        _save_json(_STRATEGIES_FILE, _DEFAULT_STRATEGIES)
    if not _LAYOUTS_FILE.exists():
        _save_json(_LAYOUTS_FILE, _DEFAULT_LAYOUTS)


_init_data()


@router.get("/indicators")
async def list_indicators():
    return {"indicators": _load_json(_INDICATORS_FILE, _DEFAULT_INDICATORS)}


@router.post("/indicators/{id}/install")
async def install_indicator(id: str):
    indicators = _load_json(_INDICATORS_FILE, _DEFAULT_INDICATORS)
    for ind in indicators:
        if ind["id"] == id:
            ind["installed"] = True
            ind["downloads"] = ind.get("downloads", 0) + 1
            _save_json(_INDICATORS_FILE, indicators)
            return {"success": True, "indicator": ind}
    raise HTTPException(404, f"Indicator {id} not found")


@router.post("/indicators/{id}/uninstall")
async def uninstall_indicator(id: str):
    indicators = _load_json(_INDICATORS_FILE, _DEFAULT_INDICATORS)
    for ind in indicators:
        if ind["id"] == id:
            ind["installed"] = False
            _save_json(_INDICATORS_FILE, indicators)
            return {"success": True, "indicator": ind}
    raise HTTPException(404, f"Indicator {id} not found")


@router.get("/strategies")
async def list_strategies():
    return {"strategies": _load_json(_STRATEGIES_FILE, _DEFAULT_STRATEGIES)}


@router.post("/strategies/{id}/install")
async def install_strategy(id: str):
    strategies = _load_json(_STRATEGIES_FILE, _DEFAULT_STRATEGIES)
    for s in strategies:
        if s["id"] == id:
            s["installed"] = True
            s["downloads"] = s.get("downloads", 0) + 1
            _save_json(_STRATEGIES_FILE, strategies)
            return {"success": True, "strategy": s}
    raise HTTPException(404, f"Strategy {id} not found")


@router.post("/strategies/{id}/uninstall")
async def uninstall_strategy(id: str):
    strategies = _load_json(_STRATEGIES_FILE, _DEFAULT_STRATEGIES)
    for s in strategies:
        if s["id"] == id:
            s["installed"] = False
            _save_json(_STRATEGIES_FILE, strategies)
            return {"success": True, "strategy": s}
    raise HTTPException(404, f"Strategy {id} not found")


@router.get("/layouts")
async def list_layouts():
    return {"layouts": _load_json(_LAYOUTS_FILE, _DEFAULT_LAYOUTS)}


@router.post("/layouts/{id}/install")
async def install_layout(id: str):
    layouts = _load_json(_LAYOUTS_FILE, _DEFAULT_LAYOUTS)
    for l in layouts:
        if l["id"] == id:
            l["installed"] = True
            l["downloads"] = l.get("downloads", 0) + 1
            _save_json(_LAYOUTS_FILE, layouts)
            return {"success": True, "layout": l}
    raise HTTPException(404, f"Layout {id} not found")


@router.post("/layouts/{id}/uninstall")
async def uninstall_layout(id: str):
    layouts = _load_json(_LAYOUTS_FILE, _DEFAULT_LAYOUTS)
    for l in layouts:
        if l["id"] == id:
            l["installed"] = False
            _save_json(_LAYOUTS_FILE, layouts)
            return {"success": True, "layout": l}
    raise HTTPException(404, f"Layout {id} not found")
