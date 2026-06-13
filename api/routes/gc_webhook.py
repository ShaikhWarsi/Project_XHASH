from __future__ import annotations

import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.services.flow_openalgo_client import FlowOpenAlgoClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/openalgo/gocharting", tags=["gocharting"])

flow_client = FlowOpenAlgoClient()

GC_API_KEY = os.getenv("GOCHARTING_WEBHOOK_API_KEY", "default-gc-key")


@router.post("/webhook")
async def webhook(body: dict):
    api_key = body.get("api_key", "")
    if api_key != GC_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    symbol = body.get("symbol", "")
    exchange = body.get("exchange", "NSE").upper()
    action = body.get("action", "").strip().upper()
    quantity_str = body.get("quantity", "1")
    order_type = body.get("order_type", "MARKET").upper()

    if not symbol or not action:
        raise HTTPException(status_code=400, detail="Missing required fields: symbol, action")

    try:
        quantity = int(float(quantity_str))
    except (ValueError, TypeError):
        quantity = 1

    order_data = {
        "symbol": symbol,
        "exchange": exchange,
        "action": action,
        "quantity": quantity,
        "product": "MIS",
        "pricetype": order_type,
    }

    result = await flow_client.place_order(order_data)
    logger.info("GoCharting webhook order symbol=%s action=%s result=%s", symbol, action, result)
    return result


@router.get("/symbol-search")
async def symbol_search(q: str = ""):
    if not q.strip():
        return []
    from api.routes.market_data import search_symbols
    results = await search_symbols(q)
    gc_results = []
    for r in results:
        gc_results.append({
            "symbol": r.get("symbol", ""),
            "exchange": r.get("exchange", "NSE"),
            "description": r.get("description", r.get("symbol", "")),
        })
    return gc_results
