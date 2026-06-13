from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

import numpy as np
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from persistence.models_latency import OrderLatency
from persistence.multi_db import get_latency_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/latency", tags=["latency"])


@router.get("/stats")
async def get_latency_stats(
    hours: int = Query(24, description="Hours of data to analyze"),
    session: AsyncSession = Depends(get_latency_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    total = await session.scalar(
        select(func.count(OrderLatency.id)).where(OrderLatency.timestamp >= cutoff)
    )
    failed = await session.scalar(
        select(func.count(OrderLatency.id)).where(
            OrderLatency.timestamp >= cutoff,
            OrderLatency.status == "FAILED",
        )
    )
    avg_rtt = await session.scalar(
        select(func.avg(OrderLatency.rtt_ms)).where(OrderLatency.timestamp >= cutoff)
    )
    avg_total = await session.scalar(
        select(func.avg(OrderLatency.total_latency_ms)).where(OrderLatency.timestamp >= cutoff)
    )

    all_latencies_result = await session.execute(
        select(OrderLatency.total_latency_ms).where(
            OrderLatency.timestamp >= cutoff,
            OrderLatency.total_latency_ms.isnot(None),
        )
    )
    all_latencies = [r[0] for r in all_latencies_result.fetchall()]

    p50 = p95 = p99 = 0
    if all_latencies:
        p50 = float(np.percentile(all_latencies, 50))
        p95 = float(np.percentile(all_latencies, 95))
        p99 = float(np.percentile(all_latencies, 99))

    success_rate = ((total - failed) / total * 100) if total else 0

    return {
        "total_orders": total or 0,
        "failed_orders": failed or 0,
        "success_rate": round(success_rate, 1),
        "avg_rtt": round(float(avg_rtt or 0), 2),
        "avg_total": round(float(avg_total or 0), 2),
        "p50": round(p50, 2),
        "p95": round(p95, 2),
        "p99": round(p99, 2),
        "time_period_hours": hours,
    }


@router.get("/timeseries")
async def get_latency_timeseries(
    hours: int = Query(24),
    session: AsyncSession = Depends(get_latency_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await session.execute(
        select(OrderLatency.timestamp, OrderLatency.total_latency_ms)
        .where(
            OrderLatency.timestamp >= cutoff,
            OrderLatency.total_latency_ms.isnot(None),
        )
        .order_by(OrderLatency.timestamp.asc())
    )
    rows = result.fetchall()
    return {
        "timestamps": [r[0].isoformat() if hasattr(r[0], 'isoformat') else str(r[0]) for r in rows],
        "values": [round(float(r[1]), 2) for r in rows],
    }


@router.get("/histogram")
async def get_latency_histogram(
    hours: int = Query(24),
    session: AsyncSession = Depends(get_latency_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await session.execute(
        select(OrderLatency.total_latency_ms).where(
            OrderLatency.timestamp >= cutoff,
            OrderLatency.total_latency_ms.isnot(None),
        )
    )
    values = [r[0] for r in result.fetchall()]

    if not values:
        return {"buckets": [], "counts": []}

    buckets = list(range(0, 1000, 50))
    counts = [sum(1 for v in values if b <= v < b + 50) for b in buckets]

    return {
        "buckets": [f"{b}-{b+50}ms" for b in buckets],
        "counts": counts,
        "over_1000ms": sum(1 for v in values if v >= 1000),
    }
