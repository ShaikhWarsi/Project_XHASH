from __future__ import annotations

from typing import Dict, List, Optional

from api.models.schemas import PortfolioPosition
from core.enums import OrderSide
from core.types import PortfolioState, Position


def create_portfolio(
    initial_cash: float,
    margin_requirement: float,
    tickers: List[str],
    portfolio_positions: Optional[List[PortfolioPosition]] = None,
) -> PortfolioState:
    """Create a PortfolioState from request parameters."""
    positions: Dict[str, Position] = {}
    realized_gains: Dict[str, Dict[str, float]] = {}

    for ticker in tickers:
        realized_gains[ticker] = {"long": 0.0, "short": 0.0}

    if portfolio_positions:
        for pos in portfolio_positions:
            price = pos.price or 0.0
            side = OrderSide.BUY if pos.quantity > 0 else OrderSide.SHORT
            positions[pos.ticker] = Position(
                symbol=pos.ticker,
                quantity=abs(pos.quantity),
                side=side,
                entry_price=price,
                current_price=price,
            )

    long_val = sum(p.market_value for p in positions.values() if p.side == OrderSide.BUY)
    short_val = sum(p.market_value for p in positions.values() if p.side == OrderSide.SHORT)
    total_value = initial_cash + long_val - short_val

    return PortfolioState(
        cash=initial_cash,
        positions=positions,
        total_value=total_value,
        margin_used=0.0,
        margin_requirement=margin_requirement,
        version=0,
        realized_gains=realized_gains,
    )
