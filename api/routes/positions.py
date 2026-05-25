from __future__ import annotations
from fastapi import APIRouter
from api.state import app_state

router = APIRouter(tags=["positions"])

@router.get("/positions")
async def list_positions():
    snapshot = await app_state.async_snapshot()
    portfolio = snapshot.get("portfolio", {})
    positions = portfolio.get("positions", {})
    result = []
    for symbol, pos in positions.items():
        entry_price = getattr(pos, "entry_price", pos.get("entry_price", 0)) if isinstance(pos, dict) else getattr(pos, "entry_price", 0)
        current_price = getattr(pos, "current_price", pos.get("current_price", 0)) if isinstance(pos, dict) else getattr(pos, "current_price", 0)
        quantity = getattr(pos, "quantity", pos.get("quantity", 0)) if isinstance(pos, dict) else getattr(pos, "quantity", 0)
        side = getattr(pos, "side", pos.get("side", "LONG")) if isinstance(pos, dict) else getattr(pos, "side", "LONG")
        market_value = getattr(pos, "market_value", pos.get("market_value", 0)) if isinstance(pos, dict) else getattr(pos, "market_value", 0)
        unrealized_pnl = getattr(pos, "unrealized_pnl", pos.get("unrealized_pnl", 0)) if isinstance(pos, dict) else getattr(pos, "unrealized_pnl", 0)
        result.append({
            "symbol": symbol,
            "quantity": quantity,
            "side": side,
            "entryPrice": entry_price,
            "currentPrice": current_price,
            "marketValue": market_value,
            "unrealizedPnl": unrealized_pnl,
            "unrealizedPnlPercent": (unrealized_pnl / (entry_price * quantity)) * 100 if entry_price and quantity else 0,
            "realizedPnl": 0,
            "dayPnl": 0,
            "dayPnlPercent": 0,
            "exposure": market_value,
            "exposurePercent": 0,
            "beta": 1.0,
        })
    return result
