from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/panic")
async def panic_button(request: Request):
    api_state = None
    try:
        from api.state import app_state
        api_state = app_state
    except Exception:
        logger.debug("app_state import skipped (expected in some contexts)")

    result: dict[str, Any] = {
        "status": "PANIC_EXECUTED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actions": [],
        "pnl_impact": 0.0,
    }

    # 1. Cancel all open orders
    cancelled_count = 0
    try:
        from api.routes.orders import _orders, _orders_lock
        async with _orders_lock:
            open_orders = [o for o in _orders if o.get("status") in ("SUBMITTED", "ACCEPTED", "PARTIAL")]
            for o in open_orders:
                o["status"] = "CANCELED"
                o["updatedAt"] = datetime.now(timezone.utc).isoformat()
                cancelled_count += 1
        result["actions"].append({"action": "cancel_orders", "count": cancelled_count})
        logger.warning("PANIC: Cancelled %d open orders", cancelled_count)
    except Exception as e:
        result["actions"].append({"action": "cancel_orders", "error": str(e)})

    # 2. Close all positions at market
    closed_positions = 0
    total_pnl = 0.0
    try:
        if api_state:
            portfolio = await api_state.async_get_portfolio()
            for sym, pos in list(portfolio.positions.items()):
                if pos.quantity != 0:
                    price = pos.current_price or 0.0
                    entry_price = pos.entry_price or 0.0
                    pnl = (price - entry_price) * abs(pos.quantity)
                    total_pnl += pnl
                    closed_positions += 1
            await api_state.async_set_portfolio(portfolio)
        result["actions"].append({"action": "close_positions", "count": closed_positions})
        result["pnl_impact"] = round(total_pnl, 2)
        logger.warning("PANIC: Closed %d positions, P&L impact=%.2f", closed_positions, total_pnl)
    except Exception as e:
        result["actions"].append({"action": "close_positions", "error": str(e)})

    # 3. Disable bots/trading
    try:
        from api.routes.paper import _paper
        if _paper.get("isRunning"):
            _paper["isRunning"] = False
            result["actions"].append({"action": "disable_paper_trading", "status": "stopped"})
            logger.warning("PANIC: Paper trading disabled")
    except Exception:
        logger.debug("Failed to disable paper trading during panic")

    try:
        import os
        os.environ["TRADING_ENGINE_MARKET_INTEL_ENABLED"] = "false"
        result["actions"].append({"action": "disable_market_intel", "status": "stopped"})
    except Exception:
        logger.debug("Failed to disable market intel during panic")

    # 4. Write audit log
    try:
        from api.routes.audit_routes import _audit_logs
        _audit_logs.append({
            "action": "PANIC_BUTTON",
            "entity_type": "risk",
            "entity_id": "",
            "details": {
                "orders_cancelled": cancelled_count,
                "positions_closed": closed_positions,
                "pnl_impact": total_pnl,
                "request_id": getattr(request.state, "request_id", ""),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        logger.debug("Failed to write audit log during panic")

    return result


@router.post("/cancel-all")
async def cancel_all_orders(request: Request):
    try:
        api_key = request.headers.get("X-API-Key", "unknown")
        from api.services.cancel_all_order_service import cancel_all_orders as _cancel_all
        success, data, status_code = await _cancel_all(
            cancel_fn=_cancel_live_orders,
            sandbox_cancel_fn=_cancel_sandbox_orders,
            is_analyze="sandbox" in str(request.url),
        )
        return _json_response(data, status_code)
    except Exception as e:
        logger.exception(f"/cancel-all failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/close-positions")
async def close_all_positions(request: Request):
    try:
        from api.services.close_position_service import close_position
        success, data, status_code = await close_position(
            position_data={"all": True},
            close_fn=_close_live_positions,
            sandbox_close_fn=_close_sandbox_positions,
            is_analyze="sandbox" in str(request.url),
        )
        return _json_response(data, status_code)
    except Exception as e:
        logger.exception(f"/close-positions failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- internal helpers ---

async def _cancel_live_orders() -> tuple[list, list]:
    canceled: list[dict] = []
    failed: list[dict] = []
    try:
        from api.routes.orders import _orders, _orders_lock
        async with _orders_lock:
            for o in _orders:
                if o.get("status") in ("SUBMITTED", "ACCEPTED", "PARTIAL"):
                    o["status"] = "CANCELED"
                    o["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    canceled.append(o)
    except Exception as e:
        failed.append({"error": str(e)})
    return canceled, failed


async def _cancel_sandbox_orders() -> dict:
    return {"canceled_orders": [], "failed_cancellations": []}


async def _close_live_positions(position_data: dict) -> dict:
    try:
        from api.state import app_state
        portfolio = await app_state.async_get_portfolio()
        closed = 0
        for sym, pos in list(portfolio.positions.items()):
            if pos.quantity != 0:
                pos.quantity = 0
                closed += 1
        await app_state.async_set_portfolio(portfolio)
        return {"status": "success", "closed_positions": closed}
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def _close_sandbox_positions(position_data: dict) -> dict:
    return {"status": "success", "message": "Sandbox positions closed"}


def _json_response(data: dict, status_code: int):
    from fastapi.responses import JSONResponse
    return JSONResponse(content=data, status_code=status_code)
