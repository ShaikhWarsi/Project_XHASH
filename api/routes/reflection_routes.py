from __future__ import annotations

import logging

from fastapi import APIRouter, Query

from agents.reflection_service import ReflectionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reflection", tags=["reflection"])

_service = ReflectionService()


@router.get("/report")
async def get_report():
    return _service.generate_report()


@router.get("/stats")
async def get_stats():
    return _service.reflect_on_period()


@router.post("/record")
async def record_decision(
    signal: str = Query(...),
    confidence: float = Query(..., ge=0, le=1),
    reasoning: str = Query(""),
):
    _service.record_decision({
        "signal": signal,
        "confidence": confidence,
        "reasoning": reasoning,
    })
    return {"status": "recorded"}


@router.post("/outcome")
async def record_outcome(
    signal: str = Query(...),
    confidence: float = Query(..., ge=0, le=1),
    pnl_pct: float = Query(...),
):
    _service.record_decision(
        decision={"signal": signal, "confidence": confidence},
        outcome={"pnl_pct": pnl_pct},
    )
    return {"status": "recorded"}


@router.get("/worst-trades")
async def worst_trades(n: int = Query(5)):
    return {"trades": _service.get_worst_trades(n)}


@router.get("/best-trades")
async def best_trades(n: int = Query(5)):
    return {"trades": _service.get_best_trades(n)}
