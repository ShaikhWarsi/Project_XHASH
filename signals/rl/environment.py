from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

HAS_RL = False
try:
    import gymnasium as gym
    from gymnasium import spaces

    HAS_RL = True
except ImportError:
    gym = None  # type: ignore
    spaces = None  # type: ignore


class TradingEnv(gym.Env if HAS_RL else object):  # type: ignore
    metadata = {"render_modes": ["human"]}

    def __init__(
        self,
        df: pd.DataFrame,
        window_size: int = 20,
        initial_balance: float = 10000.0,
        commission: float = 0.001,
        render_mode: Optional[str] = None,
    ):
        if not HAS_RL:
            raise ImportError("gymnasium is required. Install: pip install trading-engine[rl]")
        super().__init__()
        self.df = df
        self.window_size = window_size
        self.initial_balance = initial_balance
        self.commission = commission
        self.render_mode = render_mode

        self._features = self._build_features()
        self.n_features = self._features.shape[1]
        self.n_actions = 3  # 0: hold, 1: buy, 2: sell

        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(self.window_size, self.n_features),
            dtype=np.float32,
        )
        self.action_space = spaces.Discrete(self.n_actions)

        self.reset()

    def _build_features(self) -> np.ndarray:
        features = []
        df = self.df.copy()
        close = df.get("close", df.get("Close", df.iloc[:, 0]))
        features.append(close.pct_change().fillna(0))
        features.append(close / close.expanding().mean() - 1)
        volume = df.get("volume", df.get("Volume", df.iloc[:, 1] if df.shape[1] > 1 else pd.Series(0, index=df.index)))
        features.append(volume.pct_change().fillna(0))
        features.append(close.rolling(5).mean() / close - 1)
        features.append(close.rolling(10).mean() / close - 1)
        features.append(close.rolling(20).std().fillna(0))
        result = np.column_stack(features)
        return np.nan_to_num(result, nan=0.0, posinf=0.0, neginf=0.0)

    def reset(self, *, seed: Optional[int] = None, options: Optional[Dict[str, Any]] = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        super().reset(seed=seed)
        self.balance = self.initial_balance
        self.holdings = 0.0
        self.current_step = self.window_size
        self.total_shares = 0.0
        self.total_trades = 0
        self.entry_price = 0.0
        return self._get_obs(), {}

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        current_price = self._current_price()
        done = self.current_step >= len(self.df) - 1
        reward = 0.0

        if action == 1 and self.balance > 0:  # buy
            shares = (self.balance * (1 - self.commission)) / current_price
            cost = shares * current_price
            self.holdings += shares
            self.balance -= cost * (1 + self.commission)
            self.total_shares += shares
            self.total_trades += 1
            self.entry_price = current_price
        elif action == 2 and self.holdings > 0:  # sell
            proceeds = self.holdings * current_price * (1 - self.commission)
            self.balance += proceeds
            self.holdings = 0.0
            self.total_trades += 1

        portfolio_value = self.balance + self.holdings * current_price
        reward = portfolio_value - (self.balance + self.holdings * self._prev_price()) if self.current_step > self.window_size else 0.0

        self.current_step += 1
        truncated = False

        return self._get_obs(), reward, done, truncated, {}

    def _current_price(self) -> float:
        idx = min(self.current_step, len(self.df) - 1)
        return float(self.df.iloc[idx].get("close", self.df.iloc[idx].get("Close", self.df.iloc[idx, 0])))

    def _prev_price(self) -> float:
        idx = max(0, self.current_step - 1)
        return float(self.df.iloc[idx].get("close", self.df.iloc[idx].get("Close", self.df.iloc[idx, 0])))

    def _get_obs(self) -> np.ndarray:
        start = max(0, self.current_step - self.window_size)
        end = max(start + self.window_size, self.current_step)
        obs = self._features[start:end]
        if len(obs) < self.window_size:
            pad = np.zeros((self.window_size - len(obs), self.n_features))
            obs = np.vstack([pad, obs])
        return obs.astype(np.float32)

    def render(self):
        if self.render_mode == "human":
            price = self._current_price()
            pv = self.balance + self.holdings * price
            print(f"Step: {self.current_step}, Balance: {self.balance:.2f}, Holdings: {self.holdings:.4f}, Value: {pv:.2f}")
