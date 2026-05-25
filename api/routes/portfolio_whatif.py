from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class WhatIfRequest(BaseModel):
    current_weights: dict[str, float]
    target_weights: dict[str, float]
    rebalance_cost: float = 0.001


class WhatIfResponse(BaseModel):
    cost: float
    turnover: float
    tax_impact: float
    total_cost: float


@router.post("/what-if", response_model=WhatIfResponse)
async def portfolio_whatif(req: WhatIfRequest):
    all_symbols = set(req.current_weights) | set(req.target_weights)
    turnover = 0.0
    for sym in all_symbols:
        current = req.current_weights.get(sym, 0.0)
        target = req.target_weights.get(sym, 0.0)
        turnover += abs(target - current)

    turnover = round(turnover, 6)
    cost = round(turnover * req.rebalance_cost, 6)
    tax_impact = round(turnover * 0.0005, 6)
    total_cost = round(cost + tax_impact, 6)

    return WhatIfResponse(
        cost=cost,
        turnover=turnover,
        tax_impact=tax_impact,
        total_cost=total_cost,
    )
