from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from signals.rl.environment import TradingEnv, HAS_RL

logger = logging.getLogger(__name__)

HAS_SB3 = False
try:
    from stable_baselines3 import PPO, SAC, DDPG, A2C
    from stable_baselines3.common.callbacks import BaseCallback, EvalCallback
    from stable_baselines3.common.vec_env import DummyVecEnv

    HAS_SB3 = True
except ImportError:
    PPO = None  # type: ignore
    SAC = None  # type: ignore
    DDPG = None  # type: ignore
    A2C = None  # type: ignore
    BaseCallback = None  # type: ignore
    EvalCallback = None  # type: ignore
    DummyVecEnv = None  # type: ignore


ALGO_MAP = {
    "ppo": PPO,
    "sac": SAC,
    "ddpg": DDPG,
    "a2c": A2C,
}


class RLTrainer:
    def __init__(
        self,
        env: TradingEnv,
        algo: str = "ppo",
        model_dir: str = "models/rl",
        seed: int = 42,
        device: str = "auto",
    ):
        if not HAS_SB3:
            raise ImportError("stable-baselines3 is required. Install: pip install trading-engine[rl]")

        self.algo_name = algo.lower()
        algo_class = ALGO_MAP.get(self.algo_name)
        if algo_class is None:
            raise ValueError(f"Unknown algorithm: {algo}. Choose from {list(ALGO_MAP.keys())}")

        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

        self.vec_env = DummyVecEnv([lambda: env])
        self.model = algo_class(
            "MlpPolicy",
            self.vec_env,
            verbose=0,
            seed=seed,
            device=device,
        )
        self.seed = seed

    def train(
        self,
        total_timesteps: int = 100_000,
        eval_env: Optional[TradingEnv] = None,
        eval_freq: int = 10_000,
        callback: Optional[BaseCallback] = None,
        log_interval: int = 100,
    ) -> Dict[str, Any]:
        callbacks = []
        if eval_env:
            eval_vec = DummyVecEnv([lambda: eval_env])
            callbacks.append(
                EvalCallback(
                    eval_vec,
                    best_model_save_path=os.path.join(self.model_dir, "best"),
                    log_path=os.path.join(self.model_dir, "logs"),
                    eval_freq=eval_freq,
                    deterministic=True,
                    render=False,
                )
            )
        if callback:
            callbacks.append(callback)

        self.model.learn(
            total_timesteps=total_timesteps,
            callback=callbacks if callbacks else None,
            log_interval=log_interval,
        )

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = os.path.join(self.model_dir, f"{self.algo_name}_{timestamp}")
        self.model.save(path)
        logger.info("Model saved to %s", path)

        return {
            "model_path": path,
            "algo": self.algo_name,
            "total_timesteps": total_timesteps,
        }

    def predict(self, observation: np.ndarray, deterministic: bool = True) -> int:
        action, _ = self.model.predict(observation, deterministic=deterministic)
        return int(action)

    def load(self, path: str):
        algo_class = ALGO_MAP.get(self.algo_name)
        if algo_class is None:
            raise ValueError(f"Unknown algorithm: {self.algo_name}")
        self.model = algo_class.load(path)
        logger.info("Model loaded from %s", path)

    def evaluate(
        self,
        env: TradingEnv,
        episodes: int = 10,
        deterministic: bool = True,
    ) -> Dict[str, float]:
        returns = []
        for ep in range(episodes):
            obs, _ = env.reset()
            done = False
            ep_return = 0.0
            while not done:
                action = self.predict(obs, deterministic=deterministic)
                obs, reward, done, truncated, info = env.step(action)
                ep_return += reward
                done = done or truncated
            returns.append(ep_return)
        return {
            "mean_return": float(np.mean(returns)),
            "std_return": float(np.std(returns)),
            "max_return": float(np.max(returns)),
            "min_return": float(np.min(returns)),
            "episodes": episodes,
        }
