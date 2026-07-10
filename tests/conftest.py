from __future__ import annotations

import asyncio
from typing import AsyncGenerator

import numpy as np
import pandas as pd
import pytest

from core.enums import OrderSide, OrderType
from core.types import Order, PortfolioState, Position


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def sample_portfolio() -> PortfolioState:
    return PortfolioState(
        cash=500_000.0,
        positions={
            "AAPL": Position(
                symbol="AAPL",
                quantity=100.0,
                side=OrderSide.BUY,
                entry_price=150.0,
                current_price=150.0,
            ),
        },
        total_value=515_000.0,
    )


@pytest.fixture
def sample_order() -> Order:
    return Order(
        symbol="AAPL",
        side=OrderSide.BUY,
        quantity=100,
        price=150.0,
        order_type=OrderType.MARKET,
    )


@pytest.fixture
def sample_ohlcv() -> pd.DataFrame:
    n = 200
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    np.random.seed(42)
    close = 100 + np.linspace(0, 5, n) + np.random.normal(0, 0.5, n)
    high = close + np.abs(np.random.normal(0, 0.3, n))
    low = close - np.abs(np.random.normal(0, 0.3, n))
    open_ = close - np.random.normal(0, 0.2, n)
    volume = np.random.poisson(1000, n)
    df = pd.DataFrame(
        {"open": open_, "high": high, "low": low, "close": close, "volume": volume},
        index=dates,
    )
    df.attrs["symbol"] = "TEST"
    return df
