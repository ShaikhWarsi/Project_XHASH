from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from api.services.protections import (
    ProtectionContext,
    MaxDrawdownGuard,
    CooldownPeriod,
    MaxDailyLoss,
    MinTradesGuard,
    REGISTRY,
    check_all,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/protections", tags=["protections"])


@router.get("/available")
async def list_protections():
    return {
        "protections": [
            {"name": name, "description": cls(name=name).description}
            for name, cls in REGISTRY.items()
        ]
    }


@router.post("/check")
async def check_protections(
    initial_capital: float,
    current_equity: float,
    peak_equity: float,
    total_trades: int = 0,
    consecutive_losses: int = 0,
    current_drawdown_pct: float = 0,
    max_drawdown_pct: float = 25,
    max_consecutive_losses: int = 5,
    max_daily_loss_pct: float = 5,
    daily_returns: list[float] = Query(default=[]),
):
    ctx = ProtectionContext(
        initial_capital=initial_capital,
        current_equity=current_equity,
        peak_equity=peak_equity,
        total_trades=total_trades,
        consecutive_losses=consecutive_losses,
        current_drawdown_pct=current_drawdown_pct,
        daily_returns=daily_returns,
        timestamps=[],
    )
    protections = [
        MaxDrawdownGuard(max_drawdown_pct),
        CooldownPeriod(max_consecutive_losses),
        MaxDailyLoss(max_daily_loss_pct),
        MinTradesGuard(),
    ]
    results = check_all(protections, ctx)
    passed = all(r.passed for r in results)
    return {
        "passed": passed,
        "results": [
            {"protection": r.__class__.__name__ if hasattr(r, '__class__') else "unknown", "passed": r.passed, "reason": r.reason}
            for r in results
        ],
    }
