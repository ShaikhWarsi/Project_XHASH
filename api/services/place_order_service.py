from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_orders_store: list[dict[str, Any]] = []


async def place_order(data: dict[str, Any]) -> tuple[bool, dict[str, Any], int]:
    try:
        symbol = data.get("symbol", "")
        exchange = data.get("exchange", "NSE")
        action = data.get("action", "BUY")
        quantity = int(data.get("quantity", 0))
        price_type = data.get("price_type", "MARKET")
        price = float(data.get("price", 0))

        if not symbol or quantity <= 0:
            return False, {"status": "error", "message": "symbol and positive quantity required"}, 400

        order = {
            "id": uuid.uuid4().hex[:12],
            "symbol": symbol.upper(),
            "exchange": exchange.upper(),
            "action": action.upper(),
            "quantity": quantity,
            "price": price,
            "price_type": price_type.upper(),
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _orders_store.append(order)

        return True, {"status": "success", "data": order}, 200

    except Exception as e:
        logger.exception("place_order failed")
        return False, {"status": "error", "message": str(e)}, 500
