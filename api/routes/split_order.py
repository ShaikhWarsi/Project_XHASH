from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from api.services.split_order_service import split_order

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/split-order", tags=["split_order"])


class SplitOrderRequest(BaseModel):
    apikey: str
    symbol: str
    exchange: str
    action: str
    quantity: int
    splitsize: int
    pricetype: str = "MARKET"
    product: str = "MIS"
    price: float | None = None
    trigger_price: float | None = None
    strategy: str | None = None


@router.post("")
async def split_order_endpoint(req: SplitOrderRequest):
    data = req.model_dump()
    split_size = data.pop("splitsize")
    data["splitsize"] = split_size

    success, response_data, status_code = await split_order(
        split_data=data,
        is_analyze=False,
    )
    from fastapi.responses import JSONResponse
    return JSONResponse(content=response_data, status_code=status_code)
