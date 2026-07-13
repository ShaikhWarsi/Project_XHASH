from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from persistence.models_health import HealthMetric, HealthAlert
from persistence.multi_db import get_health_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/system")
async def get_system_health(
    session: AsyncSession = Depends(get_health_db),
):
    result = await session.execute(
        select(HealthMetric).order_by(HealthMetric.timestamp.desc()).limit(1)
    )
    metric = result.scalar_one_or_none()

    if not metric:
        return {"status": "unknown", "message": "No health metrics collected yet"}

    return {
        "status": metric.overall_status or "unknown",
        "timestamp": metric.timestamp.isoformat() if metric.timestamp else None,
        "fd": {
            "count": metric.fd_count,
            "usage_percent": metric.fd_usage_percent,
            "status": metric.fd_status,
        },
        "memory": {
            "rss_mb": metric.memory_rss_mb,
            "vms_mb": metric.memory_vms_mb,
            "percent": metric.memory_percent,
            "status": metric.memory_status,
        },
        "threads": {"count": metric.thread_count},
        "database": metric.db_connections,
    }


@router.get("/metrics")
async def get_health_metrics(
    hours: int = Query(24),
    session: AsyncSession = Depends(get_health_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await session.execute(
        select(HealthMetric)
        .where(HealthMetric.timestamp >= cutoff)
        .order_by(HealthMetric.timestamp.asc())
    )
    metrics = result.scalars().all()

    return {
        "total_samples": len(metrics),
        "time_period_hours": hours,
        "metrics": [
            {
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                "fd_count": m.fd_count,
                "memory_rss_mb": m.memory_rss_mb,
                "thread_count": m.thread_count,
                "overall_status": m.overall_status,
            }
            for m in metrics
        ],
    }


@router.get("/alerts")
async def get_health_alerts(
    active_only: bool = Query(False),
    session: AsyncSession = Depends(get_health_db),
):
    query = select(HealthAlert).order_by(HealthAlert.timestamp.desc())
    if active_only:
        query = query.where(HealthAlert.resolved == False)

    result = await session.execute(query)
    alerts = result.scalars().all()

    return {
        "status": "success",
        "data": [
            {
                "id": a.id,
                "type": a.alert_type,
                "severity": a.severity,
                "message": a.message,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                "resolved": a.resolved,
                "acknowledged": a.acknowledged,
            }
            for a in alerts
        ],
    }


@router.get("/check")
async def quick_health_check(
    session: AsyncSession = Depends(get_health_db),
):
    result = await session.execute(
        select(HealthMetric).order_by(HealthMetric.timestamp.desc()).limit(1)
    )
    metric = result.scalar_one_or_none()

    if metric and metric.overall_status == "pass":
        return {"status": "ok", "message": "All systems operational"}

    return {"status": "degraded", "message": "System health check indicates issues"}
