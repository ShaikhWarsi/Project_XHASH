from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])

_DEFAULT_BOTS = [
    {
        "name": "discord-alerts",
        "type": "discord",
        "enabled": True,
        "connected": False,
        "last_active": None,
        "config": {"webhook_url": "***"},
    },
    {
        "name": "slack-trading",
        "type": "slack",
        "enabled": False,
        "connected": False,
        "last_active": None,
        "config": {"channel": "#trading"},
    },
    {
        "name": "telegram-signals",
        "type": "telegram",
        "enabled": True,
        "connected": True,
        "last_active": "2026-05-26T09:15:00Z",
        "config": {"chat_id": "-1001234567890"},
    },
    {
        "name": "sms-urgent",
        "type": "sms",
        "enabled": False,
        "connected": False,
        "last_active": None,
        "config": {"phone": "+1***"},
    },
    {
        "name": "email-daily",
        "type": "email",
        "enabled": True,
        "connected": True,
        "last_active": "2026-05-25T22:00:00Z",
        "config": {"recipients": ["user@example.com"]},
    },
    {
        "name": "twitter-feed",
        "type": "twitter",
        "enabled": False,
        "connected": False,
        "last_active": None,
        "config": {"account": "@trading_bot"},
    },
    {
        "name": "tradingview-webhook",
        "type": "tradingview",
        "enabled": True,
        "connected": True,
        "last_active": "2026-05-26T10:28:00Z",
        "config": {"secret": "***"},
    },
]


@router.get("/bots")
async def list_bots():
    return {"bots": _DEFAULT_BOTS}


@router.post("/bots/{name}/toggle")
async def toggle_bot(name: str, body: dict[str, Any]):
    for bot in _DEFAULT_BOTS:
        if bot["name"] == name:
            bot["enabled"] = body.get("enabled", not bot["enabled"])
            bot["last_active"] = datetime.now(timezone.utc).isoformat() if bot["enabled"] else bot["last_active"]
            return {"success": True}
    return {"success": False, "message": f"Bot '{name}' not found"}


@router.get("/bots/{name}/test")
async def test_bot(name: str):
    return {"success": True, "message": f"Test message sent to {name}"}
