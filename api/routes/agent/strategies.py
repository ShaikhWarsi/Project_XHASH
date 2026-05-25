from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.agent_scopes import SCOPE_R, SCOPE_W
from api.auth.agent_auth import agent_required, AgentTokenData, write_audit_log, market_allowed
from api.routes.agent import agent_v1
from persistence.database import get_session
from persistence.models import BacktestRun

logger = logging.getLogger(__name__)


def _safe_json(val):
    if not val:
        return {}
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return {}


@agent_v1.get("/strategies")
async def list_strategies(
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_session),
    token: AgentTokenData = Depends(agent_required),
):
    result = await db.execute(
        select(BacktestRun)
        .order_by(BacktestRun.timestamp.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    return {
        "strategies": [
            {
                "id": r.id,
                "config": _safe_json(r.config_json),
                "total_return": r.total_return,
                "sharpe_ratio": r.sharpe_ratio,
                "max_drawdown": r.max_drawdown,
                "created_at": r.timestamp.isoformat() if r.timestamp else None,
            }
            for r in rows
        ],
        "total": len(rows),
    }


@agent_v1.get("/strategies/{strategy_id}")
async def get_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_session),
    token: AgentTokenData = Depends(agent_required),
):
    result = await db.execute(select(BacktestRun).where(BacktestRun.id == strategy_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {
        "id": row.id,
        "config": _safe_json(row.config_json),
        "metrics": _safe_json(row.metrics_json),
        "total_return": row.total_return,
        "sharpe_ratio": row.sharpe_ratio,
        "max_drawdown": row.max_drawdown,
        "created_at": row.timestamp.isoformat() if row.timestamp else None,
    }
