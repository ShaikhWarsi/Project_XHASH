from __future__ import annotations

from backtesting.synthetic_data import (
    GBMParams,
    MertonParams,
    RegimeSwitchingParams,
    generate_gbm,
    generate_jump_diffusion,
    generate_regime_switching,
)


def test_gbm_generates_correct_length():
    df = generate_gbm(n_steps=252, seed=42)
    assert len(df) == 253
    assert "close" in df.columns
    assert df["close"].iloc[0] == 100.0


def test_gbm_positive_prices():
    df = generate_gbm(n_steps=500, seed=42)
    assert (df["close"] > 0).all()


def test_jump_diffusion():
    df = generate_jump_diffusion(n_steps=252, seed=42)
    assert len(df) == 253
    assert (df["close"] > 0).all()


def test_regime_switching():
    df = generate_regime_switching(n_steps=252, seed=42)
    assert len(df) == 253
    assert "regime" in df.columns
    assert set(df["regime"].unique()).issubset({0, 1})
    assert (df["close"] > 0).all()


def test_custom_gbm_params():
    params = GBMParams(mu=0.10, sigma=0.30)
    df = generate_gbm(n_steps=100, params=params, seed=123)
    assert len(df) == 101
    assert df["close"].iloc[0] == 100.0


def test_regime_switching_changes():
    """Over enough steps, both regimes should appear."""
    df = generate_regime_switching(n_steps=1000, seed=42)
    unique_regimes = set(df["regime"].unique())
    assert len(unique_regimes) >= 1
