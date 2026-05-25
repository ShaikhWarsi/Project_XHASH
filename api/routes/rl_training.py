from __future__ import annotations

import logging
from typing import Dict, List

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rl-training", tags=["rl_training"])
_trainers: Dict[str, object] = {}


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
        trainer = RLTrainer(env, algo=req.algo)
        result = trainer.train(total_timesteps=req.total_timesteps)
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
        df = pd.DataFrame({"close": req.prices}, index=pd.DatetimeIndex(req.timestamps))
        env = TradingEnv(df=df)
        trainer = RLTrainer(env)
        trainer.load(req.model_path)
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
    except Exception:
        return {"gymnasium_available": False, "stable_baselines3_available": False}
