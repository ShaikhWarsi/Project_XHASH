from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from api.services.basket_order_service import execute_basket_order

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/basket-order", tags=["basket_order"])


class BasketLeg(BaseModel):
    symbol: str
    exchange: str
    action: str
    quantity: int
    pricetype: str = "MARKET"
    product: str = "MIS"
    price: Optional[float] = None
    trigger_price: Optional[float] = None
    strategy: Optional[str] = None


class BasketOrderRequest(BaseModel):
    apikey: str
    orders: list[BasketLeg]


class MockPlaceOrder:
    async def place(self, order: dict) -> dict:
        return {"orderid": f"MOCK_{order.get('symbol', 'UNKNOWN')}", "status": "success"}


@router.post("/")
async def place_basket_order(req: BasketOrderRequest):
    if not req.orders:
        return {
            "status": "error",
            "message": "No orders provided",
            "data": {"total_orders": 0, "successful": 0, "failed": 0, "results": []},
        }

    mock_place = MockPlaceOrder()

    async def place_fn(order_data):
        return await mock_place.place(order_data)

    result = await execute_basket_order(
        orders=[o.model_dump() for o in req.orders],
        place_order_fn=place_fn,
    )

    return result
