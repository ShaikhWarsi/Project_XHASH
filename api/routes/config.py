from __future__ import annotations

from typing import Optional
from pydantic import BaseModel

from fastapi import APIRouter

from api.state import app_state

router = APIRouter(prefix="/config", tags=["config"])

_DEFAULT_CONFIG = {
    "llm_provider": "openai",
    "api_key_configured": True,
    "max_position_size_pct": 15.0,
    "max_leverage": 2.0,
    "max_drawdown_pct": 20.0,
    "stop_loss_atr": 2.0,
    "data_providers": {
        "yfinance": True,
        "openbb": True,
        "ccxt": True,
        "alpaca": True,
        "tradingview": True,
        "fred": False,
        "sec_edgar": False,
        "world_bank": False,
        "gnews": False,
        "databento": False,
    },
}

class ApiKeyRequest(BaseModel):
    key: str


@router.get("")
async def get_config():
    return _DEFAULT_CONFIG


@router.put("")
async def update_config(updates: dict):
    _DEFAULT_CONFIG.update(updates)
    return {"status": "ok", "config": _DEFAULT_CONFIG}


@router.post("/api-key")
async def save_api_key(req: ApiKeyRequest):
    _DEFAULT_CONFIG["api_key_configured"] = bool(req.key)
    return {"status": "ok", "api_key_configured": bool(req.key)}
