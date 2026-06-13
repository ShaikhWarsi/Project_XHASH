from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from persistence.models_latency import OrderLatency
from persistence.models_traffic import TrafficLog
from persistence.multi_db import get_latency_db, get_logs_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/analyzer", tags=["analyzer"])


@router.get("/logs")
async def get_analyzer_logs(
    limit: int = Query(50),
    session: AsyncSession = Depends(get_latency_db),
):
    result = await session.execute(
        select(OrderLatency)
        .order_by(OrderLatency.timestamp.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return {
        "status": "success",
        "data": [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "order_id": log.order_id,
                "symbol": log.symbol,
                "order_type": log.order_type,
                "rtt_ms": log.rtt_ms,
                "total_latency_ms": log.total_latency_ms,
                "status": log.status,
                "error": log.error,
            }
            for log in logs
        ],
    }


@router.get("/traffic")
async def get_traffic_summary(
    session: AsyncSession = Depends(get_logs_db),
):
    total = await session.scalar(select(func.count(TrafficLog.id)))
    errors = await session.scalar(
        select(func.count(TrafficLog.id)).where(TrafficLog.status_code >= 400)
    )
    avg_duration = await session.scalar(select(func.avg(TrafficLog.duration_ms)))

    return {
        "status": "success",
        "data": {
            "total_requests": total or 0,
            "error_count": errors or 0,
            "error_rate": round((errors or 0) / max(total or 1, 1) * 100, 2),
            "avg_duration_ms": round(float(avg_duration or 0), 2),
        },
    }
