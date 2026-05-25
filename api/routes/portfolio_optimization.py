from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio-optimization", tags=["portfolio_optimization"])


class OptimizationRequest(BaseModel):
    prices: List[float]
    symbols: List[str]
    model: str = "mean-risk"
    risk_measure: str = "CVaR"


class HrpRequest(BaseModel):
    prices: List[float]
    symbols: List[str]


class BlackLittermanRequest(BaseModel):
    prices: List[float]
    symbols: List[str]
    views: Dict[str, float] = {}
    confidence: float = 0.5


class FrontierRequest(BaseModel):
    prices: List[float]
    symbols: List[str]
    n_points: int = 30


@router.post("/optimize")
async def optimize_portfolio(req: OptimizationRequest):
    try:
        from analytics.optimizers.skfolio_optimizer import SkfolioOptimizer, HAS_SKFOLIO
        if not HAS_SKFOLIO:
            raise HTTPException(503, "skfolio not installed")
        n = len(req.prices) // len(req.symbols)
        data = {sym: req.prices[i * n : (i + 1) * n] for i, sym in enumerate(req.symbols)}
        df = pd.DataFrame(data)
        opt = SkfolioOptimizer(model=req.model, risk_measure=req.risk_measure)
        opt.fit(df)
        weights = opt.predict()
        stats = opt.portfolio_stats(df)
        return {"weights": weights.to_dict(), "stats": stats, "model": req.model, "risk_measure": req.risk_measure}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Portfolio optimization failed")
        raise HTTPException(500, str(e))


@router.post("/hrp")
async def hrp_optimization(req: HrpRequest):
    try:
        from analytics.optimizers.skfolio_optimizer import SkfolioOptimizer, HAS_SKFOLIO
        if not HAS_SKFOLIO:
            raise HTTPException(503, "skfolio not installed")
        n = len(req.prices) // len(req.symbols)
        data = {sym: req.prices[i * n : (i + 1) * n] for i, sym in enumerate(req.symbols)}
        df = pd.DataFrame(data)
        opt = SkfolioOptimizer(model="hrp")
        weights = opt.hrp(df)
        return {"weights": weights.to_dict(), "model": "hrp"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("HRP failed")
        raise HTTPException(500, str(e))


@router.post("/black-litterman")
async def black_litterman(req: BlackLittermanRequest):
    try:
        from analytics.optimizers.skfolio_optimizer import SkfolioOptimizer, HAS_SKFOLIO
        if not HAS_SKFOLIO:
            raise HTTPException(503, "skfolio not installed")
        n = len(req.prices) // len(req.symbols)
        data = {sym: req.prices[i * n : (i + 1) * n] for i, sym in enumerate(req.symbols)}
        df = pd.DataFrame(data)
        opt = SkfolioOptimizer()
        weights = opt.black_litterman(df, req.views, view_confidence=req.confidence)
        return {"weights": weights.to_dict(), "model": "black-litterman", "views": req.views}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("BL failed")
        raise HTTPException(500, str(e))


@router.post("/efficient-frontier")
async def efficient_frontier(req: FrontierRequest):
    try:
        from analytics.optimizers.skfolio_optimizer import SkfolioOptimizer, HAS_SKFOLIO
        if not HAS_SKFOLIO:
            raise HTTPException(503, "skfolio not installed")
        n = len(req.prices) // len(req.symbols)
        data = {sym: req.prices[i * n : (i + 1) * n] for i, sym in enumerate(req.symbols)}
        df = pd.DataFrame(data)
        opt = SkfolioOptimizer()
        ef = opt.efficient_frontier(df, n_points=req.n_points)
        return {"frontier": ef.to_dict(orient="records")}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Efficient frontier failed")
        raise HTTPException(500, str(e))


@router.get("/status")
async def optimization_status():
    try:
        from analytics.optimizers.skfolio_optimizer import HAS_SKFOLIO
        if HAS_SKFOLIO:
            import skfolio
            return {"available": True, "version": skfolio.__version__}
        return {"available": False, "version": None}
    except Exception as e:
        logger.warning("Skfolio check failed: %s", e)
        return {"available": False, "version": None}
