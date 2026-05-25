from __future__ import annotations
import math
from fastapi import APIRouter
from api.state import app_state
from api.sector_map import get_sector_exposures

router = APIRouter(tags=["risk"])


@router.get("/risk")
async def get_risk_metrics():
    snapshot = await app_state.async_snapshot()
    portfolio = snapshot.get("portfolio", {})
    metrics = snapshot.get("metrics", {})

    total_value = portfolio.get("total_value", 0) if isinstance(portfolio, dict) else getattr(portfolio, "total_value", 0)
    cash = portfolio.get("cash", 0) if isinstance(portfolio, dict) else getattr(portfolio, "cash", 0)
    positions_data = portfolio.get("positions", {}) if isinstance(portfolio, dict) else getattr(portfolio, "positions", {})

    long_exposure = 0
    short_exposure = 0

    for symbol, pos in positions_data.items():
        if isinstance(pos, dict):
            mv = pos.get("market_value", 0)
            side = pos.get("side", "LONG")
        else:
            mv = getattr(pos, "market_value", 0)
            side = getattr(pos, "side", "LONG")
        if side == "LONG" or side == "long":
            long_exposure += mv
        else:
            short_exposure += mv

    gross_exposure = long_exposure + short_exposure
    net_exposure = long_exposure - short_exposure
    buying_power = cash * 2
    margin_used = gross_exposure * 0.5

    heatmap = await get_sector_exposures(positions_data)

    return {
        "totalExposure": gross_exposure,
        "totalExposurePercent": (gross_exposure / total_value * 100) if total_value else 0,
        "longExposure": long_exposure,
        "shortExposure": short_exposure,
        "netExposure": net_exposure,
        "grossExposure": gross_exposure,
        "buyingPower": buying_power,
        "cashAvailable": cash,
        "marginUsed": margin_used,
        "marginRequirement": gross_exposure * 0.25,
        "var95": metrics.get("var_95", 0.02) if isinstance(metrics, dict) else getattr(metrics, "var_95", 0.02),
        "cvar95": metrics.get("cvar_95", 0.03) if isinstance(metrics, dict) else getattr(metrics, "cvar_95", 0.03),
        "sharpeRatio": metrics.get("sharpe_ratio", 0) if isinstance(metrics, dict) else getattr(metrics, "sharpe_ratio", 0),
        "sortinoRatio": metrics.get("sortino_ratio", 0) if isinstance(metrics, dict) else getattr(metrics, "sortino_ratio", 0),
        "maxDrawdown": metrics.get("max_drawdown", 0) if isinstance(metrics, dict) else getattr(metrics, "max_drawdown", 0),
        "beta": 1.0,
        "portfolioHeatmap": heatmap,
    }
