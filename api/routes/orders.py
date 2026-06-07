from __future__ import annotations
import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from api.state import app_state

logger = logging.getLogger(__name__)

_SINGLE_WORKER_WARNED = False

_MAX_QUANTITY = int(os.environ.get("ORDER_MAX_QTY", "10000"))
_SYMBOL_ALLOWLIST_ENABLED = os.environ.get("ORDER_SYMBOL_ALLOWLIST", "1") == "1"
_SYMBOL_ALLOWLIST: set[str] = set()

router = APIRouter(tags=["orders"])

# ── Rate limiter ──
_order_rate: dict[str, list[float]] = {}
_order_rate_lock = asyncio.Lock()
_MAX_ORDERS_PER_MINUTE = int(os.environ.get("ORDER_RATE_LIMIT", "30"))

async def _check_order_rate(user_id: str, request: Request):
    now = time.time()
    async with _order_rate_lock:
        timestamps = _order_rate.get(user_id, [])
        timestamps = [t for t in timestamps if now - t < 60]
        if len(timestamps) >= _MAX_ORDERS_PER_MINUTE:
            raise HTTPException(429, detail=f"Rate limit exceeded: max {_MAX_ORDERS_PER_MINUTE} orders/minute")
        timestamps.append(now)
        _order_rate[user_id] = timestamps

def _load_symbol_allowlist():
    global _SYMBOL_ALLOWLIST
    path = os.environ.get("ORDER_SYMBOL_ALLOWLIST_FILE", "")
    if path and os.path.exists(path):
        try:
            with open(path) as f:
                _SYMBOL_ALLOWLIST = set(json.load(f))
            logger.info("Loaded %d symbols into allowlist", len(_SYMBOL_ALLOWLIST))
            return
        except Exception as e:
            logger.warning("Failed to load symbol allowlist: %s", e)
    try:
        from .market_data_constants import POPULAR_SYMBOLS as _ps
        _SYMBOL_ALLOWLIST = {s["symbol"] for s in _ps}
    except Exception:
        _SYMBOL_ALLOWLIST = {"AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "SPY", "QQQ", "BTC-USD", "ETH-USD"}

_load_symbol_allowlist()

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
    idempotencyKey: str = ""


# ── Idempotency store ──
_idempotent_keys: dict[str, dict] = {}
_idempotent_lock = asyncio.Lock()
_IDEMPOTENT_TTL = timedelta(hours=24)


async def _check_idempotency(key: str) -> dict | None:
    if not key:
        return None
    async with _idempotent_lock:
        existing = _idempotent_keys.get(key)
        if existing:
            age = datetime.now(timezone.utc) - datetime.fromisoformat(existing.get("createdAt", "2000-01-01"))
            if age < _IDEMPOTENT_TTL:
                return existing
            del _idempotent_keys[key]
        return None


async def _store_idempotency(key: str, entry: dict):
    if not key:
        return
    async with _idempotent_lock:
        _idempotent_keys[key] = entry
        if len(_idempotent_keys) > 10000:
            cutoff = datetime.now(timezone.utc) - _IDEMPOTENT_TTL
            _idempotent_keys = {k: v for k, v in _idempotent_keys.items()
                                if datetime.fromisoformat(v.get("createdAt", "2000-01-01")) > cutoff}

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
_orders_lock = asyncio.Lock()


def _load_orders():
    global _orders
    try:
        if _ORDERS_FILE.exists():
            with open(_ORDERS_FILE, "r") as f:
                _orders = json.load(f)
    except Exception as e:
        logger.warning("Failed to load orders file: %s", e)
        _orders = []


def _save_orders():
    _ORDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_ORDERS_FILE, "w") as f:
        json.dump(_orders, f, default=str)


_load_orders()

_LAST_MARKET_PRICES: dict[str, float] = {}
_LAST_MARKET_PRICE_TIME = 0.0

