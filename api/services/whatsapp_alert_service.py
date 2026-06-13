from __future__ import annotations

import logging
from typing import Any

from api.services.whatsapp_bot_service import WhatsAppBotService

logger = logging.getLogger(__name__)


class WhatsAppAlertService:
    @staticmethod
    def format_order_details(action: str, order_data: dict[str, Any]) -> str:
        symbol = order_data.get("symbol", order_data.get("tradingsymbol", "N/A"))
        qty = order_data.get("quantity", order_data.get("qty", "N/A"))
        price = order_data.get("price", order_data.get("trigger_price", "N/A"))
        order_id = order_data.get("order_id", order_data.get("id", "N/A"))
        exchange = order_data.get("exchange", "NSE")
        product = order_data.get("product", order_data.get("product_type", "MIS"))
        side = order_data.get("side", order_data.get("transaction_type", "BUY"))

        action_labels = {
            "placeorder": "New Order Placed",
            "placesmartorder": "Smart Order Placed",
            "basketorder": "Basket Order Executed",
            "splitorder": "Split Order",
            "modifyorder": "Order Modified",
            "cancelorder": "Order Cancelled",
            "cancelallorder": "All Orders Cancelled",
            "closeposition": "Position Closed",
        }
        label = action_labels.get(action, action.replace("_", " ").title())

        lines = [
            f"*{label}*",
            f"Symbol: {symbol}",
            f"Side: {side}",
            f"Qty: {qty}",
            f"Price: {price}",
            f"Exchange: {exchange}",
            f"Product: {product}",
        ]
        if order_id and order_id != "N/A":
            lines.insert(1, f"Order ID: {order_id}")

        return "\n".join(lines)

    @staticmethod
    async def send_alert_sync(
        bot_service: WhatsAppBotService,
        jid: str,
        action: str,
        data: dict[str, Any],
    ) -> dict:
        message = WhatsAppAlertService.format_order_details(action, data)
        return await bot_service.send_message(jid, message)

    @staticmethod
    async def send_order_alert(
        bot_service: WhatsAppBotService,
        action: str,
        order_data: dict[str, Any],
        username: str = "",
    ) -> dict:
        users = await bot_service.get_users()
        jid = None
        for user in users:
            if not username or user.get("username") == username:
                if user.get("alerts_enabled", True):
                    jid = user["jid"]
                    break
        if not jid:
            jid = bot_service._state.get("connected_jid")
        if not jid:
            return {"success": False, "message": "No linked user or connected device"}
        return await WhatsAppAlertService.send_alert_sync(bot_service, jid, action, order_data)

    @staticmethod
    async def send_broadcast_alert(
        bot_service: WhatsAppBotService,
        action: str,
        data: dict[str, Any],
    ) -> dict:
        users = await bot_service.get_users()
        results = []
        for user in users:
            if user.get("alerts_enabled", True):
                result = await WhatsAppAlertService.send_alert_sync(
                    bot_service, user["jid"], action, data
                )
                results.append(result)
        if not results:
            jid = bot_service._state.get("connected_jid")
            if jid:
                result = await WhatsAppAlertService.send_alert_sync(bot_service, jid, action, data)
                results.append(result)
        return {
            "success": True,
            "results": results,
            "total": len(results),
        }
