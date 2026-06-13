from __future__ import annotations

import logging
from typing import Any

from api.services.gtt_service import place_gtt, cancel_gtt, get_gtt_orderbook
from api.services.basket_order_service import execute_basket_order as basket_order
from api.services.smart_order_service import smart_order
from api.services.split_order_service import split_order
from api.services.cancel_all_order_service import cancel_all_orders
from api.services.close_position_service import close_position

logger = logging.getLogger(__name__)


class FlowOpenAlgoClient:

    async def place_order(self, data: dict) -> dict:
        try:
            from api.services.place_order_service import place_order
            success, result, code = await place_order(data)
            return {"status": "success" if success else "error", "data": result}
        except Exception as e:
            logger.exception("place_order failed")
            return {"status": "error", "error": str(e)}

    async def smart_order(self, data: dict) -> dict:
        try:
            success, result, code = await smart_order(data)
            return {"status": "success" if success else "error", "data": result, "code": code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def basket_order(self, data: dict) -> dict:
        try:
            success, result, code = await basket_order(data)
            return {"status": "success" if success else "error", "data": result, "code": code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def split_order(self, data: dict) -> dict:
        try:
            success, result, code = await split_order(data)
            return {"status": "success" if success else "error", "data": result, "code": code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def place_gtt(self, data: dict) -> dict:
        try:
            success, result, code = await place_gtt(data)
            return {"status": "success" if success else "error", "data": result, "code": code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def cancel_gtt(self, trigger_id: str) -> dict:
        try:
            success, result, code = await cancel_gtt(trigger_id)
            return {"status": "success" if success else "error", "data": result, "code": code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def get_gtt_orderbook(self) -> dict:
        try:
            success, result, code = await get_gtt_orderbook()
            return {"status": "success" if success else "error", "data": result, "code": code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def cancel_all_orders(self, cancel_fn=None) -> dict:
        try:
            success, result, code = await cancel_all_orders(cancel_fn=cancel_fn)
            return {"status": "success" if success else "error", "data": result, "code": code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def close_positions(self, position_data: dict | None = None) -> dict:
        try:
            success, result, code = await close_position(position_data=position_data)
            return {"status": "success" if success else "error", "data": result, "code": code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def get_quote(self, symbol: str, exchange: str) -> dict:
        try:
            from api.routes.market_data import get_quote as _quote
            quote = await _quote(symbol, exchange)
            return {"status": "success", "data": {"ltp": quote.get("ltp", 0), "symbol": symbol, "exchange": exchange}}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def get_funds(self) -> dict:
        try:
            from api.state import app_state
            portfolio = await app_state.async_get_portfolio()
            return {"status": "success", "data": {"balance": portfolio.cash, "equity": portfolio.equity, "margin": portfolio.margin}}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def get_positions(self) -> dict:
        try:
            from api.state import app_state
            portfolio = await app_state.async_get_portfolio()
            positions = [{"symbol": sym, "quantity": p.quantity, "entry_price": p.entry_price, "current_price": p.current_price, "pnl": (p.current_price or 0) - (p.entry_price or 0) * abs(p.quantity)} for sym, p in portfolio.positions.items()]
            return {"status": "success", "data": positions}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def get_orderbook(self) -> dict:
        try:
            from api.routes.orders import _orders
            return {"status": "success", "data": list(_orders)}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def send_telegram(self, message: str) -> dict:
        try:
            from integrations.telegram_bot import send_alert
            await send_alert(message)
            return {"status": "success"}
        except Exception as e:
            logger.warning("Telegram send failed: %s", e)
            return {"status": "error", "error": str(e)}
