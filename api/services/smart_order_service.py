from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def calculate_delta_quantity(current_position: int, requested_qty: int, action: str) -> dict:
    """
    Calculate the delta quantity needed to achieve the requested position.
    Handles over-buying/over-selling prevention.

    Args:
        current_position: Current position quantity (positive=long, negative=short, 0=flat)
        requested_qty: Requested quantity to trade
        action: 'BUY' or 'SELL'

    Returns:
        dict with:
            - delta_qty: Quantity to actually place
            - action: Actual action to take
            - effective_qty: Net position after this order
            - skip: True if no action needed
    """
    if action.upper() == "BUY":
        if current_position >= requested_qty:
            return {"delta_qty": 0, "action": "BUY", "effective_qty": current_position, "skip": True}
        delta = requested_qty - current_position
        return {"delta_qty": delta, "action": "BUY", "effective_qty": current_position + delta, "skip": False}

    elif action.upper() == "SELL":
        if current_position <= -requested_qty:
            return {"delta_qty": 0, "action": "SELL", "effective_qty": current_position, "skip": True}

        target = max(-requested_qty, current_position - requested_qty)

        if current_position > 0:
            exit_qty = min(requested_qty, current_position)
            return {"delta_qty": exit_qty, "action": "SELL", "effective_qty": current_position - exit_qty, "skip": False}

        delta = abs(current_position) + requested_qty
        return {"delta_qty": delta, "action": "SELL", "effective_qty": current_position - delta, "skip": False}


async def smart_order(data: dict[str, Any]) -> tuple[bool, dict[str, Any], int]:
    try:
        from api.services.place_order_service import place_order as _place_order

        symbol = data.get("symbol", "")
        exchange = data.get("exchange", "NSE")
        action = data.get("action", "BUY").upper()
        requested_qty = int(data.get("quantity", 0))

        current_position = 0
        from api.state import app_state
        try:
            portfolio = await app_state.async_get_portfolio()
            pos = portfolio.positions.get(symbol)
            if pos:
                current_position = pos.quantity or 0
        except Exception:
            pass

        delta_result = await calculate_delta_quantity(current_position, requested_qty, action)

        if delta_result.get("skip"):
            return True, {"status": "success", "message": "Position already at target", "data": delta_result}, 200

        order_data = {**data, "quantity": delta_result["delta_qty"], "action": delta_result["action"]}
        success, result, code = await _place_order(order_data)
        result["delta_info"] = delta_result
        return success, result, code

    except Exception as e:
        logger.exception("smart_order failed")
        return False, {"status": "error", "message": str(e)}, 500
