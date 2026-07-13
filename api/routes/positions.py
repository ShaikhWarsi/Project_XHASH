from __future__ import annotations
from fastapi import APIRouter, Query
from api.state import app_state

router = APIRouter(prefix="/positions", tags=["positions"])


def _get_attr(pos: dict | object, name: str, default=0):
    if isinstance(pos, dict):
        return pos.get(name, default)
    return getattr(pos, name, default)


@router.get("")
async def list_positions(portfolio_id: str = Query("default", description="Portfolio identifier")):
    snapshot = await app_state.async_snapshot()
    portfolio = snapshot.get("portfolio", {})
    positions = portfolio.get("positions", {})
    total_value = portfolio.get("total_value", 0) if isinstance(portfolio, dict) else getattr(portfolio, "total_value", 0)
    result = []
    for symbol, pos in positions.items():
        entry_price = _get_attr(pos, "entry_price", 0)
        current_price = _get_attr(pos, "current_price", 0)
        quantity = _get_attr(pos, "quantity", 0)
        side = _get_attr(pos, "side", "LONG")
        market_value = _get_attr(pos, "market_value", 0)
        unrealized_pnl = _get_attr(pos, "unrealized_pnl", 0)
        realized_pnl = _get_attr(pos, "realized_pnl", 0)
        cost_basis = entry_price * quantity
        exposure_pct = (market_value / total_value * 100) if total_value else 0
        day_pnl = (current_price - entry_price) * quantity if entry_price else 0
        result.append({
            "_simulated": True,
            "symbol": symbol,
            "quantity": quantity,
            "side": side,
            "entryPrice": entry_price,
            "currentPrice": current_price,
            "marketValue": market_value,
            "unrealizedPnl": unrealized_pnl,
            "unrealizedPnlPercent": (unrealized_pnl / cost_basis * 100) if cost_basis else 0,
            "realizedPnl": realized_pnl,
            "dayPnl": round(day_pnl, 2),
            "dayPnlPercent": round((day_pnl / cost_basis * 100), 2) if cost_basis else 0,
            "exposure": market_value,
            "exposurePercent": round(exposure_pct, 2),
            "beta": 1.0,
        })
    return result
