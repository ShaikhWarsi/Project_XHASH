from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rl-training", tags=["rl_training"])
_trainers: Dict[str, object] = {}

_ALLOWED_MODEL_DIR = Path.home() / ".trading-engine" / "rl_models"
_ALLOWED_MODEL_DIR.mkdir(parents=True, exist_ok=True)


def _validate_model_path(model_path: str) -> Path:
    p = Path(model_path)
    if not p.is_absolute():
        p = _ALLOWED_MODEL_DIR / p
    p = p.resolve()
    if not str(p).startswith(str(_ALLOWED_MODEL_DIR.resolve())):
        raise HTTPException(400, "Model path outside allowed directory")
    return p


class TrainRequest(BaseModel):
    prices: List[float]
    timestamps: List[str]
    algo: str = "ppo"
    total_timesteps: int = 10_000
    window_size: int = 20
    initial_balance: float = 10_000.0


class EvalRequest(BaseModel):
    model_path: str
    prices: List[float]
    timestamps: List[str]
    episodes: int = 5


@router.post("/train")
async def train_rl(req: TrainRequest):
    try:
        from signals.rl.environment import TradingEnv, HAS_RL
        from signals.rl.trainer import RLTrainer, HAS_SB3
        if not HAS_RL:
            raise HTTPException(503, "gymnasium not installed")
        if not HAS_SB3:
            raise HTTPException(503, "stable-baselines3 not installed")
        df = pd.DataFrame({"close": req.prices}, index=pd.DatetimeIndex(req.timestamps))
        env = TradingEnv(df=df, window_size=req.window_size, initial_balance=req.initial_balance)
        total_timesteps = min(req.total_timesteps, 1_000_000)
        trainer = RLTrainer(env, algo=req.algo)
        result = trainer.train(total_timesteps=total_timesteps)
        _trainers[result["model_path"]] = trainer
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("RL training failed")
        raise HTTPException(500, str(e))


@router.post("/evaluate")
async def evaluate_model(req: EvalRequest):
    try:
        from signals.rl.environment import TradingEnv, HAS_RL
        from signals.rl.trainer import RLTrainer, HAS_SB3
        if not HAS_RL or not HAS_SB3:
            raise HTTPException(503, "RL dependencies not installed")
        model_path = _validate_model_path(req.model_path)
        df = pd.DataFrame({"close": req.prices}, index=pd.DatetimeIndex(req.timestamps))
        env = TradingEnv(df=df)
        trainer = RLTrainer(env)
        trainer.load(str(model_path))
        results = trainer.evaluate(env, episodes=req.episodes)
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("RL evaluation failed")
        raise HTTPException(500, str(e))


@router.get("/status")
async def rl_status():
    try:
        from signals.rl.environment import HAS_RL
        from signals.rl.trainer import HAS_SB3
        return {"gymnasium_available": HAS_RL, "stable_baselines3_available": HAS_SB3}
    except Exception as e:
        logger.warning("RL env check failed: %s", e)
        return {"gymnasium_available": False, "stable_baselines3_available": False}
