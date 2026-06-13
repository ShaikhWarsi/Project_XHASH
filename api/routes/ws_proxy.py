from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from api.websocket_proxy.app_integration import get_proxy_health, start_proxy, stop_proxy

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/ws-proxy", tags=["openalgo_ws_proxy"])


@router.post("/start")
async def api_start_proxy():
    result = await start_proxy()
    return result


@router.post("/stop")
async def api_stop_proxy():
    result = await stop_proxy()
    return result


@router.get("/health")
async def api_proxy_health():
    return await get_proxy_health()
