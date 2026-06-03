from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/broker", tags=["broker"])

_broker_configs: dict[str, dict[str, Any]] = {}


@router.post("/connect")
async def connect_broker(body: dict):
    provider = body.get("provider", "unknown")
    config = body.get("config", {})
    config_id = f"brk_{uuid.uuid4().hex[:8]}"
    _broker_configs[config_id] = {
        "provider": provider,
        "config": config,
        "risk_limit": body.get("risk_limit", 5000),
        "connected_at": datetime.now(timezone.utc).isoformat(),
    }
    logger.info("Broker connected: %s (id=%s)", provider, config_id)
    return {
        "status": "ok",
        "config_id": config_id,
        "message": f"Connected to {provider}",
    }


@router.post("/save")
async def save_broker_config(body: dict):
    provider = body.get("provider", "unknown")
    config = body.get("config", {})
    config_id = f"brk_{uuid.uuid4().hex[:8]}"
    _broker_configs[config_id] = {
        "provider": provider,
        "config": config,
        "risk_limit": body.get("risk_limit", 5000),
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    logger.info("Broker config saved: %s (id=%s)", provider, config_id)
    return {
        "status": "ok",
        "config_id": config_id,
        "message": f"Configuration saved for {provider}",
    }


@router.get("/configs")
async def list_broker_configs():
    return {
        "configs": [
            {"id": cid, "provider": cfg["provider"], "saved_at": cfg.get("saved_at", cfg.get("connected_at", ""))}
            for cid, cfg in _broker_configs.items()
        ]
    }
