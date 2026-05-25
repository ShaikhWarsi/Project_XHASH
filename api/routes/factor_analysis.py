from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/factor-analysis", tags=["factor_analysis"])


class FactorRequest(BaseModel):
    prices: List[float]
    factor_values: List[float]
    timestamps: List[str]
    symbols: List[str]
    periods: str = "1,5,21"
    quantiles: int = 5


class DecayRequest(BaseModel):
    prices: List[float]
    factor_values: List[float]
    timestamps: List[str]
    symbols: List[str]
    periods: str = "1,5,10,21,63"


class SummaryRequest(BaseModel):
    prices: List[float]
    factor_values: List[float]
    timestamps: List[str]
    symbols: List[str]


def _build_panel(prices, timestamps, symbols):
    n = len(prices) // len(symbols)
    data = {}
    dt_idx = pd.DatetimeIndex(timestamps[:n])
    for i, sym in enumerate(symbols):
        data[sym] = prices[i * n : (i + 1) * n]
    return pd.DataFrame(data, index=dt_idx)


def _build_factor(values, timestamps, symbols):
    n = len(values) // len(symbols)
    idx = pd.MultiIndex.from_product([pd.DatetimeIndex(timestamps[:n]), symbols], names=["date", "asset"])
    return pd.Series(values, index=idx)


def _serialize_df(df):
    if df is None or df.empty:
        return None
    try:
        return df.reset_index().to_dict(orient="records")
    except Exception:
        return None


@router.post("/analyze")
async def analyze_factor(req: FactorRequest):
    try:
        from analytics.factors.alphalens_analysis import FactorAnalysis, HAS_ALPHALENS
        if not HAS_ALPHALENS:
            raise HTTPException(503, "alphalens not installed")
        period_tuple = tuple(int(p) for p in req.periods.split(","))
        price_df = _build_panel(req.prices, req.timestamps, req.symbols)
        factor_series = _build_factor(req.factor_values, req.timestamps, req.symbols)
        fa = FactorAnalysis(price_df)
        result = fa.analyze(factor_series, periods=period_tuple, quantiles=req.quantiles)
        return {
            "mean_ic": result["mean_ic"],
            "ic_std": result["ic_std"],
            "ic_ir": result["ic_ir"],
            "spread_return": result["spread_return"],
            "quantile_returns": _serialize_df(result["quantile_returns"]),
            "ic_series": _serialize_df(result["ic_series"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Factor analysis failed")
        raise HTTPException(500, str(e))


@router.post("/decay")
async def factor_decay(req: DecayRequest):
    try:
        from analytics.factors.alphalens_analysis import FactorAnalysis, HAS_ALPHALENS
        if not HAS_ALPHALENS:
            raise HTTPException(503, "alphalens not installed")
        period_list = [int(p) for p in req.periods.split(",")]
        price_df = _build_panel(req.prices, req.timestamps, req.symbols)
        factor_series = _build_factor(req.factor_values, req.timestamps, req.symbols)
        fa = FactorAnalysis(price_df)
        decay = fa.factor_decay(factor_series, periods=tuple(period_list))
        return {"decay": decay.to_dict(orient="records")}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Factor decay failed")
        raise HTTPException(500, str(e))


@router.post("/summary")
async def factor_summary(req: SummaryRequest):
    try:
        from analytics.factors.alphalens_analysis import FactorAnalysis, HAS_ALPHALENS
        if not HAS_ALPHALENS:
            raise HTTPException(503, "alphalens not installed")
        price_df = _build_panel(req.prices, req.timestamps, req.symbols)
        factor_series = _build_factor(req.factor_values, req.timestamps, req.symbols)
        fa = FactorAnalysis(price_df)
        return fa.summary(factor_series)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Factor summary failed")
        raise HTTPException(500, str(e))


@router.get("/status")
async def factor_status():
    try:
        from analytics.factors.alphalens_analysis import HAS_ALPHALENS
        if HAS_ALPHALENS:
            import alphalens
            return {"available": True, "version": alphalens.__version__}
        return {"available": False, "version": None}
    except Exception:
        return {"available": False, "version": None}
