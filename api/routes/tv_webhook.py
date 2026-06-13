from __future__ import annotations

import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.services.flow_openalgo_client import FlowOpenAlgoClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/openalgo/tradingview", tags=["tradingview"])

flow_client = FlowOpenAlgoClient()

TV_PASSPHRASE = os.getenv("TV_WEBHOOK_PASSPHRASE", "changeme")

ACTION_MAP = {
    "buy": "BUY",
    "sell": "SELL",
    "b": "BUY",
    "s": "SELL",
}


def map_action(raw: str) -> str:
    return ACTION_MAP.get(raw.strip().lower(), raw.strip().upper())


@router.post("/webhook")
async def webhook(body: dict):
    passphrase = body.get("passphrase", "")
    if passphrase != TV_PASSPHRASE:
        raise HTTPException(status_code=403, detail="Invalid passphrase")

    raw_action = body.get("action", "")
    symbol = body.get("symbol", "")
    order_type = body.get("orderType", "MARKET").upper()
    quantity_str = body.get("quantity", "1")

    if not raw_action or not symbol:
        raise HTTPException(status_code=400, detail="Missing required fields: action, symbol")

    action = map_action(raw_action)

    exchange = "NSE"
    trading_symbol = symbol
    if ":" in symbol:
        parts = symbol.split(":", 1)
        exchange = parts[0].upper()
        trading_symbol = parts[1]

    try:
        quantity = int(float(quantity_str))
    except (ValueError, TypeError):
        quantity = 1

    order_data = {
        "symbol": trading_symbol,
        "exchange": exchange,
        "action": action,
        "quantity": quantity,
        "product": "MIS",
        "pricetype": order_type,
    }

    result = await flow_client.place_order(order_data)
    logger.info("TradingView webhook order symbol=%s action=%s result=%s", symbol, action, result)
    return result


@router.get("/symbol-search")
async def symbol_search(q: str = ""):
    if not q.strip():
        return []
    from api.routes.market_data import search_symbols
    results = await search_symbols(q)
    tv_results = []
    for r in results:
        tv_results.append({
            "symbol": f"{r.get('exchange', 'NSE')}:{r.get('symbol', '')}",
            "description": r.get("description", r.get("symbol", "")),
            "exchange": r.get("exchange", "NSE"),
        })
    return tv_results
