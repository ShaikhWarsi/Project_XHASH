from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from api.services.flow_openalgo_client import FlowOpenAlgoClient

logger = logging.getLogger(__name__)

_strategies: dict[str, dict] = {}
_symbol_mappings: list[dict] = []
_mapping_id_counter = 0

flow_client = FlowOpenAlgoClient()


def create_strategy(data: dict) -> dict:
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    strategy = {
        "id": sid,
        "name": data.get("name", ""),
        "symbol": data.get("symbol", ""),
        "exchange": data.get("exchange", "NSE"),
        "action": data.get("action", "BUY"),
        "quantity": data.get("quantity", 1),
        "product": data.get("product", "MIS"),
        "pricetype": data.get("pricetype", "MARKET"),
        "intraday": data.get("intraday", True),
        "enabled": data.get("enabled", True),
        "created_at": now,
    }
    _strategies[sid] = strategy
    return strategy


def get_strategy(id: str) -> dict | None:
    return _strategies.get(id)


def list_strategies() -> list[dict]:
    return list(_strategies.values())


def update_strategy(id: str, data: dict) -> dict | None:
    strategy = _strategies.get(id)
    if not strategy:
        return None
    for key in ("name", "symbol", "exchange", "action", "quantity", "product", "pricetype", "intraday", "enabled"):
        if key in data:
            strategy[key] = data[key]
    return strategy


def delete_strategy(id: str) -> bool:
    if id in _strategies:
        del _strategies[id]
        return True
    return False


async def process_webhook(body: dict) -> dict:
    strategy_name = body.get("strategy", "").strip()
    symbol = body.get("symbol", "").strip()
    action = body.get("action", "").strip().upper()
    exchange = body.get("exchange", "NSE").strip().upper()

    if not strategy_name or not symbol or not action:
        return {"status": "error", "message": "Missing required fields: strategy, symbol, action"}

    strategy = None
    for s in _strategies.values():
        if s["name"].lower() == strategy_name.lower():
            strategy = s
            break

    if not strategy:
        return {"status": "error", "message": f"Strategy '{strategy_name}' not found"}

    if not strategy.get("enabled", True):
        return {"status": "error", "message": f"Strategy '{strategy_name}' is disabled"}

    order_data = {
        "symbol": symbol,
        "exchange": exchange or strategy["exchange"],
        "action": action,
        "quantity": int(strategy.get("quantity", 1)),
        "product": strategy.get("product", "MIS"),
        "pricetype": strategy.get("pricetype", "MARKET"),
    }

    result = await flow_client.place_order(order_data)
    logger.info("ChartInk webhook placed order for strategy=%s symbol=%s action=%s result=%s", strategy_name, symbol, action, result)
    return result


def list_symbol_mappings() -> list[dict]:
    return list(_symbol_mappings)


def add_symbol_mapping(data: dict) -> dict:
    global _mapping_id_counter
    _mapping_id_counter += 1
    mapping = {
        "id": str(_mapping_id_counter),
        "chartink_symbol": data.get("chartink_symbol", ""),
        "trading_symbol": data.get("trading_symbol", ""),
        "exchange": data.get("exchange", "NSE"),
    }
    _symbol_mappings.append(mapping)
    return mapping


def remove_symbol_mapping(id: str) -> bool:
    global _symbol_mappings
    before = len(_symbol_mappings)
    _symbol_mappings = [m for m in _symbol_mappings if m["id"] != id]
    return len(_symbol_mappings) < before
