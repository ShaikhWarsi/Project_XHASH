from __future__ import annotations

import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/correlation", tags=["correlation"])


def _fetch_symbol_data(symbol: str, interval: str, period_days: int) -> pd.DataFrame | None:
    try:
        from openbb import obb
        df = obb.crypto.price.historical(
            symbol=symbol, provider="yfinance",
            interval=interval,
            start_date=(datetime.now() - timedelta(days=period_days)).strftime("%Y-%m-%d"),
        ).to_df()
        return df
    except Exception as e:
        logger.warning("openbb failed for %s: %s", symbol, e)

    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        period = f"{period_days}d"
        interval_map = {"1d": "1d", "1wk": "5d", "1mo": "1mo"}
        yf_interval = interval_map.get(interval, "1d")
        df = ticker.history(period=period, interval=yf_interval)
        if df.empty:
            return None
        df.columns = [c.lower() for c in df.columns]
        return df
    except ImportError:
        logger.warning("yfinance not available")
        return None


@router.get("/matrix")
async def get_correlation_matrix(
    symbols: str = Query(...),
    interval: str = Query("1d"),
    period_days: int = Query(250),
    method: str = Query("pearson"),
):
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 symbols")

    price_data: dict[str, pd.Series] = {}
    errors: list[str] = []

    for symbol in symbol_list:
        df = _fetch_symbol_data(symbol, interval, period_days)
        if df is None or df.empty:
            errors.append(f"No data for {symbol}")
            continue
        price_data[symbol] = df["close"]

    if len(price_data) < 2:
        raise HTTPException(status_code=404, detail=f"Could not fetch data for enough symbols. Errors: {', '.join(errors)}")

    combined = pd.DataFrame(price_data)
    combined = combined.dropna(how="any")

    corr_methods = {"pearson": "pearson", "spearman": "spearman", "kendall": "kendall"}
    corr = combined.corr(method=corr_methods.get(method, "pearson"))

    symbols_ordered = list(corr.columns)
    matrix_values = corr.values.tolist()

    return {
        "symbols": symbols_ordered,
        "matrix": matrix_values,
        "method": method,
        "period_days": period_days,
        "interval": interval,
        "errors": errors,
    }


@router.get("/pairs")
async def get_correlation_pairs(
    symbols: str = Query(...),
    interval: str = Query("1d"),
    period_days: int = Query(250),
    min_correlation: float = Query(0.5),
):
    result = await get_correlation_matrix(symbols, interval, period_days, "pearson")
    matrix = np.array(result["matrix"])
    syms = result["symbols"]
    pairs = []
    for i in range(len(syms)):
        for j in range(i + 1, len(syms)):
            corr_val = matrix[i][j]
            if abs(corr_val) >= min_correlation:
                pairs.append({
                    "symbol_a": syms[i],
                    "symbol_b": syms[j],
                    "correlation": round(corr_val, 4),
                })
    pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return {"pairs": pairs, "total_pairs": len(pairs)}
