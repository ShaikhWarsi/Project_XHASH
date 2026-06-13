from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.services import telegram_bot_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])

_bots: dict[str, dict[str, Any]] = {}


def _init_default_bots():
    defaults = [
        {"name": "discord-alerts", "type": "discord", "enabled": False, "connected": False, "config": {"webhook_url": ""}},
        {"name": "slack-trading", "type": "slack", "enabled": False, "connected": False, "config": {"webhook_url": "", "channel": "#trading"}},
        {"name": "telegram-signals", "type": "telegram", "enabled": False, "connected": False, "config": {"bot_token": "", "chat_id": ""}},
        {"name": "email-daily", "type": "email", "enabled": False, "connected": False, "config": {"smtp_host": "", "smtp_port": "587", "smtp_user": "", "smtp_pass": "", "recipients": []}},
        {"name": "tradingview-webhook", "type": "tradingview", "enabled": False, "connected": False, "config": {"secret": ""}},
    ]
    for bot in defaults:
        if bot["name"] not in _bots:
            _bots[bot["name"]] = bot


_init_default_bots()


class BotConfigUpdate(BaseModel):
    enabled: bool | None = None
    config: dict[str, Any] | None = None


class SendAlertRequest(BaseModel):
    bot_name: str
    title: str
    message: str
    level: str = "info"


async def _send_discord_webhook(webhook_url: str, title: str, message: str, level: str) -> dict[str, Any]:
    if not webhook_url:
        return {"success": False, "message": "No webhook URL configured"}
    try:
        import aiohttp
        color_map = {"info": 3447003, "warning": 15105570, "critical": 15158332, "success": 3066993}
        embed = {
            "title": f"Trading Alert: {title}",
            "description": message,
            "color": color_map.get(level, 3447003),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "footer": {"text": "Trading Engine"},
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json={"embeds": [embed]}, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status in (200, 204):
                    return {"success": True, "message": "Discord alert sent"}
                return {"success": False, "message": f"Discord returned status {resp.status}"}
    except ImportError:
        return {"success": False, "message": "aiohttp not installed. Run: pip install aiohttp"}
    except Exception as e:
        return {"success": False, "message": f"Discord error: {str(e)[:200]}"}


async def _send_slack_webhook(webhook_url: str, title: str, message: str, level: str) -> dict[str, Any]:
    if not webhook_url:
        return {"success": False, "message": "No webhook URL configured"}
    try:
        import aiohttp
        emoji_map = {"info": ":information_source:", "warning": ":warning:", "critical": ":rotating_light:", "success": ":white_check_mark:"}
        payload = {"text": f"{emoji_map.get(level, '')} *{title}*\n{message}"}
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    return {"success": True, "message": "Slack alert sent"}
                return {"success": False, "message": f"Slack returned status {resp.status}"}
    except ImportError:
        return {"success": False, "message": "aiohttp not installed. Run: pip install aiohttp"}
    except Exception as e:
        return {"success": False, "message": f"Slack error: {str(e)[:200]}"}


async def _send_telegram(bot_token: str, chat_id: str, title: str, message: str, level: str) -> dict[str, Any]:
    if not bot_token or not chat_id:
        return {"success": False, "message": "Bot token or chat_id not configured"}
    emoji_map = {"info": "ℹ️", "warning": "⚠️", "critical": "🚨", "success": "✅"}
    text = f"{emoji_map.get(level, '')} *{title}*\n\n{message}"
    return await api_services.telegram_bot_service.send_alert(bot_token, chat_id, text)


async def _send_email(config: dict, title: str, message: str) -> dict[str, Any]:
    if not config.get("smtp_host") or not config.get("recipients"):
        return {"success": False, "message": "SMTP not configured"}
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        smtp_host = config["smtp_host"]
        smtp_port = int(config.get("smtp_port", "587"))
        smtp_user = config.get("smtp_user", "")
        smtp_pass = config.get("smtp_pass", "")
        recipients = config["recipients"]

        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = f"[Trading Engine] {title}"
        msg.attach(MIMEText(message, "plain"))

        def _send():
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, recipients, msg.as_string())

        await asyncio.to_thread(_send)
        return {"success": True, "message": f"Email sent to {len(recipients)} recipients"}
    except Exception as e:
        return {"success": False, "message": f"Email error: {str(e)[:200]}"}


@router.get("/bots")
async def list_bots():
    return {"bots": list(_bots.values())}


@router.get("/bots/{name}")
async def get_bot(name: str):
    if name not in _bots:
        raise HTTPException(404, f"Bot '{name}' not found")
    return _bots[name]


@router.post("/bots/{name}/toggle")
async def toggle_bot(name: str, body: dict[str, Any]):
    if name not in _bots:
        raise HTTPException(404, f"Bot '{name}' not found")
    _bots[name]["enabled"] = body.get("enabled", not _bots[name]["enabled"])
    if _bots[name]["enabled"]:
        _bots[name]["last_active"] = datetime.now(timezone.utc).isoformat()
    return {"success": True, "bot": _bots[name]}


