from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["paper"])


class PaperPosition(BaseModel):
    symbol: str
    side: str
    quantity: float
    entry_price: float
    current_price: float
    unrealized_pnl: float = 0.0


class PaperTrade(BaseModel):
    id: str
    symbol: str
    side: str
    type: str
    quantity: float
    price: float
    timestamp: float
    pnl: float | None = None


_paper = {
    "balance": 100000.0,
    "equity": 100000.0,
    "buyingPower": 200000.0,
    "openPnl": 0.0,
    "totalReturn": 0.0,
    "totalTrades": 0,
    "winRate": 0.0,
    "isRunning": False,
    "positions": [],
    "trades": [],
    "lastPrices": {},
}
_paper_async_lock = asyncio.Lock()

_wins = 0
_losses = 0
_price_cache: dict[str, tuple[float, float]] = {}
_PRICE_CACHE_TTL = 15.0

if os.environ.get("WARN_MULTI_WORKER", "1") == "1":
    import multiprocessing
    logger.warning("PAPER: Using in-memory _paper dict. Set WARN_MULTI_WORKER=0 to suppress. "
                   "Deploy with --workers 1 or add Redis-backed storage for multi-worker safety.")


async def _update_prices():
    import yfinance as yf
    now = time.time()
    try:
        symbols = list({p["symbol"] for p in _paper["positions"]})
        if not symbols:
            symbols = ["SPY", "QQQ", "AAPL"]
        symbols = symbols[:5]
        stale = [s for s in symbols if s not in _price_cache or now - _price_cache[s][1] > _PRICE_CACHE_TTL]
        for s in stale:
            try:
                ticker = yf.Ticker(s)
                df = await asyncio.to_thread(lambda t=ticker: t.history(period="1d"))
                if not df.empty:
                    price = float(df["Close"].iloc[-1])
                    _price_cache[s] = (price, now)
            except Exception:
                logger.debug("Failed to fetch price for %s", s)
                continue
        for s in symbols:
            cached = _price_cache.get(s)
            if cached:
                _paper["lastPrices"][s] = cached[0]
    except Exception:
        logger.warning("Failed to update paper prices", exc_info=True)


def _recalculate():
    global _wins, _losses
    total_pnl = 0.0
    for pos in _paper["positions"]:
        price = _paper["lastPrices"].get(pos["symbol"], pos["entry_price"])
        if pos["side"] == "BUY":
            pnl = (price - pos["entry_price"]) * pos["quantity"]
        else:
            pnl = (pos["entry_price"] - price) * pos["quantity"]
        pos["current_price"] = price
        pos["unrealized_pnl"] = round(pnl, 2)
        total_pnl += pnl

    _paper["openPnl"] = round(total_pnl, 2)
    _paper["equity"] = round(_paper["balance"] + total_pnl, 2)
    _paper["buyingPower"] = round(_paper["equity"] * 2, 2) if _paper["equity"] > 0 else 0
    _paper["totalReturn"] = round((_paper["equity"] - 100000) / 100000 * 100, 2)
    denominator = _wins + _losses
    if denominator > 0:
        _paper["winRate"] = round(_wins / denominator * 100, 1)


class PlaceOrderRequest(BaseModel):
    symbol: str
    side: str
    type: str = "MARKET"
    quantity: float
    price: float | None = None


