from __future__ import annotations

import asyncio
import logging

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from backtesting.scenario import ScenarioEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scenario", tags=["scenario"])


def _dummy_strategy(data: dict[str, pd.DataFrame], symbols: list[str]) -> list:
    orders = []
    for sym in symbols:
        df = data.get(sym)
        if df is None or len(df) < 2:
            continue
        close = df["close"].values
        sma5 = pd.Series(close).rolling(5).mean().values
        if len(close) >= 2 and close[-1] > sma5[-1] and close[-2] <= sma5[-2]:
            orders.append({"symbol": sym, "action": "buy", "size": 100})
        elif len(close) >= 2 and close[-1] < sma5[-1] and close[-2] >= sma5[-2]:
            orders.append({"symbol": sym, "action": "sell", "size": 100})
    return orders


@router.post("/run")
async def run_scenario(
    symbol: str = Query("AAPL"),
    period: str = Query("1y"),
):
    try:
        ticker = yf.Ticker(symbol)
        df = await asyncio.to_thread(lambda: ticker.history(period=period))
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")

        df.columns = [c.lower() for c in df.columns]
        data = {symbol: df}

        engine = ScenarioEngine()
        result = engine.run(
            strategy_fn=lambda snap, pf: _dummy_strategy({symbol: snap}, [symbol]),
            base_data=data,
            symbols=[symbol],
        )

        scenarios = {}
        for name, sr in result.scenarios.items():
            scenarios[name] = {
                "total_return": sr.total_return,
                "sharpe_ratio": sr.sharpe_ratio,
                "max_drawdown": sr.max_drawdown,
            }

        return {
            "symbol": symbol,
            "base": {
                "total_return": result.base.total_return,
                "sharpe_ratio": result.base.sharpe_ratio,
                "max_drawdown": result.base.max_drawdown,
            },
            "scenarios": scenarios,
            "impact": result.scenario_impact,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Scenario analysis failed for %s", symbol)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenarios")
async def list_scenarios():
    from backtesting.scenario import _DEFAULT_SCENARIOS
    return {"scenarios": _DEFAULT_SCENARIOS}
