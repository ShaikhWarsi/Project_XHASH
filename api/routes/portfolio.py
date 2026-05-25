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
    for s, pos in p.positions.items():
        positions[s] = {
            "symbol": s,
            "quantity": pos.quantity,
            "side": pos.side.value if hasattr(pos.side, "value") else "LONG",
            "entry_price": pos.entry_price,
            "current_price": pos.current_price,
            "unrealized_pnl": pos.unrealized_pnl,
            "realized_pnl": pos.realized_pnl,
            "market_value": pos.market_value,
        }
    realized_pnl = 0.0
    if isinstance(p.realized_gains, dict):
        for v in p.realized_gains.values():
            if isinstance(v, dict):
                realized_pnl += v.get("long", 0) + v.get("short", 0)
            elif isinstance(v, (int, float)):
                realized_pnl += v

    await PortfolioRepository.snapshot(session, p)

    return {
        "cash": p.cash,
        "total_value": p.total_value,
        "margin_used": p.margin_used,
        "margin_req": p.margin_requirement,
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
