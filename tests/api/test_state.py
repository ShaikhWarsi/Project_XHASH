from __future__ import annotations

import pytest

from api.state import AppState, MAX_HISTORY_SIZE
from core.types import PortfolioState


@pytest.mark.asyncio
async def test_async_get_portfolio_defaults():
    state = AppState()
    p = await state.async_get_portfolio()
    assert p.cash == 0.0
    assert p.total_value == 0.0
    assert p.positions == {}


@pytest.mark.asyncio
async def test_async_set_portfolio():
    state = AppState()
    p = PortfolioState(cash=1000.0, positions={}, total_value=1000.0)
    await state.async_set_portfolio(p)
    result = await state.async_get_portfolio()
    assert result.cash == 1000.0


@pytest.mark.asyncio
async def test_portfolio_history_capped():
    state = AppState()
    for i in range(MAX_HISTORY_SIZE + 10):
        p = PortfolioState(cash=float(i), positions={}, total_value=float(i))
        await state.async_set_portfolio(p)
    hist = await state.async_get_portfolio_history()
    assert len(hist) <= MAX_HISTORY_SIZE
