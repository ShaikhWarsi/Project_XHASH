from __future__ import annotations

import copy
import logging
import os
import asyncio
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)

MAX_ORDERS = 100


def get_order_rate_limit() -> float:
    raw = os.getenv("ORDER_RATE_LIMIT", "10 per second")
    try:
        rate = int(raw.split()[0])
        return 1.0 / rate if rate > 0 else 0.1
    except (ValueError, IndexError):
        return 0.1


async def place_single_order(
    place_fn: Callable[..., Coroutine[Any, Any, dict]],
    order_data: dict[str, Any],
    order_num: int,
    total_orders: int,
) -> dict:
    try:
        result = await place_fn(order_data)
        if result.get("status") in ("success", "filled"):
            return {
                "order_num": order_num,
                "quantity": int(order_data.get("quantity", 0)),
                "status": "success",
                "order_id": result.get("order_id", ""),
            }
        return {
            "order_num": order_num,
            "quantity": int(order_data.get("quantity", 0)),
            "status": "error",
            "message": result.get("message", "Order placement failed"),
        }
    except Exception as e:
        logger.exception(f"Error placing split order {order_num}: {e}")
        return {
            "order_num": order_num,
            "quantity": int(order_data.get("quantity", 0)),
            "status": "error",
            "message": str(e),
        }


async def split_order(
    split_data: dict[str, Any],
    place_fn: Callable[..., Coroutine[Any, Any, dict]] | None = None,
    sandbox_place_fn: Callable[..., Coroutine[Any, Any, dict]] | None = None,
    is_analyze: bool = False,
    quote_prefetch_fn: Callable[..., Coroutine[Any, Any, dict | None]] | None = None,
) -> tuple[bool, dict, int]:
    try:
        split_size = int(split_data.get("splitsize", 0))
        total_qty = int(split_data.get("quantity", 0))
    except (ValueError, TypeError):
        return False, {"status": "error", "message": "Invalid quantity or split size"}, 400

    if split_size <= 0:
        return False, {"status": "error", "message": "Split size must be greater than 0"}, 400
    if total_qty <= 0:
        return False, {"status": "error", "message": "Total quantity must be greater than 0"}, 400

    num_full = total_qty // split_size
    remaining = total_qty % split_size
    total_orders = num_full + (1 if remaining > 0 else 0)

    if total_orders > MAX_ORDERS:
        return False, {
            "status": "error",
            "message": f"Total orders would exceed limit of {MAX_ORDERS}",
        }, 400

    results: list[dict] = []

    if is_analyze and sandbox_place_fn:
        prefetched = None
        if quote_prefetch_fn:
            try:
                prefetched = await quote_prefetch_fn(split_data.get("symbol", ""))
            except Exception:
                pass

        for i in range(num_full):
            od = copy.deepcopy(split_data)
            od["quantity"] = str(split_size)
            if prefetched:
                od["_prefetched_quote"] = prefetched
            succ, resp = await sandbox_place_fn(od)
            results.append({
                "order_num": i + 1,
                "quantity": split_size,
                "status": "success" if succ else "error",
                "order_id": resp.get("order_id", "") if succ else "",
                "message": resp.get("message") if not succ else "",
            })

        if remaining > 0:
            od = copy.deepcopy(split_data)
            od["quantity"] = str(remaining)
            if prefetched:
                od["_prefetched_quote"] = prefetched
            succ, resp = await sandbox_place_fn(od)
            results.append({
                "order_num": total_orders,
                "quantity": remaining,
                "status": "success" if succ else "error",
                "order_id": resp.get("order_id", "") if succ else "",
                "message": resp.get("message") if not succ else "",
            })

    elif place_fn:
        delay = get_order_rate_limit()
        for i in range(num_full):
            if i > 0:
                await asyncio.sleep(delay)
            od = copy.deepcopy(split_data)
            od["quantity"] = str(split_size)
            r = await place_single_order(place_fn, od, i + 1, total_orders)
            results.append(r)

        if remaining > 0:
            if num_full > 0:
                await asyncio.sleep(delay)
            od = copy.deepcopy(split_data)
            od["quantity"] = str(remaining)
            r = await place_single_order(place_fn, od, total_orders, total_orders)
            results.append(r)
    else:
        return False, {"status": "error", "message": "No execution function provided"}, 500

    success_count = sum(1 for r in results if r.get("status") == "success")
    return True, {
        "status": "success",
        "total_quantity": total_qty,
        "split_size": split_size,
        "results": results,
        "successful": success_count,
        "total": len(results),
    }, 200
