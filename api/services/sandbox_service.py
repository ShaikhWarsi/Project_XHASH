from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, date

from decimal import Decimal

from persistence.models_sandbox import (
    SandboxOrders, SandboxTrades, SandboxPositions,
    SandboxHoldings, SandboxFunds, SandboxDailyPnL, SandboxConfig,
)
from persistence.multi_db import multi_db

logger = logging.getLogger(__name__)

# Default starting capital: ₹1 Crore
DEFAULT_CAPITAL = Decimal("10000000.00")


async def ensure_funds(session, user_id: str) -> SandboxFunds:
    from sqlalchemy import select
    result = await session.execute(
        select(SandboxFunds).where(SandboxFunds.user_id == user_id)
    )
    funds = result.scalar_one_or_none()
    if not funds:
        funds = SandboxFunds(
            user_id=user_id,
            total_capital=DEFAULT_CAPITAL,
            available_balance=DEFAULT_CAPITAL,
            used_margin=Decimal("0.00"),
        )
        session.add(funds)
        await session.commit()
        await session.refresh(funds)
    return funds


async def get_sandbox_config(session, key: str, default=None) -> str:
    from sqlalchemy import select
    result = await session.execute(
        select(SandboxConfig).where(SandboxConfig.config_key == key)
    )
    config = result.scalar_one_or_none()
    return config.config_value if config else default


async def get_positions(session, user_id: str) -> list[SandboxPositions]:
    from sqlalchemy import select
    result = await session.execute(
        select(SandboxPositions).where(SandboxPositions.user_id == user_id)
    )
    return result.scalars().all()


async def get_holdings(session, user_id: str) -> list[SandboxHoldings]:
    from sqlalchemy import select
    result = await session.execute(
        select(SandboxHoldings).where(SandboxHoldings.user_id == user_id)
    )
    return result.scalars().all()


async def get_trades(session, user_id: str, limit: int = 100) -> list[SandboxTrades]:
    from sqlalchemy import select
    result = await session.execute(
        select(SandboxTrades)
        .where(SandboxTrades.user_id == user_id)
        .order_by(SandboxTrades.trade_timestamp.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def get_orders(session, user_id: str, limit: int = 100) -> list[SandboxOrders]:
    from sqlalchemy import select
    result = await session.execute(
        select(SandboxOrders)
        .where(SandboxOrders.user_id == user_id)
        .order_by(SandboxOrders.order_timestamp.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def reset_sandbox(session, user_id: str) -> bool:
    try:
        from sqlalchemy import delete
        await session.execute(delete(SandboxOrders).where(SandboxOrders.user_id == user_id))
        await session.execute(delete(SandboxTrades).where(SandboxTrades.user_id == user_id))
        await session.execute(delete(SandboxPositions).where(SandboxPositions.user_id == user_id))
        await session.execute(delete(SandboxHoldings).where(SandboxHoldings.user_id == user_id))
        await session.execute(delete(SandboxDailyPnL).where(SandboxDailyPnL.user_id == user_id))

        result = await session.execute(
            select(SandboxFunds).where(SandboxFunds.user_id == user_id)
        )
        funds = result.scalar_one_or_none()
        if funds:
            funds.total_capital = DEFAULT_CAPITAL
            funds.available_balance = DEFAULT_CAPITAL
            funds.used_margin = Decimal("0.00")
            funds.realized_pnl = Decimal("0.00")
            funds.unrealized_pnl = Decimal("0.00")
            funds.total_pnl = Decimal("0.00")
            funds.reset_count += 1
            funds.last_reset_date = datetime.now(timezone.utc)

        await session.commit()
        return True
    except Exception as e:
        await session.rollback()
        logger.exception(f"Error resetting sandbox: {e}")
        return False
