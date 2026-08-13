from __future__ import annotations

import logging
import re
import threading
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from analytics.research.sql_aggregator import SQLAggregator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/research", tags=["research"])

_SQL_SELECT_ONLY = re.compile(r'^\s*SELECT\b', re.IGNORECASE)
_SQL_BLOCKED_KEYWORDS = re.compile(
    r'\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|'
    r'UNION\s+ALL|UNION\s+SELECT|INTO\s+OUTFILE|INTO\s+DUMPFILE|'
    r'LOAD_FILE|SLEEP\s*\(|BENCHMARK\s*\(|INFORMATION_SCHEMA|'
    r'SQLITE_MASTER|PRAGMA|ATTACH|DETACH)\b',
    re.IGNORECASE,
)
_MAX_ROWS = 1000

_aggregator: Optional[SQLAggregator] = None
_aggregator_lock = threading.Lock()


def get_aggregator() -> SQLAggregator:
    global _aggregator
    with _aggregator_lock:
        if _aggregator is None:
            _aggregator = SQLAggregator()
        return _aggregator


@router.get("/tables")
async def list_tables():
    agg = get_aggregator()
    return {"tables": agg.list_tables(), "views": agg.list_views()}


@router.get("/query")
async def run_query(sql: str = Query(..., max_length=2000)):
    if not _SQL_SELECT_ONLY.match(sql.strip()):
        raise HTTPException(400, "Only SELECT queries are allowed on this endpoint")
    if _SQL_BLOCKED_KEYWORDS.search(sql):
        raise HTTPException(400, "Query contains blocked keywords")
    try:
        agg = get_aggregator()
        df = agg.query(sql)
        if len(df) > _MAX_ROWS:
            df = df.head(_MAX_ROWS)
        return {"columns": df.columns.tolist(), "rows": df.values.tolist(), "count": len(df)}
    except Exception as e:
        logger.warning("SQL query failed: %s", e)
        raise HTTPException(400, "Query execution failed")


@router.get("/daily-returns/{symbol}")
async def daily_returns(symbol: str):
    agg = get_aggregator()
    df = agg.daily_returns(symbol)
    return {"data": df.to_dict(orient="records")}

@router.get("/daily-returns")
async def all_daily_returns():
    agg = get_aggregator()
    tables = agg.list_tables()
    result = []
    for t in tables:
        try:
            df = agg.daily_returns(t["name"])
            if df is not None and not df.empty:
                result.extend(df.to_dict(orient="records"))
        except Exception as e:
            logger.debug("Failed to fetch daily returns for %s: %s", t.get("name"), e)
    return {"data": result}


@router.get("/volatility/{symbol}")
async def rolling_volatility(symbol: str, window: int = Query(21, ge=2, le=252)):
    agg = get_aggregator()
    df = agg.rolling_volatility(symbol, window=window)
    return df.to_dict(orient="records")


@router.post("/correlation")
async def correlation_matrix(body: dict):
    symbols = body.get("assets", body.get("symbols", []))
    if not symbols:
        raise HTTPException(400, "Provide 'assets' or 'symbols' list")
    agg = get_aggregator()
    df = agg.correlation_matrix(symbols)
    matrix = df.values.tolist()
    return {"matrix": matrix, "symbols": symbols}
