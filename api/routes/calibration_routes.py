from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from agents.calibration import AICalibration

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calibration", tags=["calibration"])

_calibration = AICalibration()


@router.get("/status")
async def calibration_status():
    return _calibration.get_optimal_thresholds()


@router.post("/record")
async def record_trade(
    signal: str = Query(...),
    confidence: float = Query(..., ge=0, le=1),
    pnl_pct: float = Query(...),
):
    from core.enums import SignalType
    try:
        sig = SignalType[signal.upper()]
    except KeyError:
        sig = signal
    _calibration.add_trade_outcome(sig, confidence, pnl_pct)
    return {"status": "recorded"}


@router.post("/calibrate")
async def run_calibration():
    return _calibration.calibrate()


@router.get("/thresholds")
async def get_thresholds():
    return _calibration.get_optimal_thresholds()


@router.get("/weights")
async def get_weights():
    return _calibration.get_analyst_weights()
