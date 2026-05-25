from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from api.state import app_state

logger = logging.getLogger(__name__)

router = APIRouter(tags=["risk"])


async def risk_event_generator(request: Request):
    try:
        _max_iter = 1000000
        for _ in range(_max_iter):
            if await request.is_disconnected():
                break

            snapshot = await app_state.async_snapshot()
            portfolio = snapshot.get("portfolio", {})
            metrics = snapshot.get("metrics", {})

            total_value = portfolio.get("total_value", 0)
            cash = portfolio.get("cash", 0)
            positions_data = portfolio.get("positions", {})

            long_exposure = 0.0
            short_exposure = 0.0
            for sym, pos in positions_data.items():
                mv = pos.get("market_value", 0)
                side = pos.get("side", "LONG")
                if side == "LONG":
                    long_exposure += mv
                else:
                    short_exposure += mv

            gross_exposure = long_exposure + short_exposure
            net_exposure = long_exposure - short_exposure

            data = {
                "timestamp": snapshot.get("timestamp", ""),
                "totalExposure": gross_exposure,
                "totalExposurePercent": (gross_exposure / total_value * 100) if total_value else 0,
                "longExposure": long_exposure,
                "shortExposure": short_exposure,
                "netExposure": net_exposure,
                "grossExposure": gross_exposure,
                "buyingPower": cash * 2,
                "cashAvailable": cash,
                "marginUsed": gross_exposure * 0.5,
                "marginRequirement": gross_exposure * 0.25,
                "var95": metrics.get("var_95", 0.02),
                "cvar95": metrics.get("cvar_95", 0.03),
                "sharpeRatio": metrics.get("sharpe_ratio", 0),
                "sortinoRatio": metrics.get("sortino_ratio", 0),
                "maxDrawdown": metrics.get("max_drawdown", 0),
                "totalReturn": metrics.get("total_return", 0),
                "annualizedVol": metrics.get("annualized_vol", 0),
                "winRate": metrics.get("win_rate", 0),
            }

            yield f"data: {json.dumps(data, default=str)}\n\n"
            await asyncio.sleep(5)
        else:
            logger.warning("risk_event_generator hit max iterations")
    except asyncio.CancelledError:
        pass


@router.get("/risk/live")
async def stream_risk_live(request: Request):
    return StreamingResponse(
        risk_event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
