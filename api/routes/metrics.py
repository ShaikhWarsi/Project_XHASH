from __future__ import annotations

from fastapi import APIRouter

from api.state import app_state

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("")
async def get_metrics():
    m = app_state.metrics
    if m:
        return {
            "sharpe_ratio": m.sharpe_ratio,
            "sortino_ratio": m.sortino_ratio,
            "max_drawdown": m.max_drawdown,
            "total_return": m.total_return,
            "annualized_return": m.annualized_return,
            "annualized_vol": m.annualized_volatility,
            "win_rate": m.win_rate,
            "profit_factor": m.profit_factor,
            "total_trades": m.total_trades,
            "calmar_ratio": m.calmar_ratio,
            "var_95": m.value_at_risk_95,
            "cvar_95": m.conditional_var_95,
            "max_drawdown_duration": m.max_drawdown_duration,
        }
    return {
        "sharpe_ratio": None, "sortino_ratio": None, "max_drawdown": None,
        "total_return": None, "annualized_return": None, "annualized_vol": None,
        "win_rate": None, "profit_factor": None, "total_trades": 0,
        "calmar_ratio": None, "var_95": None, "cvar_95": None, "max_drawdown_duration": 0,
    }


@router.get("/attribution")
async def get_attribution():
    a = app_state.attribution
    if a:
        return {
            "total_return": a.total_return,
            "by_symbol": a.by_symbol,
            "by_signal_type": a.by_signal_type,
            "long_contribution": a.long_contribution,
            "short_contribution": a.short_contribution,
        }
    return {"by_symbol": {}, "by_signal_type": {}}
