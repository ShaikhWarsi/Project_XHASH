from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from persistence.multi_db import get_sandbox_db
from api.services.sandbox_service import (
    ensure_funds, get_positions, get_holdings,
    get_trades, get_orders, reset_sandbox, get_sandbox_config,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sandbox", tags=["sandbox"])


class ConfigUpdateRequest(BaseModel):
    config_key: str
    config_value: str
    description: str = None


class ResetRequest(BaseModel):
    user_id: str


@router.get("/dashboard")
async def sandbox_dashboard(
    user_id: str = Query("default"),
    session: AsyncSession = Depends(get_sandbox_db),
):
    funds = await ensure_funds(session, user_id)
    positions = await get_positions(session, user_id)
    trades = await get_trades(session, user_id, limit=20)

    return {
        "status": "success",
        "data": {
            "funds": {
                "total_capital": float(funds.total_capital),
                "available_balance": float(funds.available_balance),
                "used_margin": float(funds.used_margin),
                "realized_pnl": float(funds.realized_pnl),
                "unrealized_pnl": float(funds.unrealized_pnl),
                "total_pnl": float(funds.total_pnl),
            },
            "positions_count": len(positions),
            "recent_trades": [
                {
                    "tradeid": t.tradeid,
                    "symbol": t.symbol,
                    "action": t.action,
                    "quantity": t.quantity,
                    "price": float(t.price) if t.price else 0,
                    "timestamp": t.trade_timestamp.isoformat() if t.trade_timestamp else None,
                }
                for t in trades[:10]
            ],
        },
    }


@router.get("/positions")
async def list_positions(
    user_id: str = Query("default"),
    session: AsyncSession = Depends(get_sandbox_db),
):
    positions = await get_positions(session, user_id)
    return {
        "status": "success",
        "data": [
            {
                "symbol": p.symbol,
                "exchange": p.exchange,
                "product": p.product,
                "quantity": p.quantity,
                "average_price": float(p.average_price) if p.average_price else 0,
                "ltp": float(p.ltp) if p.ltp else 0,
                "pnl": float(p.pnl),
                "pnl_percent": float(p.pnl_percent),
            }
            for p in positions
        ],
    }


@router.get("/holdings")
async def list_holdings(
    user_id: str = Query("default"),
    session: AsyncSession = Depends(get_sandbox_db),
):
    holdings = await get_holdings(session, user_id)
    return {
        "status": "success",
        "data": [
            {
                "symbol": h.symbol,
                "exchange": h.exchange,
                "quantity": h.quantity,
                "average_price": float(h.average_price) if h.average_price else 0,
                "ltp": float(h.ltp) if h.ltp else 0,
                "pnl": float(h.pnl),
            }
            for h in holdings
        ],
    }


@router.get("/trades")
async def list_trades(
    user_id: str = Query("default"),
    limit: int = Query(100),
    session: AsyncSession = Depends(get_sandbox_db),
):
    trades = await get_trades(session, user_id, limit=limit)
    return {
        "status": "success",
        "data": [
            {
                "tradeid": t.tradeid,
                "symbol": t.symbol,
                "action": t.action,
                "quantity": t.quantity,
                "price": float(t.price) if t.price else 0,
                "product": t.product,
                "timestamp": t.trade_timestamp.isoformat() if t.trade_timestamp else None,
            }
            for t in trades
        ],
    }


@router.get("/orders")
async def list_orders(
    user_id: str = Query("default"),
    limit: int = Query(100),
    session: AsyncSession = Depends(get_sandbox_db),
):
    orders = await get_orders(session, user_id, limit=limit)
    return {
        "status": "success",
        "data": [
            {
                "orderid": o.orderid,
                "symbol": o.symbol,
                "action": o.action,
                "quantity": o.quantity,
                "price_type": o.price_type,
                "product": o.product,
                "order_status": o.order_status,
                "timestamp": o.order_timestamp.isoformat() if o.order_timestamp else None,
            }
            for o in orders
        ],
    }


@router.get("/funds")
async def get_funds(
    user_id: str = Query("default"),
    session: AsyncSession = Depends(get_sandbox_db),
):
    funds = await ensure_funds(session, user_id)
    return {
        "status": "success",
        "data": {
            "total_capital": float(funds.total_capital),
            "available_balance": float(funds.available_balance),
            "used_margin": float(funds.used_margin),
            "realized_pnl": float(funds.realized_pnl),
            "unrealized_pnl": float(funds.unrealized_pnl),
            "total_pnl": float(funds.total_pnl),
            "reset_count": funds.reset_count,
        },
    }


@router.post("/reset")
async def reset(
    req: ResetRequest,
    session: AsyncSession = Depends(get_sandbox_db),
):
    success = await reset_sandbox(session, req.user_id)
    if success:
        return {"status": "success", "message": "Sandbox reset to initial state"}
    return {"status": "error", "message": "Failed to reset sandbox"}


@router.get("/config")
async def get_config(
    session: AsyncSession = Depends(get_sandbox_db),
):
    from sqlalchemy import select
    from persistence.models_sandbox import SandboxConfig

    result = await session.execute(
        select(SandboxConfig).order_by(SandboxConfig.config_key)
    )
    configs = result.scalars().all()
    return {
        "status": "success",
        "data": {c.config_key: {"value": c.config_value, "description": c.description} for c in configs},
    }


@router.post("/config/update")
async def update_config(
    req: ConfigUpdateRequest,
    session: AsyncSession = Depends(get_sandbox_db),
):
    from sqlalchemy import select
    from persistence.models_sandbox import SandboxConfig

    result = await session.execute(
        select(SandboxConfig).where(SandboxConfig.config_key == req.config_key)
    )
    config = result.scalar_one_or_none()

    if config:
        config.config_value = req.config_value
        if req.description:
            config.description = req.description
    else:
        config = SandboxConfig(
            config_key=req.config_key,
            config_value=req.config_value,
            description=req.description,
        )
        session.add(config)

    await session.commit()
    return {"status": "success", "message": f"Config '{req.config_key}' updated"}
