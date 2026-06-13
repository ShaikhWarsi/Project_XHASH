from __future__ import annotations

import asyncio
import logging
from typing import Any

from api.services.place_order_service import place_order as _place_order

logger = logging.getLogger(__name__)


async def basket_order(data: dict[str, Any]) -> tuple[bool, dict[str, Any], int]:
    try:
        orders = data.get("orders", [])
        if not orders:
            return False, {"status": "error", "message": "No orders provided"}, 400
        result = await execute_basket_order(orders, _place_order)
        data_result = result.get("data", {})
        success = result.get("status") in ("success", "partial")
        code = 200 if result.get("status") == "success" else (206 if result.get("status") == "partial" else 500)
        return success, result, code
    except Exception as e:
        logger.exception("basket_order failed")
        return False, {"status": "error", "message": str(e)}, 500


async def execute_basket_order(
    orders: list[dict],
    place_order_fn,
) -> dict:
    """
    Execute a basket of orders in parallel.

    Args:
        orders: List of order dicts, each with symbol, exchange, action, quantity, etc.
        place_order_fn: Async callable that places a single order

    Returns:
        dict with total_orders, successful, failed, and results list
    """
    if not orders:
        return {
            "status": "error",
            "message": "No orders provided",
            "data": {"total_orders": 0, "successful": 0, "failed": 0, "results": []},
        }

    async def place_single(index: int, order: dict) -> dict:
        try:
            result = await place_order_fn(order)
            return {"index": index, "status": "success", "order": order, "result": result}
        except Exception as e:
            return {"index": index, "status": "failed", "order": order, "error": str(e)}

    tasks = [place_single(i, o) for i, o in enumerate(orders)]
    results = await asyncio.gather(*tasks)

    successful = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] == "failed"]

    return {
        "status": "success" if not failed else ("partial" if successful else "error"),
        "message": f"{len(successful)}/{len(orders)} orders placed successfully"
        if failed
        else "All orders placed successfully",
        "data": {
            "total_orders": len(orders),
            "successful": len(successful),
            "failed": len(failed),
            "results": results,
        },
    }
