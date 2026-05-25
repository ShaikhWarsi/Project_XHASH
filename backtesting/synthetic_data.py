"""Synthetic market data generators for backtesting and validation.

Ported from CLUSTERING-MARKET-REGIMES-main synthetic data generators.
Provides GBM, Merton jump-diffusion, and Regime-Switching models.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd


@dataclass
class GBMParams:
    mu: float = 0.05
    sigma: float = 0.20
    dt: float = 1.0 / 252.0


@dataclass
class MertonParams:
    mu: float = 0.05
    sigma: float = 0.15
    lam: float = 5.0
    mu_j: float = 0.0
    sigma_j: float = 0.10
    dt: float = 1.0 / 252.0


@dataclass
class RegimeSwitchingParams:
    mu_bull: float = 0.12
    sigma_bull: float = 0.12
    mu_bear: float = -0.10
    sigma_bear: float = 0.30
    p_keep_bull: float = 0.95
    p_keep_bear: float = 0.90
    dt: float = 1.0 / 252.0


def generate_gbm(
    n_steps: int = 252 * 5,
    params: Optional[GBMParams] = None,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate Geometric Brownian Motion price series.

    Returns DataFrame with 'close' column.
    """
    if params is None:
        params = GBMParams()

    rng = np.random.default_rng(seed)
    dt = params.dt
    sqrt_dt = np.sqrt(dt)

    prices = np.empty(n_steps + 1)
    prices[0] = 100.0

    for t in range(n_steps):
        z = rng.normal(0, 1)
        drift = (params.mu - 0.5 * params.sigma ** 2) * dt
        diffusion = params.sigma * sqrt_dt * z
        prices[t + 1] = prices[t] * np.exp(drift + diffusion)

    index = pd.date_range("2020-01-01", periods=n_steps + 1, freq="D")
    return pd.DataFrame({"close": prices}, index=index)


def generate_jump_diffusion(
    n_steps: int = 252 * 5,
    params: Optional[MertonParams] = None,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate Merton jump-diffusion price series.

    Returns DataFrame with 'close' column.
    """
    if params is None:
        params = MertonParams()

    rng = np.random.default_rng(seed)
    dt = params.dt
    sqrt_dt = np.sqrt(dt)

    prices = np.empty(n_steps + 1)
    prices[0] = 100.0

    for t in range(n_steps):
        z = rng.normal(0, 1)
        n_jumps = rng.poisson(params.lam * dt)
        jump_sum = np.sum(rng.normal(params.mu_j, params.sigma_j, n_jumps))

        drift = (params.mu - 0.5 * params.sigma ** 2) * dt
        diffusion = params.sigma * sqrt_dt * z
        prices[t + 1] = prices[t] * np.exp(drift + diffusion + jump_sum)

    index = pd.date_range("2020-01-01", periods=n_steps + 1, freq="D")
    return pd.DataFrame({"close": prices}, index=index)


def generate_regime_switching(
    n_steps: int = 252 * 5,
    params: Optional[RegimeSwitchingParams] = None,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate Regime-Switching price series with bull/bear regimes.

    Returns DataFrame with 'close' and 'regime' columns.
    """
    if params is None:
        params = RegimeSwitchingParams()

    rng = np.random.default_rng(seed)
    dt = params.dt
    sqrt_dt = np.sqrt(dt)

    prices = np.empty(n_steps + 1)
    prices[0] = 100.0
    regime = np.empty(n_steps + 1, dtype=int)
    regime[0] = 0  # 0 = bull, 1 = bear

    for t in range(n_steps):
        if regime[t] == 0:
            mu, sigma = params.mu_bull, params.sigma_bull
            if rng.uniform() > params.p_keep_bull:
                regime[t + 1] = 1
            else:
                regime[t + 1] = 0
        else:
            mu, sigma = params.mu_bear, params.sigma_bear
            if rng.uniform() > params.p_keep_bear:
                regime[t + 1] = 0
            else:
                regime[t + 1] = 1

        z = rng.normal(0, 1)
        drift = (mu - 0.5 * sigma ** 2) * dt
        diffusion = sigma * sqrt_dt * z
        prices[t + 1] = prices[t] * np.exp(drift + diffusion)

    index = pd.date_range("2020-01-01", periods=n_steps + 1, freq="D")
    return pd.DataFrame({
        "close": prices,
        "regime": regime,
    }, index=index)