@router.put("/bots/{name}/config")
async def update_bot_config(name: str, body: BotConfigUpdate):
    if name not in _bots:
        raise HTTPException(404, f"Bot '{name}' not found")
    if body.enabled is not None:
        _bots[name]["enabled"] = body.enabled
    if body.config is not None:
        _bots[name]["config"].update(body.config)
    _bots[name]["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {"success": True, "bot": _bots[name]}


@router.post("/bots/{name}/test")
async def test_bot(name: str):
    if name not in _bots:
        raise HTTPException(404, f"Bot '{name}' not found")
    bot = _bots[name]
    bot_type = bot["type"]
    config = bot["config"]

    if bot_type == "discord":
        result = await _send_discord_webhook(config.get("webhook_url", ""), "Test Alert", "This is a test alert from Trading Engine.", "info")
    elif bot_type == "slack":
        result = await _send_slack_webhook(config.get("webhook_url", ""), "Test Alert", "This is a test alert from Trading Engine.", "info")
    elif bot_type == "telegram":
        result = await _send_telegram(config.get("bot_token", ""), config.get("chat_id", ""), "Test Alert", "This is a test alert from Trading Engine.", "info")
    elif bot_type == "email":
        result = await _send_email(config, "Test Alert", "This is a test alert from Trading Engine.")
    else:
        result = {"success": False, "message": f"Test not implemented for {bot_type}"}

    if result.get("success"):
        bot["connected"] = True
        bot["last_active"] = datetime.now(timezone.utc).isoformat()
    return result


@router.post("/send-alert")
async def send_alert(body: SendAlertRequest):
    if body.bot_name not in _bots:
        raise HTTPException(404, f"Bot '{body.bot_name}' not found")
    bot = _bots[body.bot_name]
    if not bot["enabled"]:
        return {"success": False, "message": f"Bot '{body.bot_name}' is disabled"}

    config = bot["config"]
    bot_type = bot["type"]

    if bot_type == "discord":
        result = await _send_discord_webhook(config.get("webhook_url", ""), body.title, body.message, body.level)
    elif bot_type == "slack":
        result = await _send_slack_webhook(config.get("webhook_url", ""), body.title, body.message, body.level)
    elif bot_type == "telegram":
        result = await _send_telegram(config.get("bot_token", ""), config.get("chat_id", ""), body.title, body.message, body.level)
    elif bot_type == "email":
        result = await _send_email(config, body.title, body.message)
    else:
        result = {"success": False, "message": f"Alerts not implemented for {bot_type}"}

    if result.get("success"):
        bot["last_active"] = datetime.now(timezone.utc).isoformat()
    return result


@router.post("/webhook/telegram")
async def telegram_webhook(body: dict[str, Any]):
    message = body.get("message", {})
    text = message.get("text", "")
    chat_id = message.get("chat", {}).get("id")
    logger.info("Telegram webhook received: chat=%s text='%s'", chat_id, text[:200])
    if "telegram-signals" in _bots:
        config = _bots["telegram-signals"]["config"]
        _bots["telegram-signals"]["connected"] = True
        _bots["telegram-signals"]["last_active"] = datetime.now(timezone.utc).isoformat()
        if text.startswith("/"):
            token = config.get("bot_token", "")
            await telegram_bot_service.handle_webhook(token, body)
    return {"ok": True}


@router.post("/webhook/discord")
async def discord_webhook(body: dict[str, Any]):
    content = body.get("content", "")
    channel_id = body.get("channel_id", "")
    logger.info("Discord webhook received: channel=%s content='%s'", channel_id, content[:200])
    if "discord-alerts" in _bots:
        _bots["discord-alerts"]["connected"] = True
        _bots["discord-alerts"]["last_active"] = datetime.now(timezone.utc).isoformat()
    return {"ok": True}


@router.post("/webhook/tradingview")
async def tradingview_webhook(body: dict[str, Any]):
    logger.info("TradingView webhook received: %s", str(body)[:300])
    if "tradingview-webhook" in _bots:
        _bots["tradingview-webhook"]["connected"] = True
        _bots["tradingview-webhook"]["last_active"] = datetime.now(timezone.utc).isoformat()
    try:
        from api.state import app_state as _as
        if hasattr(_as, "_trades") and body.get("action") in ("buy", "sell"):
            _as._trades.append({
                "id": "tv_" + str(len(_as._trades) + 1),
                "symbol": body.get("ticker", "UNKNOWN"),
                "side": body.get("action"),
                "quantity": body.get("quantity", 0),
                "price": body.get("price", 0),
                "pnl": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "signal_type": "tradingview",
            })
    except Exception as e:
        logger.warning("TradingView webhook trade ingestion failed: %s", e)
    return {"ok": True}
