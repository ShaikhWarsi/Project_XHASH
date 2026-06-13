from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

logger = logging.getLogger(__name__)

_gtt_triggers: dict[str, dict[str, Any]] = {}
_gtt_lock: Any = None


async def _get_lock():
    global _gtt_lock
    if _gtt_lock is None:
        from asyncio import Lock
        _gtt_lock = Lock()
    return _gtt_lock


def _generate_gtt_id() -> str:
    return f"GTT{uuid.uuid4().hex[:12].upper()}"


def _validate_gtt_request(data: dict) -> dict:
    trigger_type = (data.get("trigger_type") or "").upper()
    if trigger_type not in ("SINGLE", "OCO"):
        raise HTTPException(status_code=400, detail={"trigger_type": "Must be 'SINGLE' or 'OCO'"})
    data["trigger_type"] = trigger_type

    sl_trigger = data.get("triggerprice_sl", 0)
    tg_trigger = data.get("triggerprice_tg", 0)

    if trigger_type == "OCO":
        stoploss = data.get("stoploss")
        target = data.get("target")
        if not sl_trigger:
            raise HTTPException(status_code=400, detail={"triggerprice_sl": "Required for OCO"})
        if not stoploss:
            raise HTTPException(status_code=400, detail={"stoploss": "Required for OCO"})
        if not tg_trigger:
            raise HTTPException(status_code=400, detail={"triggerprice_tg": "Required for OCO"})
        if not target:
            raise HTTPException(status_code=400, detail={"target": "Required for OCO"})
        if float(sl_trigger) >= float(tg_trigger):
            raise HTTPException(status_code=400, detail={"triggerprice_sl": "Stoploss trigger must be less than target trigger"})
        data["trigger_price"] = float(tg_trigger)
    else:
        sl_v = float(sl_trigger) if sl_trigger else 0.0
        tg_v = float(tg_trigger) if tg_trigger else 0.0
        if sl_v <= 0 and tg_v <= 0:
            raise HTTPException(status_code=400, detail={"triggerprice_sl": "SINGLE GTT requires a positive triggerprice_sl or triggerprice_tg"})
        resolved = sl_v if sl_v > 0 else tg_v
        data["triggerprice_sl"] = sl_v if sl_v > 0 else 0.0
        data["triggerprice_tg"] = tg_v if sl_v <= 0 else 0.0
        data["trigger_price"] = resolved

    qty = data.get("quantity")
    if qty is not None and qty != int(qty):
        data["quantity"] = int(qty)
    data["action"] = data.get("action", "").upper()
    data["pricetype"] = data.get("pricetype", "LIMIT").upper()
    return data


async def place_gtt(order_data: dict) -> tuple[bool, dict, int]:
    try:
        validated = _validate_gtt_request(order_data.copy())
    except HTTPException as e:
        return False, {"status": "error", "message": str(e.detail)}, 400

    gtt_id = _generate_gtt_id()
    now = datetime.now(timezone.utc).isoformat()

    trigger = {
        "gtt_id": gtt_id,
        "status": "active",
        "trigger_type": validated["trigger_type"],
        "symbol": validated.get("symbol", ""),
        "exchange": validated.get("exchange", ""),
        "action": validated["action"],
        "product": validated.get("product", ""),
        "quantity": validated["quantity"],
        "pricetype": validated["pricetype"],
        "price": validated.get("price", 0),
        "trigger_price": validated["trigger_price"],
        "triggerprice_sl": validated.get("triggerprice_sl", 0),
        "triggerprice_tg": validated.get("triggerprice_tg", 0),
        "stoploss": validated.get("stoploss"),
        "target": validated.get("target"),
        "strategy": validated.get("strategy", ""),
        "expires_at": validated.get("expires_at"),
        "created_at": now,
        "updated_at": now,
    }

    lock = await _get_lock()
    async with lock:
        _gtt_triggers[gtt_id] = trigger

    logger.info("GTT placed: %s", gtt_id)
    return True, {"status": "success", "trigger_id": gtt_id}, 200


async def modify_gtt(order_data: dict) -> tuple[bool, dict, int]:
    trigger_id = order_data.get("trigger_id", "")
    if not trigger_id:
        return False, {"status": "error", "message": "trigger_id is required"}, 400

    lock = await _get_lock()
    async with lock:
        trigger = _gtt_triggers.get(trigger_id)
        if not trigger:
            return False, {"status": "error", "message": "GTT trigger not found"}, 404
        if trigger["status"] != "active":
            return False, {"status": "error", "message": f"Cannot modify GTT with status '{trigger['status']}'"}, 400

        try:
            validated = _validate_gtt_request(order_data.copy())
        except HTTPException as e:
            return False, {"status": "error", "message": str(e.detail)}, 400

        trigger.update({
            "trigger_type": validated["trigger_type"],
            "symbol": validated.get("symbol", trigger["symbol"]),
            "exchange": validated.get("exchange", trigger["exchange"]),
            "action": validated["action"],
            "product": validated.get("product", trigger["product"]),
            "quantity": validated["quantity"],
            "pricetype": validated["pricetype"],
            "price": validated.get("price", trigger["price"]),
            "trigger_price": validated["trigger_price"],
            "triggerprice_sl": validated.get("triggerprice_sl", 0),
            "triggerprice_tg": validated.get("triggerprice_tg", 0),
            "stoploss": validated.get("stoploss"),
            "target": validated.get("target"),
            "strategy": validated.get("strategy", trigger["strategy"]),
            "expires_at": validated.get("expires_at", trigger.get("expires_at")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    logger.info("GTT modified: %s", trigger_id)
    return True, {"status": "success", "trigger_id": trigger_id}, 200


async def cancel_gtt(trigger_id: str) -> tuple[bool, dict, int]:
    if not trigger_id:
        return False, {"status": "error", "message": "trigger_id is required"}, 400

    lock = await _get_lock()
    async with lock:
        trigger = _gtt_triggers.get(trigger_id)
        if not trigger:
            return False, {"status": "error", "message": "GTT trigger not found"}, 404
        if trigger["status"] != "active":
            return False, {"status": "error", "message": f"Cannot cancel GTT with status '{trigger['status']}'"}, 400
        trigger["status"] = "cancelled"
        trigger["updated_at"] = datetime.now(timezone.utc).isoformat()

    logger.info("GTT cancelled: %s", trigger_id)
    return True, {"status": "success", "trigger_id": trigger_id}, 200


async def get_gtt_orderbook() -> tuple[bool, list | dict, int]:
    lock = await _get_lock()
    async with lock:
        triggers = list(_gtt_triggers.values())
    return True, triggers, 200
