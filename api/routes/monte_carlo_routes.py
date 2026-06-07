from __future__ import annotations

import asyncio
import logging
from datetime import date
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from backtesting.monte_carlo import MonteCarloEngine, MonteCarloResult
from backtesting.engine import BacktestResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/monte-carlo", tags=["monte_carlo"])


@router.post("/run")
async def run_monte_carlo(
    symbol: str = Query("AAPL"),
    n_simulations: int = Query(1000, ge=10, le=10000),
    period: str = Query("1y"),
):
    try:
        ticker = yf.Ticker(symbol)
        df = await asyncio.to_thread(lambda: ticker.history(period=period))
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")

        close = df["Close"].values
        returns = np.diff(close) / close[:-1]
        if len(returns) < 2:
            raise HTTPException(status_code=400, detail="Not enough data for simulation")

        base_result = BacktestResult(
            total_return=float((close[-1] / close[0]) - 1),
            equity_curve=close.tolist(),
        )

        engine = MonteCarloEngine(n_simulations=n_simulations)
        result = engine.run(base_result, returns)

        return {
            "symbol": symbol,
            "n_simulations": n_simulations,
            "mean_return": result.mean_return,
            "mean_sharpe": result.mean_sharpe,
            "mean_max_dd": result.mean_max_dd,
            "pct_positive": result.pct_positive,
            "var_95": result.var_95,
            "positive_simulations": int(result.pct_positive * n_simulations / 100),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Monte Carlo failed for %s", symbol)
        raise HTTPException(status_code=500, detail=str(e))
