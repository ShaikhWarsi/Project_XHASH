from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from persistence.multi_db import get_auth_db
from api.services.action_center_service import (
    create_pending_order, get_pending_orders,
    approve_order, reject_order, get_pending_count,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/action-center", tags=["action_center"])


class CreatePendingOrderRequest(BaseModel):
    user_id: str
    api_type: str = "placeorder"
    order_data: dict


class ApproveRequest(BaseModel):
    user_id: str
    approved_by: str = "admin"


class RejectRequest(BaseModel):
    user_id: str
    rejected_by: str = "admin"
    reason: str = "Rejected"


@router.get("/pending")
async def list_pending_orders(
    user_id: str = None,
    status: str = None,
    session: AsyncSession = Depends(get_auth_db),
):
    orders = await get_pending_orders(session, user_id=user_id, status=status)
    return {
        "status": "success",
        "data": [
            {
                "id": o.id,
                "user_id": o.user_id,
                "api_type": o.api_type,
                "order_data": json.loads(o.order_data) if isinstance(o.order_data, str) else o.order_data,
                "status": o.status,
                "created_at_ist": o.created_at_ist,
                "approved_at_ist": o.approved_at_ist,
                "rejected_at_ist": o.rejected_at_ist,
                "rejected_reason": o.rejected_reason,
            }
            for o in orders
        ],
    }


@router.post("/pending")
async def add_pending_order(
    req: CreatePendingOrderRequest,
    session: AsyncSession = Depends(get_auth_db),
):
    order_id = await create_pending_order(
        session, req.user_id, req.api_type, req.order_data
    )
    if order_id:
        return {
            "status": "success",
            "message": "Order created and pending approval",
            "data": {"pending_order_id": order_id},
        }
    raise HTTPException(status_code=500, detail="Failed to create pending order")


@router.post("/approve/{order_id}")
async def approve_pending_order(
    order_id: int,
    req: ApproveRequest,
    session: AsyncSession = Depends(get_auth_db),
):
    success = await approve_order(session, order_id, req.approved_by, req.user_id)
    if success:
        return {"status": "success", "message": f"Order {order_id} approved"}
    raise HTTPException(status_code=400, detail="Order not found or already processed")


@router.post("/reject/{order_id}")
async def reject_pending_order(
    order_id: int,
    req: RejectRequest,
    session: AsyncSession = Depends(get_auth_db),
):
    success = await reject_order(session, order_id, req.reason, req.rejected_by, req.user_id)
    if success:
        return {"status": "success", "message": f"Order {order_id} rejected"}
    raise HTTPException(status_code=400, detail="Order not found or already processed")


@router.get("/count/{user_id}")
async def count_pending(
    user_id: str,
    session: AsyncSession = Depends(get_auth_db),
):
    count = await get_pending_count(session, user_id)
    return {"status": "success", "data": {"user_id": user_id, "pending_count": count}}
