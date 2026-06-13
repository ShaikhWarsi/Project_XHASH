from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/playground", tags=["playground"])

_API_ENDPOINTS: list[dict[str, Any]] = [
    # ── Orders ──
    {
        "path": "/api/v1/placeorder",
        "method": "POST",
        "category": "Orders",
        "description": "Place a new order (BUY/SELL) with symbol, exchange, quantity, price type and product",
        "params": {
            "apikey": "string",
            "strategy": "string",
            "symbol": "string",
            "exchange": "string",
            "action": "BUY | SELL",
            "quantity": "int",
            "pricetype": "MARKET | LIMIT | STOPLOSS",
            "product": "CNC | NRML | MIS",
            "price": "float (optional)",
            "trigger_price": "float (optional)",
        },
    },
    {
        "path": "/api/v1/modifyorder",
        "method": "POST",
        "category": "Orders",
        "description": "Modify an existing open order by order ID",
        "params": {
            "apikey": "string",
            "order_id": "string",
            "symbol": "string",
            "exchange": "string",
            "quantity": "int",
            "price": "float",
            "trigger_price": "float (optional)",
            "pricetype": "MARKET | LIMIT | STOPLOSS",
        },
    },
    {
        "path": "/api/v1/cancelorder",
        "method": "POST",
        "category": "Orders",
        "description": "Cancel an open order by order ID",
        "params": {
            "apikey": "string",
            "order_id": "string",
        },
    },
    # ── Data ──
    {
        "path": "/api/v1/orderbook",
        "method": "POST",
        "category": "Data",
        "description": "Retrieve the current order book with all open orders",
        "params": {"apikey": "string"},
    },
    {
        "path": "/api/v1/positionbook",
        "method": "POST",
        "category": "Data",
        "description": "Retrieve current open positions across all symbols",
        "params": {"apikey": "string"},
    },
    {
        "path": "/api/v1/holdings",
        "method": "POST",
        "category": "Data",
        "description": "Retrieve current holdings/portfolio",
        "params": {"apikey": "string"},
    },
    {
        "path": "/api/v1/funds",
        "method": "POST",
        "category": "Data",
        "description": "Retrieve available funds and margin details",
        "params": {"apikey": "string"},
    },
    {
        "path": "/api/v1/tradebook",
        "method": "POST",
        "category": "Data",
        "description": "Retrieve executed trades history",
        "params": {"apikey": "string"},
    },
    # ── Quotes & Market Data ──
    {
        "path": "/api/v1/quote",
        "method": "POST",
        "category": "Quotes",
        "description": "Get real-time quote for a single symbol",
        "params": {
            "apikey": "string",
            "symbol": "string",
            "exchange": "string",
        },
    },
    {
        "path": "/api/v1/multiquotes",
        "method": "POST",
        "category": "Quotes",
        "description": "Get real-time quotes for multiple symbols at once",
        "params": {
            "apikey": "string",
            "symbols": "string (comma-separated)",
            "exchange": "string",
        },
    },
    # ── Historical Data ──
    {
        "path": "/api/v1/historical",
        "method": "POST",
        "category": "Historical",
        "description": "Fetch historical OHLCV data for a symbol",
        "params": {
            "apikey": "string",
            "symbol": "string",
            "exchange": "string",
            "interval": "1m | 5m | 15m | 1d | 1wk",
            "from_date": "YYYY-MM-DD",
            "to_date": "YYYY-MM-DD",
        },
    },
    # ── Options ──
    {
        "path": "/api/v1/optionchain",
        "method": "POST",
        "category": "Options",
        "description": "Fetch option chain data for a given symbol and expiry",
        "params": {
            "apikey": "string",
            "symbol": "string",
            "exchange": "string",
            "expiry": "YYYY-MM-DD (optional)",
        },
    },
    {
        "path": "/api/v1/optiongreeks",
        "method": "POST",
        "category": "Options",
        "description": "Calculate option Greeks for a given option contract",
        "params": {
            "apikey": "string",
            "symbol": "string",
            "exchange": "string",
            "expiry": "YYYY-MM-DD",
            "strike": "float",
            "option_type": "CE | PE",
            "underlying_price": "float",
        },
    },
    {
        "path": "/api/v1/multioptiongreeks",
        "method": "POST",
        "category": "Options",
        "description": "Calculate option Greeks for multiple option contracts at once",
        "params": {
            "apikey": "string",
            "contracts": "array[object]",
        },
    },
    # ── GTT (Good Till Triggered) ──
    {
        "path": "/openalgo/gtt/place",
        "method": "POST",
        "category": "GTT",
        "description": "Place a Good-Till-Triggered order",
        "params": {
            "apikey": "string",
            "strategy": "string",
            "trigger_type": "SINGLE | OCO",
            "exchange": "string",
            "symbol": "string",
            "action": "BUY | SELL",
            "product": "CNC | NRML",
            "quantity": "int",
            "price": "float",
            "triggerprice_sl": "float (optional)",
            "triggerprice_tg": "float (optional)",
            "stoploss": "float (optional)",
            "target": "float (optional)",
        },
    },
    {
        "path": "/openalgo/gtt/modify",
        "method": "POST",
        "category": "GTT",
        "description": "Modify an existing GTT order",
        "params": {
            "apikey": "string",
            "trigger_id": "string",
            "strategy": "string",
            "trigger_type": "SINGLE | OCO",
            "exchange": "string",
            "symbol": "string",
            "action": "BUY | SELL",
            "quantity": "int",
            "price": "float",
        },
    },
    {
        "path": "/openalgo/gtt/cancel",
        "method": "POST",
        "category": "GTT",
        "description": "Cancel a GTT order by trigger ID",
        "params": {
            "apikey": "string",
            "trigger_id": "string",
        },
    },
    {
        "path": "/openalgo/gtt/orderbook",
        "method": "POST",
        "category": "GTT",
        "description": "Retrieve all active GTT orders",
        "params": {"apikey": "string"},
    },
    # ── Advanced Orders ──
    {
        "path": "/api/v1/split-order",
        "method": "POST",
        "category": "Advanced Orders",
        "description": "Split a large order into smaller chunks",
        "params": {
            "apikey": "string",
            "symbol": "string",
            "exchange": "string",
            "action": "BUY | SELL",
            "quantity": "int",
            "splitsize": "int",
            "pricetype": "MARKET | LIMIT",
            "product": "MIS | CNC | NRML",
            "price": "float (optional)",
            "trigger_price": "float (optional)",
        },
    },
    {
        "path": "/api/v1/smart-order",
        "method": "POST",
        "category": "Advanced Orders",
        "description": "Place a smart order that calculates delta quantity based on current position",
        "params": {
            "apikey": "string",
            "symbol": "string",
            "exchange": "string",
            "action": "BUY | SELL",
            "quantity": "int",
            "pricetype": "MARKET | LIMIT",
            "product": "MIS | CNC | NRML",
            "price": "float (optional)",
            "trigger_price": "float (optional)",
            "squareoff": "float (optional)",
            "trailing_sl": "float (optional)",
        },
    },
    {
        "path": "/api/v1/basket-order",
        "method": "POST",
        "category": "Advanced Orders",
        "description": "Execute multiple orders as a single basket",
        "params": {
            "apikey": "string",
            "orders": "array[object] (each with symbol, exchange, action, quantity, pricetype, product)",
        },
    },
    # ── Panic / Risk ──
    {
        "path": "/risk/panic",
        "method": "POST",
        "category": "Panic",
        "description": "Emergency panic button — cancels all orders, closes positions, stops trading",
        "params": {},
    },
    {
        "path": "/risk/cancel-all",
        "method": "POST",
        "category": "Panic",
        "description": "Cancel all open orders across all symbols",
        "params": {},
    },
    {
        "path": "/risk/close-positions",
        "method": "POST",
        "category": "Panic",
        "description": "Close all open positions at market price",
        "params": {},
    },
]