async def _get_market_price(symbol: str) -> float | None:
    global _LAST_MARKET_PRICE_TIME
    now = time.time()
    if now - _LAST_MARKET_PRICE_TIME > 30 or symbol not in _LAST_MARKET_PRICES:
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            df = await asyncio.to_thread(lambda: ticker.history(period="1d"))
            if not df.empty:
                price = float(df["Close"].iloc[-1])
                _LAST_MARKET_PRICES[symbol] = price
                _LAST_MARKET_PRICE_TIME = now
                return price
        except Exception as e:
            logger.warning("Failed to fetch market price for %s: %s", symbol, e)
    return _LAST_MARKET_PRICES.get(symbol)

async def _record_trade(order: OrderRequest, fill_price: float):
    try:
        from api.state import app_state as _as
        trade = {
            "id": "ord_" + str(len(getattr(_as, "_trades", [])) + 1),
            "symbol": order.symbol.upper(),
            "side": order.side.value.lower(),
            "quantity": order.quantity,
            "price": fill_price,
            "pnl": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "signal_type": "order_placement",
        }
        if hasattr(_as, "_trades"):
            _as._trades.append(trade)
    except Exception as e:
        logger.warning("Failed to record trade: %s", e)

if os.environ.get("WARN_MULTI_WORKER", "1") == "1":
    import multiprocessing
    _SINGLE_WORKER_WARNED = True
    logger.warning("ORDERS: Using in-memory _orders list. Set WARN_MULTI_WORKER=0 to suppress. "
                   "Deploy with --workers 1 or add Redis-backed storage for multi-worker safety.")


@router.get("/orders")
async def list_orders(user_id: str = Query(default="")):
    session_id = user_id or os.environ.get("ORDER_DEFAULT_SESSION", "default")
    async with _orders_lock:
        return [o for o in _orders if o.get("user_id") == session_id]


