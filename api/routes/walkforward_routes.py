from __future__ import annotations

import asyncio
import logging

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from backtesting.walkforward import WalkForwardEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/walkforward", tags=["walkforward"])


def _optimize_sma(train_data: dict[str, pd.DataFrame]) -> dict:
    """Find the best (fast, slow) SMA pair on the training window."""
    df = next(iter(train_data.values()))
    close = df["close"]
    best = {"fast": 10, "slow": 30}
    best_sharpe = -1
    for fast in range(5, 30, 5):
        for slow in range(fast + 10, 60, 10):
            sma_f = close.rolling(fast).mean()
            sma_s = close.rolling(slow).mean()
            signals = (sma_f > sma_s).astype(int).diff().fillna(0)
            rets = close.pct_change().shift(-1) * signals
            if rets.std() > 0:
                sharpe = rets.mean() / rets.std() * np.sqrt(252)
                if sharpe > best_sharpe:
                    best_sharpe = sharpe
                    best = {"fast": fast, "slow": slow}
    return best


def _sma_strategy_per_window(snapshot, portfolio, params: dict) -> list:
    orders = []
    fast = params.get("fast", 20)
    slow = params.get("slow", 50)
    for sym, df in snapshot.items():
        if df is None or len(df) < slow + 1:
            continue
        close = df["close"]
        sma_f = close.rolling(fast).mean()
        sma_s = close.rolling(slow).mean()
        if pd.notna(sma_f.iloc[-1]) and pd.notna(sma_s.iloc[-1]):
            if sma_f.iloc[-1] > sma_s.iloc[-1]:
                orders.append({"symbol": sym, "action": "buy", "size": 100})
            else:
                orders.append({"symbol": sym, "action": "sell", "size": 100})
    return orders


@router.post("/run")
async def run_walkforward(
    symbol: str = Query("AAPL"),
    train_bars: int = Query(252, description="In-sample training bars per window"),
    test_bars: int = Query(63, description="Out-of-sample test bars per window"),
    slide_bars: int = Query(21, description="Slide size between windows"),
    period: str = Query("5y", description="yfinance period (1y/2y/5y/10y/max)"),
    re_optimize: bool = Query(True, description="Re-optimize params per window"),
):
    try:
        ticker = yf.Ticker(symbol)
        df = await asyncio.to_thread(lambda: ticker.history(period=period))
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")

        df.columns = [c.lower() for c in df.columns]
        data = {symbol: df}

        engine = WalkForwardEngine(train_bars=train_bars, test_bars=test_bars, slide_bars=slide_bars)
        train_fn = _optimize_sma if re_optimize else lambda td: {"fast": 20, "slow": 50}
        result = engine.run(
            train_fn=train_fn,
            test_fn=_sma_strategy_per_window,
            data=data,
            symbols=[symbol],
        )

        window_details = []
        for i, w in enumerate(result.window_results):
            window_details.append({
                "window": i + 1,
                "sharpe": round(w.sharpe_ratio, 4),
                "return": round(w.total_return, 4),
                "max_dd": round(w.max_drawdown, 4),
                "params": getattr(w, "_walkforward_params", {}),
                "train_start": getattr(w, "_train_start", ""),
                "train_end": getattr(w, "_train_end", ""),
                "test_start": getattr(w, "_test_start", ""),
                "test_end": getattr(w, "_test_end", ""),
            })

        return {
            "symbol": symbol,
            "windows": len(result.window_results),
            "train_bars": train_bars,
            "test_bars": test_bars,
            "slide_bars": slide_bars,
            "oos_sharpes": [round(s, 4) for s in result.oos_sharpes],
            "oos_sharpe_p5": round(result.oos_sharpe_p5, 4),
            "oos_sharpe_p50": round(result.oos_sharpe_p50, 4),
            "oos_sharpe_p95": round(result.oos_sharpe_p95, 4),
            "avg_sharpe": round(result.avg_sharpe, 4),
            "avg_return": round(result.avg_return, 4),
            "avg_max_dd": round(result.avg_max_dd, 4),
            "stability": round(result.stability, 4),
            "window_details": window_details,
            "re_optimized_per_window": re_optimize,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Walkforward failed for %s", symbol)
        raise HTTPException(status_code=500, detail=str(e))