def _write_audit_log(req: PlaceOrderRequest, request: Request):
    try:
        from .audit_routes import _audit_logs
        entry = {
            "action": "PAPER_ORDER",
            "entity_type": "order",
            "entity_id": "",
            "details": {
                "user": "paper",
                "symbol": req.symbol.upper(),
                "side": req.side,
                "quantity": req.quantity,
                "price": req.price,
                "source": "UI",
                "request_id": getattr(request.state, "request_id", ""),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        _audit_logs.append(entry)
        if len(_audit_logs) > 5000:
            _audit_logs[:len(_audit_logs) - 5000] = []
    except Exception:
        logger.debug("Failed to write paper audit log")


@router.get("/paper/account")
async def get_paper_account():
    await _update_prices()
    _recalculate()
    return _paper


@router.post("/paper/start")
async def start_paper():
    _paper["isRunning"] = True
    return {"success": True}


@router.post("/paper/stop")
async def stop_paper():
    _paper["isRunning"] = False
    return {"success": True}


@router.post("/paper/reset")
async def reset_paper():
    global _wins, _losses
    _wins = 0
    _losses = 0
    _paper.update({
        "balance": 100000,
        "equity": 100000,
        "buyingPower": 200000,
        "openPnl": 0,
        "totalReturn": 0,
        "totalTrades": 0,
        "winRate": 0,
        "isRunning": False,
        "positions": [],
        "trades": [],
        "lastPrices": {},
    })
    return {"success": True}


@router.post("/paper/order")
async def place_paper_order(req: PlaceOrderRequest, request: Request):
    global _wins, _losses
    async with _paper_async_lock:
        if not _paper["isRunning"]:
            raise HTTPException(400, "Paper trading not started")
        await _update_prices()
        price = req.price or _paper["lastPrices"].get(req.symbol, 100.0)
        trade_id = f"paper_{int(time.time() * 1000)}"
        trade = PaperTrade(id=trade_id, symbol=req.symbol, side=req.side, type=req.type, quantity=req.quantity, price=price, timestamp=time.time()).model_dump()
        _paper["trades"].append(trade)
        cost = price * req.quantity

        if req.side in ("BUY", "COVER"):
            if _paper["buyingPower"] < cost:
                raise HTTPException(400, "Insufficient buying power")
            _paper["balance"] -= cost
            existing = next((p for p in _paper["positions"] if p["symbol"] == req.symbol and p["side"] == req.side), None)
            if existing:
                total_qty = existing["quantity"] + req.quantity
                existing["entry_price"] = (existing["entry_price"] * existing["quantity"] + price * req.quantity) / total_qty
                existing["quantity"] = total_qty
            else:
                _paper["positions"].append(PaperPosition(symbol=req.symbol, side=req.side, quantity=req.quantity, entry_price=price, current_price=price).model_dump())
        else:
            pos = next((p for p in _paper["positions"] if p["symbol"] == req.symbol and p["side"] == ("BUY" if req.side == "SELL" else "SELL")), None)
            if not pos or pos["quantity"] < req.quantity:
                raise HTTPException(400, f"Insufficient position to {req.side} {req.symbol}")
            pnl = (price - pos["entry_price"]) * req.quantity if req.side == "SELL" else (pos["entry_price"] - price) * req.quantity
            _paper["balance"] += price * req.quantity
            pos["quantity"] -= req.quantity
            trade["pnl"] = round(pnl, 2)
            if pnl >= 0: _wins += 1
            else: _losses += 1
            _paper["totalTrades"] += 1
            if pos["quantity"] <= 0:
                _paper["positions"] = [p for p in _paper["positions"] if p["symbol"] != req.symbol or p["side"] != pos["side"]]

    async with _paper_async_lock:
        _recalculate()

    _write_audit_log(req, request)
    return {"success": True, "trade": trade, "account": _paper}


@router.get("/paper/positions")
async def get_paper_positions():
    await _update_prices()
    _recalculate()
    return {"positions": _paper["positions"]}


@router.get("/paper/trades")
async def get_paper_trades(limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0)):
    trades = _paper["trades"]
    total = len(trades)
    return {"trades": trades[offset:offset + limit], "total": total, "limit": limit, "offset": offset}


@router.get("/paper/history")
async def get_paper_history(limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0)):
    trades = _paper.get("trades", [])
    total = len(trades)
    return {"history": trades[offset:offset + limit], "total": total, "limit": limit, "offset": offset}