_SUPPORTED_BROKERS: list[dict[str, str]] = [
    {"id": "zerodha", "name": "Zerodha", "type": "broker"},
    {"id": "angelone", "name": "Angel One", "type": "broker"},
    {"id": "icici", "name": "ICICI Direct", "type": "broker"},
    {"id": "kotak", "name": "Kotak Securities", "type": "broker"},
    {"id": "hdfc", "name": "HDFC Securities", "type": "broker"},
    {"id": "iifl", "name": "IIFL", "type": "broker"},
    {"id": "sharekhan", "name": "Sharekhan", "type": "broker"},
    {"id": "upstox", "name": "Upstox", "type": "broker"},
    {"id": "fyers", "name": "Fyers", "type": "broker"},
    {"id": "5paisa", "name": "5Paisa", "type": "broker"},
    {"id": "mastertrust", "name": "Master Trust", "type": "broker"},
    {"id": "aliceblue", "name": "Alice Blue", "type": "broker"},
    {"id": "sas-online", "name": "SAS Online", "type": "broker"},
    {"id": "nse", "name": "NSE (Equity)", "type": "exchange"},
    {"id": "bse", "name": "BSE (Equity)", "type": "exchange"},
    {"id": "mcx", "name": "MCX (Commodity)", "type": "exchange"},
    {"id": "nfo", "name": "NFO (F&O)", "type": "exchange"},
    {"id": "cde", "name": "CDE (Currency)", "type": "exchange"},
]


@router.get("/api-docs")
async def get_api_docs():
    return {
        "status": "success",
        "data": {
            "endpoints": _API_ENDPOINTS,
            "categories": list({e["category"] for e in _API_ENDPOINTS}),
            "count": len(_API_ENDPOINTS),
        },
    }


@router.get("/symbol-search")
async def symbol_search(q: str = Query("", min_length=1)):
    if not q.strip():
        return {"status": "success", "data": {"symbols": [], "total": 0}}

    query = q.strip().upper()
    try:
        from api.routes.market_data_constants import POPULAR_SYMBOLS as symbols

        matches = [
            s
            for s in symbols
            if query in s["symbol"].upper() or query in s.get("name", "").upper()
        ]
        return {
            "status": "success",
            "data": {"symbols": matches[:50], "total": len(matches)},
        }
    except ImportError:
        pass

    fallback = [
        {"symbol": "RELIANCE", "name": "Reliance Industries", "exchange": "NSE"},
        {"symbol": "TCS", "name": "Tata Consultancy Services", "exchange": "NSE"},
        {"symbol": "HDFCBANK", "name": "HDFC Bank", "exchange": "NSE"},
        {"symbol": "INFY", "name": "Infosys", "exchange": "NSE"},
        {"symbol": "ICICIBANK", "name": "ICICI Bank", "exchange": "NSE"},
        {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE"},
        {"symbol": "BHARTIARTL", "name": "Bharti Airtel", "exchange": "NSE"},
        {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "exchange": "NSE"},
        {"symbol": "BAJFINANCE", "name": "Bajaj Finance", "exchange": "NSE"},
        {"symbol": "LT", "name": "Larsen & Toubro", "exchange": "NSE"},
    ]
    matches = [s for s in fallback if query in s["symbol"].upper() or query in s.get("name", "").upper()]
    return {
        "status": "success",
        "data": {"symbols": matches[:50], "total": len(matches)},
    }


@router.get("/brokers")
async def get_brokers():
    return {
        "status": "success",
        "data": {"brokers": _SUPPORTED_BROKERS, "total": len(_SUPPORTED_BROKERS)},
    }
