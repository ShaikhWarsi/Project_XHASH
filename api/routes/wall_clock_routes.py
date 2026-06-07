from __future__ import annotations

import logging

from fastapi import APIRouter, Query

from agents.wall_clock import get_wall_clock

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/wall-clock", tags=["wall_clock"])


@router.get("/active")
async def active_timers():
    return {"active": get_wall_clock().get_active()}


@router.get("/completed")
async def completed_timers(limit: int = Query(50)):
    return {"completed": get_wall_clock().get_completed(limit)}


@router.get("/summary")
async def timer_summary():
    return get_wall_clock().get_summary()


@router.post("/start")
async def start_timer(name: str = Query(...)):
    timer_id = get_wall_clock().start(name)
    return {"timer_id": timer_id}


@router.post("/stop")
async def stop_timer(timer_id: str = Query(...)):
    elapsed = get_wall_clock().stop(timer_id)
    if elapsed is None:
        from fastapi import HTTPException
        raise HTTPException(404, "timer not found")
    return {"elapsed_ms": elapsed}
