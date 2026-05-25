from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def sample_ohlcv() -> pd.DataFrame:
    n = 200
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    base = 100.0
    noise = np.random.default_rng(42).normal(0, 0.5, n)
    trend = np.linspace(0, 5, n)
    close = base + trend + noise.cumsum()
    high = close + np.abs(np.random.default_rng(42).normal(0, 0.3, n))
    low = close - np.abs(np.random.default_rng(42).normal(0, 0.3, n))
    open_ = close - np.random.default_rng(42).normal(0, 0.2, n)
    volume = np.random.default_rng(42).poisson(1000, n)

    df = pd.DataFrame({
        "open": open_, "high": high, "low": low,
        "close": close, "volume": volume,
    }, index=dates)
    df.attrs["symbol"] = "TEST"
    df.attrs["timeframe"] = "1h"
    return df


@pytest.fixture
def sample_portfolio():
    from core.enums import OrderSide
    from core.types import PortfolioState, Position
    return PortfolioState(
        cash=500_000.0,
        positions={
            "AAPL": Position(
                symbol="AAPL", quantity=100, side=OrderSide.BUY,
                entry_price=150.0, current_price=155.0,
            ),
        },
        total_value=515_500.0,
    )


@pytest.fixture
def sample_order():
    from core.enums import OrderSide, OrderType
    from core.types import Order
    return Order(
        symbol="AAPL",
        side=OrderSide.BUY,
        quantity=10,
        order_type=OrderType.MARKET,
        price=155.0,
    )
