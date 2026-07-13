from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from persistence.multi_db import get_sandbox_db
from api.services.sandbox_service import ensure_funds, get_trades

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pnltracker", tags=["pnltracker"])


@router.get("/data")
async def get_pnl_data(
    user_id: str = Query("default"),
    session: AsyncSession = Depends(get_sandbox_db),
):
    funds = await ensure_funds(session, user_id)
    trades = await get_trades(session, user_id, limit=100)

    total_invested = float(funds.total_capital)
    current_value = total_invested + float(funds.total_pnl)
    pnl = float(funds.total_pnl)
    pnl_pct = (pnl / total_invested * 100) if total_invested else 0

    return {
        "status": "success",
        "data": {
            "total_invested": round(total_invested, 2),
            "current_value": round(current_value, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "realized_pnl": float(funds.realized_pnl),
            "unrealized_pnl": float(funds.unrealized_pnl),
            "total_trades": len(trades),
        },
    }


@router.get("/intraday")
async def get_intraday_pnl(
    user_id: str = Query("default"),
    session: AsyncSession = Depends(get_sandbox_db),
):
    funds = await ensure_funds(session, user_id)
    return {
        "status": "success",
        "data": {
            "today_realized_pnl": float(funds.today_realized_pnl),
            "unrealized_pnl": float(funds.unrealized_pnl),
            "total_pnl": float(funds.total_pnl),
        },
    }


@router.get("/history")
async def get_pnl_history(
    user_id: str = Query("default"),
    days: int = Query(30),
    session: AsyncSession = Depends(get_sandbox_db),
):
    from sqlalchemy import select
    from persistence.models_sandbox import SandboxDailyPnL

    cutoff = datetime.now(timezone.utc).date()
    from datetime import timedelta as dt_timedelta
    start_date = cutoff - dt_timedelta(days=days)

    result = await session.execute(
        select(SandboxDailyPnL)
        .where(
            SandboxDailyPnL.user_id == user_id,
            SandboxDailyPnL.date >= start_date,
        )
        .order_by(SandboxDailyPnL.date.asc())
    )
    pnl_records = result.scalars().all()

    return {
        "status": "success",
        "data": [
            {
                "date": str(r.date),
                "realized_pnl": float(r.realized_pnl),
                "unrealized_pnl": float(r.positions_unrealized_pnl) + float(r.holdings_unrealized_pnl),
                "total_mtm": float(r.total_mtm),
                "portfolio_value": float(r.portfolio_value),
            }
            for r in pnl_records
        ],
    }
