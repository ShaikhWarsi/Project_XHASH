from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from analytics.research.sql_aggregator import SQLAggregator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/research", tags=["research"])

_aggregator: Optional[SQLAggregator] = None


def get_aggregator() -> SQLAggregator:
    global _aggregator
    if _aggregator is None:
        _aggregator = SQLAggregator()
    return _aggregator


@router.get("/tables")
async def list_tables():
    agg = get_aggregator()
    return {"tables": agg.list_tables(), "views": agg.list_views()}


@router.get("/query")
async def run_query(sql: str = Query(...)):
    try:
        agg = get_aggregator()
        df = agg.query(sql)
        return {"columns": df.columns.tolist(), "rows": df.values.tolist(), "count": len(df)}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/daily-returns/{symbol}")
async def daily_returns(symbol: str):
    agg = get_aggregator()
    df = agg.daily_returns(symbol)
    return df.to_dict(orient="records")


@router.get("/volatility/{symbol}")
async def rolling_volatility(symbol: str, window: int = Query(21, ge=2, le=252)):
    agg = get_aggregator()
    df = agg.rolling_volatility(symbol, window=window)
    return df.to_dict(orient="records")


@router.post("/correlation")
async def correlation_matrix(symbols: List[str]):
    agg = get_aggregator()
    df = agg.correlation_matrix(symbols)
    return df.to_dict(orient="index")
