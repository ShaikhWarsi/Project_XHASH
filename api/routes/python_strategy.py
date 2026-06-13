from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from api.services.python_strategy_service import (
    SSE_SUBSCRIBERS,
    SSE_LOCK,
    broadcast,
    clear_logs,
    create_strategy,
    delete_strategy,
    get_log_content,
    get_log_files,
    get_market_status,
    get_strategy,
    get_strategy_content,
    init_scheduler,
    list_strategies,
    restore_states,
    start_strategy,
    stop_strategy,
    update_schedule,
    update_strategy_file,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/python-strategy", tags=["openalgo_python_strategy"])


@router.on_event("startup")
async def _startup():
    init_scheduler()
    await restore_states()


@router.get("/strategies")
async def api_list_strategies():
    return await list_strategies()


@router.get("/strategies/{strategy_id}")
async def api_get_strategy(strategy_id: str):
    s = await get_strategy(strategy_id)
    if not s:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return s


@router.post("/strategies")
async def api_create_strategy(request: Request):
    data = await request.json()
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    exchange = data.get("exchange", "NSE").upper()
    schedule_start = data.get("schedule_start", "09:15")
    schedule_stop = data.get("schedule_stop", "15:30")
    schedule_days = data.get("schedule_days", [0, 1, 2, 3, 4])
    filename = data.get("filename", "")
    file_content = data.get("content", "")
    if not filename:
        filename = f"{name.lower().replace(' ', '_')}.py"
    if not filename.endswith(".py"):
        filename += ".py"
    if not file_content:
        raise HTTPException(status_code=400, detail="Strategy file content is required")
    result, error = await create_strategy(name, exchange, schedule_start, schedule_stop, schedule_days, filename, file_content)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return result


@router.get("/strategies/{strategy_id}/content")
async def api_get_content(strategy_id: str):
    content = await get_strategy_content(strategy_id)
    if content is None:
        raise HTTPException(status_code=404, detail="Strategy or file not found")
    return {"content": content}


@router.put("/strategies/{strategy_id}/content")
async def api_update_content(strategy_id: str, request: Request):
    data = await request.json()
    content = data.get("content", "")
    error = await update_strategy_file(strategy_id, content)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"status": "success"}


@router.post("/strategies/{strategy_id}/start")
async def api_start_strategy(strategy_id: str):
    error = await start_strategy(strategy_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"status": "success"}


@router.post("/strategies/{strategy_id}/stop")
async def api_stop_strategy(strategy_id: str):
    error = await stop_strategy(strategy_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"status": "success"}


@router.delete("/strategies/{strategy_id}")
async def api_delete_strategy(strategy_id: str):
    error = await delete_strategy(strategy_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"status": "success"}


@router.put("/strategies/{strategy_id}/schedule")
async def api_update_schedule(strategy_id: str, request: Request):
    data = await request.json()
    error = await update_schedule(strategy_id, data.get("schedule_start", "09:15"), data.get("schedule_stop", "15:30"), data.get("schedule_days", [0, 1, 2, 3, 4]))
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"status": "success"}


@router.get("/strategies/{strategy_id}/logs")
async def api_get_logs(strategy_id: str):
    return await get_log_files(strategy_id)


@router.get("/strategies/{strategy_id}/logs/{log_name}")
async def api_get_log_content(strategy_id: str, log_name: str):
    content = await get_log_content(strategy_id, log_name)
    if content is None:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"content": content}


@router.post("/strategies/{strategy_id}/logs/clear")
async def api_clear_logs(strategy_id: str):
    error = await clear_logs(strategy_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"status": "success"}


@router.get("/market-status/{exchange}")
async def api_market_status(exchange: str):
    return get_market_status(exchange.upper())


@router.get("/events")
async def api_sse_events(request: Request):
    q: asyncio.Queue = asyncio.Queue()

    async def event_stream():
        with SSE_LOCK:
            SSE_SUBSCRIBERS.append(q)
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=30)
                    yield msg
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            with SSE_LOCK:
                if q in SSE_SUBSCRIBERS:
                    SSE_SUBSCRIBERS.remove(q)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
