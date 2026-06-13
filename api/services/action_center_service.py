from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import pytz

from persistence.models_auth import PendingOrder
from persistence.multi_db import multi_db

logger = logging.getLogger(__name__)


def _get_ist_timestamp() -> str:
    try:
        utc_now = datetime.now(pytz.UTC)
        ist = pytz.timezone("Asia/Kolkata")
        ist_now = utc_now.astimezone(ist)
        return ist_now.strftime("%Y-%m-%d %H:%M:%S IST")
    except Exception:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")


async def create_pending_order(session, user_id: str, api_type: str, order_data: dict) -> int | None:
    try:
        order = PendingOrder(
            user_id=user_id,
            api_type=api_type,
            order_data=json.dumps(order_data),
            created_at_ist=_get_ist_timestamp(),
            status="pending",
        )
        session.add(order)
        await session.commit()
        await session.refresh(order)
        logger.info(f"Pending order created: ID={order.id}, user={user_id}, type={api_type}")
        return order.id
    except Exception as e:
        await session.rollback()
        logger.exception(f"Error creating pending order: {e}")
        return None


async def get_pending_orders(session, user_id: str = None, status: str = None) -> list:
    from sqlalchemy import select
    try:
        query = select(PendingOrder)
        if user_id:
            query = query.where(PendingOrder.user_id == user_id)
        if status:
            query = query.where(PendingOrder.status == status)
        query = query.order_by(PendingOrder.created_at.desc())
        result = await session.execute(query)
        return result.scalars().all()
    except Exception as e:
        logger.exception(f"Error getting pending orders: {e}")
        return []


async def approve_order(session, order_id: int, approved_by: str, user_id: str) -> bool:
    from sqlalchemy import select
    try:
        result = await session.execute(
            select(PendingOrder).where(
                PendingOrder.id == order_id,
                PendingOrder.user_id == user_id,
                PendingOrder.status == "pending",
            )
        )
        order = result.scalar_one_or_none()
        if order:
            order.status = "approved"
            order.approved_by = approved_by
            order.approved_at = datetime.now(timezone.utc)
            order.approved_at_ist = _get_ist_timestamp()
            await session.commit()
            logger.info(f"Order approved: ID={order_id}, by={approved_by}")
            return True
        return False
    except Exception as e:
        await session.rollback()
        logger.exception(f"Error approving order: {e}")
        return False


async def reject_order(session, order_id: int, reason: str, rejected_by: str, user_id: str) -> bool:
    from sqlalchemy import select
    try:
        result = await session.execute(
            select(PendingOrder).where(
                PendingOrder.id == order_id,
                PendingOrder.user_id == user_id,
                PendingOrder.status == "pending",
            )
        )
        order = result.scalar_one_or_none()
        if order:
            order.status = "rejected"
            order.rejected_reason = reason
            order.rejected_by = rejected_by
            order.rejected_at = datetime.now(timezone.utc)
            order.rejected_at_ist = _get_ist_timestamp()
            await session.commit()
            logger.info(f"Order rejected: ID={order_id}, by={rejected_by}, reason={reason}")
            return True
        return False
    except Exception as e:
        await session.rollback()
        logger.exception(f"Error rejecting order: {e}")
        return False


async def get_pending_count(session, user_id: str) -> int:
    from sqlalchemy import select, func
    try:
        result = await session.execute(
            select(func.count(PendingOrder.id)).where(
                PendingOrder.user_id == user_id,
                PendingOrder.status == "pending",
            )
        )
        return result.scalar() or 0
    except Exception as e:
        logger.exception(f"Error getting pending count: {e}")
        return 0
