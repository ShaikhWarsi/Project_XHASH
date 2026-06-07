from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse

from api.state import app_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/attribution/{portfolio_id}")
async def attribution(portfolio_id: str):
    snapshot = await app_state.async_snapshot()
    att = snapshot.get("attribution", {})
    if att:
        by_sector = att.get("by_symbol", {})
        result = []
        for sym, val in by_sector.items():
            result.append({
                "sector": sym,
                "allocation_effect": val.get("allocation", 0) if isinstance(val, dict) else 0,
                "selection_effect": val.get("selection", 0) if isinstance(val, dict) else 0,
                "interaction_effect": 0.0,
                "total_effect": val.get("total", 0) if isinstance(val, dict) else 0,
            })
        return {"attribution": result}
    return {
        "attribution": [
            {"sector": "Technology", "allocation_effect": 1.2, "selection_effect": 0.8, "interaction_effect": 0.1, "total_effect": 2.1},
            {"sector": "Healthcare", "allocation_effect": -0.3, "selection_effect": 0.5, "interaction_effect": -0.1, "total_effect": 0.1},
        ],
        "_simulated": True,
    }


@router.get("/fixed-income/{portfolio_id}")
async def fixed_income(portfolio_id: str):
    return {
        "yield": 4.25,
        "duration": 6.8,
        "convexity": 45.2,
        "credit_spread": 1.35,
        "ytm": 4.85,
        "_simulated": True,
    }


@router.get("/derivatives/{portfolio_id}")
async def derivatives(portfolio_id: str):
    return {
        "positions": [
            {"symbol": "AAPL", "greeks": {"delta": 0.65, "gamma": 0.08, "theta": -0.03, "vega": 0.12, "rho": 0.01}},
            {"symbol": "SPY", "greeks": {"delta": 0.72, "gamma": 0.05, "theta": -0.02, "vega": 0.15, "rho": 0.02}},
        ],
        "_simulated": True,
    }


@router.get("/geopolitical")
async def geopolitical():
    return {
        "events": [
            {"event": "Fed Rate Decision", "impact": 0.5, "description": "Market expects 25bp hold"},
            {"event": "Middle East Tensions", "impact": -0.6, "description": "Supply disruption risk for crude"},
        ],
        "_simulated": True,
    }


_FORBIDDEN_SQL_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE",
    "GRANT", "REVOKE", "EXEC", "EXECUTE", "COPY", "IMPORT",
]

@router.post("/sql")
async def run_sql(body: dict):
    query = body.get("query", "").strip()
    if not query:
        return {"columns": [], "rows": []}
    upper = query.upper()
    for kw in _FORBIDDEN_SQL_KEYWORDS:
        if kw in upper:
            return {"error": f"Keyword '{kw}' not allowed", "columns": [], "rows": []}
    try:
        from persistence.database import _engine as db_engine
        import pandas as pd
        df = await asyncio.to_thread(pd.read_sql, query, db_engine)
        return {"columns": list(df.columns), "rows": df.values.tolist()}
    except Exception as e:
        logger.warning("Analytics SQL failed: %s", e)
        return {"error": str(e), "columns": [], "rows": []}


@router.get("/tearsheet/{run_id}", response_class=HTMLResponse)
async def backtest_tearsheet(run_id: int, with_benchmark: bool = Query(False, description="Include SPY benchmark")):
    from persistence.database import get_db_context
    from persistence.repositories import BacktestRepository

    async with get_db_context() as session:
        run = await BacktestRepository.get_run(session, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        eq = json.loads(run.equity_curve_json) if run.equity_curve_json else []
        if not eq:
            raise HTTPException(status_code=400, detail="No equity curve data for this run")

    benchmark_rets = None
    if with_benchmark:
        try:
            import yfinance as yf
            spy = await asyncio.to_thread(lambda: yf.download("SPY", period="1y", auto_adjust=True)["Close"].pct_change().dropna().tolist())
            benchmark_rets = spy[-len(eq):] if len(spy) > len(eq) else spy
        except Exception as e:
            logger.warning("Could not load SPY benchmark: %s", e)

    from analytics.tearsheet import generate_tearsheet
    config = json.loads(run.config_json) if run.config_json else {}
    title = config.get("name", f"Backtest Run #{run.id}")
    html = generate_tearsheet(eq, benchmark_returns=benchmark_rets, title=title)
    return HTMLResponse(content=html)


@router.get("/fast")
async def fast_analysis(market: str = "us", horizon: str = "1m"):
    snapshot = await app_state.async_snapshot()
    metrics = snapshot.get("metrics", {})
    if metrics:
        return {
            "summary": f"Portfolio momentum: sharpe {metrics.get('sharpe_ratio', 0):.2f}, vol {metrics.get('annualized_vol', 0):.2%}",
            "metrics": {
                "momentum": metrics.get("sharpe_ratio", 0) / 2 if metrics.get("sharpe_ratio", 0) else 0,
                "volatility": metrics.get("annualized_volatility", 0.22),
                "correlation": 0.45,
                "skew": -0.12,
                "kurtosis": 3.1,
            },
        }
    return {
        "summary": f"Bullish momentum detected in {market.upper()} markets over {horizon} horizon.",
        "metrics": {"momentum": 0.65, "volatility": 0.22, "correlation": 0.45, "skew": -0.12, "kurtosis": 3.1},
        "_simulated": True,
    }
