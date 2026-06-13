from __future__ import annotations

import logging
import time
from typing import Any

from api.utils.httpx_client import get_async_client

logger = logging.getLogger(__name__)

BOT_CONFIGS: dict[str, dict[str, Any]] = {}
COMMANDS = {
    "start": "Welcome! Use /help to see available commands.",
    "help": (
        "/orders - View open orders\n"
        "/positions - View current positions\n"
        "/portfolio - View portfolio summary\n"
        "/balance - View account balance\n"
        "/start - Restart the bot"
    ),
}


def register_bot(bot_id: str, token: str, chat_id: str):
    BOT_CONFIGS[bot_id] = {"token": token, "chat_id": chat_id, "registered_at": time.time()}


def unregister_bot(bot_id: str):
    BOT_CONFIGS.pop(bot_id, None)


async def handle_webhook(bot_token: str, update: dict) -> str | None:
    message = update.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    if not chat_id or not text:
        return None
    command = text.split()[0].lower()
    reply = COMMANDS.get(command)
    if command == "orders":
        reply = await _fetch_orders(chat_id)
    elif command == "positions":
        reply = await _fetch_positions(chat_id)
    elif command == "portfolio" or command == "balance":
        reply = await _fetch_portfolio(chat_id)
    if reply:
        await _send_message(bot_token, chat_id, reply)
    return reply


async def _send_message(token: str, chat_id: int, text: str):
    client = get_async_client()
    try:
        await client.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
            timeout=15,
        )
    except Exception as e:
        logger.error("Telegram send failed: %s", e)


async def _fetch_orders(chat_id: int) -> str:
    return "📋 *Open Orders*\n\nFeature requires /api/v1/orders endpoint integration."


async def _fetch_positions(chat_id: int) -> str:
    return "📊 *Current Positions*\n\nFeature requires /api/v1/positions endpoint integration."


async def _fetch_portfolio(chat_id: int) -> str:
    return "💰 *Portfolio Summary*\n\nFeature requires funds/positions endpoint integration."


async def send_alert(token: str, chat_id: str, message: str) -> dict:
    client = get_async_client()
    try:
        resp = await client.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": message, "parse_mode": "Markdown"},
            timeout=15,
        )
        body = resp.json()
        if body.get("ok"):
            return {"success": True, "message": "Telegram alert sent"}
        return {"success": False, "message": f"Telegram error: {body.get('description', 'unknown')}"}
    except Exception as e:
        return {"success": False, "message": f"Telegram error: {str(e)[:200]}"}
