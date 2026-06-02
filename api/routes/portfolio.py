from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.state import app_state
from persistence import get_session
from persistence.repositories import PortfolioRepository

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("")
async def get_portfolio(session: AsyncSession = Depends(get_session)):
    p = await app_state.async_get_portfolio()
    positions = {}
    if p.positions and isinstance(p.positions, dict):
        for s, pos in p.positions.items():
            positions[s] = {
                "symbol": s,
                "quantity": getattr(pos, "quantity", 0),
                "side": pos.side.value if hasattr(pos, "side") and hasattr(pos.side, "value") else "LONG",
                "entry_price": getattr(pos, "entry_price", 0),
                "current_price": getattr(pos, "current_price", 0),
                "unrealized_pnl": getattr(pos, "unrealized_pnl", 0),
                "realized_pnl": getattr(pos, "realized_pnl", 0),
                "market_value": getattr(pos, "market_value", 0),
            }
    realized_pnl = 0.0
    if p.realized_gains and isinstance(p.realized_gains, dict):
        for v in p.realized_gains.values():
            if isinstance(v, dict):
                realized_pnl += v.get("long", 0) + v.get("short", 0)
            elif isinstance(v, (int, float)):
                realized_pnl += v

    await PortfolioRepository.snapshot(session, p)

    return {
        "cash": getattr(p, "cash", 0),
        "total_value": getattr(p, "total_value", 0),
        "margin_used": getattr(p, "margin_used", 0),
        "margin_req": getattr(p, "margin_requirement", 0),
        "realized_gains": realized_pnl,
        "positions": positions,
    }


@router.get("/history")
async def get_portfolio_history(session: AsyncSession = Depends(get_session)):
    entries = await PortfolioRepository.get_history(session)
    return [
        {
            "timestamp": e.timestamp.isoformat() if hasattr(e.timestamp, "isoformat") else str(e.timestamp),
            "total_value": e.total_value,
            "cash": e.cash,
        }
        for e in entries
    ]
