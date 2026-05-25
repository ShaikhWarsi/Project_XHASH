from __future__ import annotations
import json
import os
import threading
import uuid
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.state import app_state

router = APIRouter(tags=["orders"])

_ORDERS_FILE = Path(os.environ.get("ORDERS_FILE", str(Path.cwd() / ".data" / "orders.json")))

class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    BUY_TO_COVER = "BUY_TO_COVER"
    SELL_SHORT = "SELL_SHORT"

class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"
    TRAILING_STOP = "TRAILING_STOP"
    OCO = "OCO"

class TimeInForce(str, Enum):
    DAY = "DAY"
    GTC = "GTC"
    IOC = "IOC"
    FOK = "FOK"

class OrderRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10)
    side: OrderSide
    quantity: float = Field(..., gt=0)
    orderType: OrderType = OrderType.MARKET
    price: float | None = Field(None, gt=0)
    stopPrice: float | None = Field(None, gt=0)
    limitPrice: float | None = Field(None, gt=0)
    trailingStop: float | None = Field(None, gt=0)
    timeInForce: TimeInForce = TimeInForce.DAY
    ocoSymbol: str | None = None
    ocoPrice: float | None = Field(None, gt=0)
    ocoStopPrice: float | None = Field(None, gt=0)
    bracketTakeProfit: float | None = Field(None, gt=0)
    bracketStopLoss: float | None = Field(None, gt=0)
    reduceOnly: bool = False

class OrderResponse(BaseModel):
    id: str
    symbol: str
    side: str
    quantity: float
    orderType: str
    price: float | None = None
    stopPrice: float | None = None
    status: str = "SUBMITTED"
    filledQuantity: float = 0
    remainingQuantity: float = 0
    averageFillPrice: float | None = None
    reason: str | None = None
    createdAt: str = ""
    updatedAt: str = ""

_orders: list[dict[str, Any]] = []
_orders_lock = threading.Lock()


def _load_orders():
    global _orders
    try:
        if _ORDERS_FILE.exists():
            with open(_ORDERS_FILE, "r") as f:
                _orders = json.load(f)
    except Exception:
        _orders = []


def _save_orders():
    _ORDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_ORDERS_FILE, "w") as f:
        json.dump(_orders, f, default=str)


_load_orders()


@router.get("/orders")
async def list_orders():
    with _orders_lock:
        return list(_orders)


@router.post("/orders")
async def create_order(order: OrderRequest):
    order_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    entry = {
        "id": order_id,
        "symbol": order.symbol.upper(),
        "side": order.side.value,
        "quantity": order.quantity,
        "orderType": order.orderType.value,
        "price": order.price,
        "stopPrice": order.stopPrice,
        "status": "SUBMITTED",
        "filledQuantity": 0,
        "remainingQuantity": order.quantity,
        "averageFillPrice": None,
        "timeInForce": order.timeInForce.value,
        "reduceOnly": order.reduceOnly,
        "createdAt": now,
        "updatedAt": now,
    }
    with _orders_lock:
        _orders.insert(0, entry)
        _save_orders()
    return entry


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    with _orders_lock:
        for o in _orders:
            if o["id"] == order_id:
                return o
    raise HTTPException(404, "Order not found")


@router.delete("/orders/{order_id}")
async def cancel_order(order_id: str):
    with _orders_lock:
        for o in _orders:
            if o["id"] == order_id:
                o["status"] = "CANCELED"
                o["updatedAt"] = datetime.utcnow().isoformat()
                _save_orders()
                return {"success": True}
    raise HTTPException(404, "Order not found")
