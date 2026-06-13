from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

from api.services.optuna_optimizer import OptunaOptimizer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hyperopt", tags=["hyperopt"])


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

    n_trials = min(req.n_trials, 1000)
    optimizer = OptunaOptimizer(n_trials=n_trials)
    result = optimizer.optimize(space, objective)
    trials_data = []
    if optimizer.study:
        for t in optimizer.study.trials:
            if t.state.name == "COMPLETE" and t.value is not None:
                trials_data.append({
                    "params": {k: round(v, 4) if isinstance(v, float) else v for k, v in t.params.items()},
                    "score": round(t.value, 4),
                    "iteration": t.number,
                })
    return {
        "symbol": req.symbol,
        "n_trials": result["n_trials"],
        "best_params": result["best_params"],
        "best_sharpe": round(result["best_value"], 4),
        "trials": trials_data,
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


@router.post("/study/visualizations")
async def study_visualizations(req: OptimizeRequest):
    import optuna
    space = req.search_space or OptunaOptimizer.default_strategy_space()

    def objective(params):
        return OptunaOptimizer.run_sma_cross_backtest(req.symbol, params)

    n_trials = min(req.n_trials, 1000)
    optimizer = OptunaOptimizer(n_trials=n_trials)
    optimizer.optimize(space, objective)

    if optimizer.study is None or len(optimizer.study.trials) < 2:
        from fastapi import HTTPException
        raise HTTPException(400, "Need at least 2 completed trials")

    vis = {}
    try:
        from optuna.visualization import plot_parallel_coordinate, plot_slice, plot_contour, plot_edf
        import optuna.visualization as vis_mod
        v1 = vis_mod.plot_parallel_coordinate(optimizer.study)
        if v1: vis["parallel_coordinate"] = v1.to_plotly_json()
    except Exception:
        logger.debug("Failed to generate parallel coordinate visualization")
    try:
        v2 = vis_mod.plot_slice(optimizer.study)
        if v2: vis["slice"] = v2.to_plotly_json()
    except Exception:
        logger.debug("Failed to generate slice visualization")
    try:
        v3 = vis_mod.plot_contour(optimizer.study)
        if v3: vis["contour"] = v3.to_plotly_json()
    except Exception:
        logger.debug("Failed to generate contour visualization")
    try:
        v4 = vis_mod.plot_edf(optimizer.study)
        if v4: vis["edf"] = v4.to_plotly_json()
    except Exception:
        logger.debug("Failed to generate EDF visualization")

    return {
        "symbol": req.symbol,
        "n_trials": len(optimizer.study.trials),
        "best_params": optimizer.study.best_params,
        "best_value": optimizer.study.best_value,
        "visualizations": vis,
    }


@router.post("/full-optimize")
async def full_optimize(req: OptimizeRequest):
    space = req.search_space or OptunaOptimizer.default_strategy_space()
    timeframes = ["1d", "1wk", "1mo"]

    def objective(params):
        mtf = OptunaOptimizer.run_multi_timeframe_backtest(req.symbol, params, timeframes)
        return OptunaOptimizer.compute_composite_score(mtf)

    n_trials = min(req.n_trials, 1000)
    optimizer = OptunaOptimizer(n_trials=n_trials)
    result = optimizer.optimize(space, objective)
    mtf_best = OptunaOptimizer.run_multi_timeframe_backtest(req.symbol, result["best_params"], timeframes)
    return {
        "symbol": req.symbol,
        "n_trials": result["n_trials"],
        "best_params": result["best_params"],
        "best_composite": round(result["best_value"], 4),
        "timeframe_results": mtf_best,
    }
