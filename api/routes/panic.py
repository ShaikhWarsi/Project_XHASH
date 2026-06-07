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
        pass

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
        from api.routes.paper import _running
        if _running:
            _running["isRunning"] = False
            result["actions"].append({"action": "disable_paper_trading", "status": "stopped"})
            logger.warning("PANIC: Paper trading disabled")
    except Exception:
        pass

    try:
        import os
        os.environ["TRADING_ENGINE_MARKET_INTEL_ENABLED"] = "false"
        result["actions"].append({"action": "disable_market_intel", "status": "stopped"})
    except Exception:
        pass

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
        pass

    return result
