from __future__ import annotations

import time
from typing import Optional

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.agent_scopes import SCOPE_B
from api.auth.agent_auth import agent_required, AgentTokenData, write_audit_log
from api.agent_jobs import submit_job
from api.routes.agent import agent_v1
from persistence.database import get_session
from pydantic import BaseModel


class BacktestRequest(BaseModel):
    market: str
    symbol: str
    timeframe: str = "1d"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    config: dict = {}


def _run_backtest_job(payload: dict, on_progress=None):
    from backtesting.engine import BacktestEngine
    import pandas as pd
    from datetime import datetime
    from data.registry import ProviderRegistry
    from core.enums import Timeframe

    market = payload.get("market", "")
    symbol = payload.get("symbol", "")
    timeframe = payload.get("timeframe", "1d")
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    config = payload.get("config", {})

    if on_progress:
        on_progress({"phase": "fetching_data", "status": "running"})

    provider = ProviderRegistry.get("yfinance")
    if not provider:
        raise RuntimeError("No data provider available")

    start = datetime.fromisoformat(start_date) if start_date else datetime(2020, 1, 1)
    end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    tf = Timeframe(timeframe) if hasattr(Timeframe, timeframe) else Timeframe("1d")

    data = provider.fetch_bars(symbol=symbol, timeframe=tf, start=start, end=end)
    if data is None or data.empty:
        raise RuntimeError(f"No data for {symbol}")

    if on_progress:
        on_progress({"phase": "running_backtest", "status": "running", "bars": len(data)})

    engine = BacktestEngine(
        initial_capital=config.get("initial_capital", 1_000_000.0),
        commission=config.get("commission", 0.001),
        slippage=config.get("slippage", 0.001),
    )

    def dummy_strategy(data):
        return data

    result = engine.run(dummy_strategy, data)
    metrics = {
        "total_return": result.total_return,
        "sharpe_ratio": result.sharpe_ratio,
        "max_drawdown": result.max_drawdown,
        "total_trades": result.total_trades,
        "win_rate": result.win_rate,
        "profit_factor": result.profit_factor,
    }

    if on_progress:
        on_progress({"phase": "completed", "metrics": metrics})

    return metrics


@agent_v1.post("/backtests")
async def submit_backtest(
    body: BacktestRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_session),
    token: AgentTokenData = Depends(agent_required),
):
    from api.auth.agent_auth import market_allowed, instrument_allowed
    if not market_allowed(token, body.market):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Market not allowed")
    if not instrument_allowed(token, body.symbol):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Symbol not allowed")

    job = submit_job(
        user_id=token.user_id,
        agent_token_id=token.id,
        kind="backtest",
        request_payload=body.model_dump(),
        runner=_run_backtest_job,
        idempotency_key=idempotency_key,
    )

    return job
