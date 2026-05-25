from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.services.experiment.runner import ExperimentRunnerService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


class ParameterSpaceItem(BaseModel):
    min: float | None = None
    max: float | None = None
    step: float | None = None
    values: list[float] | None = None


class PipelineRequest(BaseModel):
    symbol: str
    method: str = "grid"
    max_variants: int = 50
    parameter_space: dict[str, Any]
    scoring_weights: dict[str, float] | None = None
    max_rounds: int = 3
    candidates_per_round: int = 5


@router.post("/structured-tune")
async def structured_tune(req: PipelineRequest):
    runner = ExperimentRunnerService()
    try:
        result = runner.run_pipeline(
            symbol=req.symbol,
            parameter_space=req.parameter_space,
            method=req.method,
            max_variants=req.max_variants,
            scoring_weights=req.scoring_weights,
        )
        return result
    except Exception as e:
        logger.exception("Pipeline failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-optimize")
async def ai_optimize(req: PipelineRequest):
    runner = ExperimentRunnerService()
    try:
        result = runner.run_ai_pipeline(
            symbol=req.symbol,
            base_params={},
            parameter_space=req.parameter_space,
            max_rounds=req.max_rounds,
            candidates_per_round=req.candidates_per_round,
            scoring_weights=req.scoring_weights,
        )
        return result
    except Exception as e:
        logger.exception("AI optimize failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/regime")
async def detect_regime(symbol: str, timeframe: str = "1d", period_days: int = 90):
    from api.services.experiment.regime import MarketRegimeService
    try:
        result = MarketRegimeService.detect(symbol, timeframe, period_days)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
