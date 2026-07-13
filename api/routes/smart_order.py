from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from api.services.smart_order_service import calculate_delta_quantity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/smart-order", tags=["smart_order"])


class SmartOrderRequest(BaseModel):
    apikey: str
    symbol: str
    exchange: str
    action: str
    quantity: int
    pricetype: str = "MARKET"
    product: str = "MIS"
    price: Optional[float] = None
    trigger_price: Optional[float] = None
    strategy: Optional[str] = None
    squareoff: Optional[float] = None
    trailing_sl: Optional[float] = None


@router.post("/")
async def place_smart_order(req: SmartOrderRequest):
    current_position = 0

    delta = await calculate_delta_quantity(current_position, req.quantity, req.action)

    if delta["skip"]:
        return {
            "status": "success",
            "message": "Position already at requested level, no action needed",
            "data": {
                "symbol": req.symbol,
                "action": req.action,
                "quantity": 0,
                "effective_qty": delta["effective_qty"],
            },
        }

    return {
        "status": "success",
        "message": "Smart order calculated",
        "data": {
            "symbol": req.symbol,
            "action": delta["action"],
            "quantity": delta["delta_qty"],
            "effective_qty": delta["effective_qty"],
            "original_action": req.action,
            "original_quantity": req.quantity,
            "needs_position_fetch": True,
        },
    }
