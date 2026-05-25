from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

from api.services.optuna_optimizer import OptunaOptimizer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hyperopt", tags=["hyperopt"])


class OptimizeRequest(BaseModel):
    symbol: str
    n_trials: int = 50
    search_space: dict[str, Any] | None = None


class MultiTimeframeRequest(BaseModel):
    symbol: str
    params: dict[str, Any]
    timeframes: list[str] = ["1d", "1wk", "1mo"]


@router.post("/optimize")
async def optimize(req: OptimizeRequest):
    space = req.search_space or OptunaOptimizer.default_strategy_space()

    def objective(params):
        return OptunaOptimizer.run_sma_cross_backtest(req.symbol, params)

    optimizer = OptunaOptimizer(n_trials=req.n_trials)
    result = optimizer.optimize(space, objective)
    return {
        "symbol": req.symbol,
        "n_trials": result["n_trials"],
        "best_params": result["best_params"],
        "best_sharpe": round(result["best_value"], 4),
    }


@router.get("/space")
async def default_space():
    return {"search_space": OptunaOptimizer.default_strategy_space()}


@router.post("/multi-timeframe")
async def multi_timeframe_optimize(req: MultiTimeframeRequest):
    mtf = OptunaOptimizer.run_multi_timeframe_backtest(req.symbol, req.params, req.timeframes)
    composite = OptunaOptimizer.compute_composite_score(mtf)
    return {
        "symbol": req.symbol,
        "params": req.params,
        "timeframes": mtf,
        "composite_score": round(composite, 4),
        "n_timeframes": len(req.timeframes),
    }


@router.post("/full-optimize")
async def full_optimize(req: OptimizeRequest):
    space = req.search_space or OptunaOptimizer.default_strategy_space()
    timeframes = ["1d", "1wk", "1mo"]

    def objective(params):
        mtf = OptunaOptimizer.run_multi_timeframe_backtest(req.symbol, params, timeframes)
        return OptunaOptimizer.compute_composite_score(mtf)

    optimizer = OptunaOptimizer(n_trials=req.n_trials)
    result = optimizer.optimize(space, objective)
    mtf_best = OptunaOptimizer.run_multi_timeframe_backtest(req.symbol, result["best_params"], timeframes)
    return {
        "symbol": req.symbol,
        "n_trials": result["n_trials"],
        "best_params": result["best_params"],
        "best_composite": round(result["best_value"], 4),
        "timeframe_results": mtf_best,
    }