@router.post("/orders")
async def create_order(
    order: OrderRequest,
    request: Request,
    user_id: str = Query(default=""),
    idempotency_key: str = Header("", alias="Idempotency-Key"),
):
    session_id = user_id or os.environ.get("ORDER_DEFAULT_SESSION", "default")

    # Idempotency check
    cached = await _check_idempotency(idempotency_key)
    if cached:
        logger.info("Idempotency hit for key=%s order=%s", idempotency_key[:8], cached.get("id"))
        return cached

    await _check_order_rate(session_id, request)
    if order.quantity > _MAX_QUANTITY:
        raise HTTPException(400, detail=f"Quantity {order.quantity} exceeds max {_MAX_QUANTITY}")
    if _SYMBOL_ALLOWLIST_ENABLED and order.symbol.upper() not in _SYMBOL_ALLOWLIST:
        raise HTTPException(400, detail=f"Symbol {order.symbol} not in trading allowlist")
    try:
        from risk.engine import RiskEngine
        from core.types import Order as CoreOrder, OrderSide as CoreOrderSide, OrderType as CoreOrderType
        from api.state import app_state
        _side_map = {"BUY": CoreOrderSide.BUY, "SELL": CoreOrderSide.SELL, "BUY_TO_COVER": CoreOrderSide.BUY_TO_COVER, "SELL_SHORT": CoreOrderSide.SELL_SHORT}
        _type_map = {"MARKET": CoreOrderType.MARKET, "LIMIT": CoreOrderType.LIMIT, "STOP": CoreOrderType.STOP}
        co = CoreOrder(
            symbol=order.symbol,
            side=_side_map.get(order.side.value, CoreOrderSide.BUY),
            quantity=order.quantity,
            order_type=_type_map.get(order.orderType.value, CoreOrderType.MARKET),
            price=order.price or 0.0,
        )
        portfolio = await app_state.async_get_portfolio()
        engine = RiskEngine()
        passed, reason = engine.validate_order(co, portfolio, order.price or 0.0)
        if not passed:
            raise HTTPException(status_code=400, detail=f"Risk check failed: {reason}")
    except ImportError:
        pass
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Risk engine check failed: %s", e)

    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    source = "API"
    if request.headers.get("User-Agent", "").startswith("agent"):
        source = "agent"
    elif request.headers.get("Origin", ""):
        source = "UI"

    entry = {
        "id": order_id,
        "user_id": session_id,
        "symbol": order.symbol.upper(),
        "side": order.side.value,
        "quantity": order.quantity,
        "orderType": order.orderType.value,
        "price": order.price,
        "stopPrice": order.stopPrice,
        "limitPrice": order.limitPrice,
        "trailingStop": order.trailingStop,
        "ocoSymbol": order.ocoSymbol,
        "ocoPrice": order.ocoPrice,
        "ocoStopPrice": order.ocoStopPrice,
        "bracketTakeProfit": order.bracketTakeProfit,
        "bracketStopLoss": order.bracketStopLoss,
        "status": "SUBMITTED",
        "filledQuantity": 0,
        "remainingQuantity": order.quantity,
        "averageFillPrice": None,
        "timeInForce": order.timeInForce.value,
        "reduceOnly": order.reduceOnly,
        "source": source,
        "createdAt": now,
        "updatedAt": now,
    }
    async with _orders_lock:
        _orders.insert(0, entry)
        await asyncio.to_thread(_save_orders)

    await _store_idempotency(idempotency_key, entry)

    # Audit log
    _write_order_audit(session_id, order, "SUBMITTED", source, request)

    # Auto-fill MARKET orders immediately (simulated execution)
    if order.orderType == OrderType.MARKET:
        fill_price = order.price or (await _get_market_price(order.symbol))
        if fill_price:
            entry["status"] = "FILLED"
            entry["filledQuantity"] = order.quantity
            entry["remainingQuantity"] = 0
            entry["averageFillPrice"] = fill_price
            entry["updatedAt"] = datetime.now(timezone.utc).isoformat()
            async with _orders_lock:
                await asyncio.to_thread(_save_orders)
            try:
                await _record_trade(order, fill_price)
            except Exception:
                logger.warning("Failed to record trade for %s", order.symbol)
            _write_order_audit(session_id, order, "FILLED", source, request)

    return entry


def _write_order_audit(session_id: str, order: OrderRequest, status: str, source: str, request: Request):
    try:
        from .audit_routes import _audit_logs
        entry = {
            "action": f"ORDER {status}",
            "entity_type": "order",
            "entity_id": "",
            "details": {
                "user": session_id,
                "symbol": order.symbol.upper(),
                "side": order.side.value,
                "quantity": order.quantity,
                "price": order.price,
                "source": source,
                "status": status,
                "request_id": getattr(request.state, "request_id", ""),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        _audit_logs.append(entry)
        if len(_audit_logs) > 5000:
            _audit_logs[:len(_audit_logs) - 5000] = []
    except Exception:
        pass


@router.get("/orders/{order_id}")
async def get_order(order_id: str, user_id: str = Query(default="")):
    session_id = user_id or os.environ.get("ORDER_DEFAULT_SESSION", "default")
    async with _orders_lock:
        for o in _orders:
            if o["id"] == order_id and o.get("user_id") == session_id:
                return o
    raise HTTPException(404, "Order not found")


@router.delete("/orders/{order_id}")
async def cancel_order(order_id: str, request: Request, user_id: str = Query(default="")):
    session_id = user_id or os.environ.get("ORDER_DEFAULT_SESSION", "default")
    async with _orders_lock:
        for o in _orders:
            if o["id"] == order_id and o.get("user_id") == session_id:
                o["status"] = "CANCELED"
                o["updatedAt"] = datetime.now(timezone.utc).isoformat()
                await asyncio.to_thread(_save_orders)
                return {"success": True}
    raise HTTPException(404, "Order not found")
