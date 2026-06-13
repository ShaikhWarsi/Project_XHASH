from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from persistence.models_traffic import TrafficLog, IPBan
from persistence.multi_db import get_logs_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/traffic", tags=["traffic"])


class BanRequest(BaseModel):
    ip_address: str
    reason: str = "Manual ban"
    duration_hours: int = 24
    permanent: bool = False


class UnbanRequest(BaseModel):
    ip_address: str


@router.get("/stats")
async def get_traffic_stats(
    hours: int = Query(24),
    session: AsyncSession = Depends(get_logs_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    total = await session.scalar(
        select(func.count(TrafficLog.id)).where(TrafficLog.timestamp >= cutoff)
    )
    error_count = await session.scalar(
        select(func.count(TrafficLog.id)).where(
            TrafficLog.timestamp >= cutoff,
            TrafficLog.status_code >= 400,
        )
    )
    avg_duration = await session.scalar(
        select(func.avg(TrafficLog.duration_ms)).where(TrafficLog.timestamp >= cutoff)
    )

    top_paths_result = await session.execute(
        select(TrafficLog.path, func.count(TrafficLog.id).label("count"))
        .where(TrafficLog.timestamp >= cutoff)
        .group_by(TrafficLog.path)
        .order_by(func.count(TrafficLog.id).desc())
        .limit(10)
    )

    total_count = total or 0
    return {
        "total_requests": total_count,
        "error_requests": error_count or 0,
        "error_rate": round((error_count or 0) / total_count * 100, 2) if total_count else 0,
        "avg_duration_ms": round(float(avg_duration or 0), 2),
        "top_endpoints": [
            {"path": row[0], "count": row[1]} for row in top_paths_result.fetchall()
        ],
        "time_period_hours": hours,
    }


@router.get("/timeseries")
async def get_traffic_timeseries(
    hours: int = Query(24),
    session: AsyncSession = Depends(get_logs_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    result = await session.execute(
        select(
            func.strftime("%Y-%m-%d %H:00:00", TrafficLog.timestamp).label("hour"),
            func.count(TrafficLog.id).label("count"),
        )
        .where(TrafficLog.timestamp >= cutoff)
        .group_by("hour")
        .order_by("hour")
    )
    rows = result.fetchall()
    return {
        "timestamps": [str(r[0]) for r in rows],
        "counts": [r[1] for r in rows],
    }


@router.post("/ban")
async def ban_ip_endpoint(
    req: BanRequest,
    session: AsyncSession = Depends(get_logs_db),
):
    if req.ip_address in ("127.0.0.1", "::1", "localhost"):
        return {"status": "error", "message": "Cannot ban localhost"}

    result = await session.execute(
        select(IPBan).where(IPBan.ip_address == req.ip_address)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.ban_reason = req.reason
        existing.ban_count += 1
        if req.permanent:
            existing.is_permanent = True
            existing.expires_at = None
        else:
            existing.is_permanent = False
            existing.expires_at = datetime.now(timezone.utc) + timedelta(hours=req.duration_hours)
    else:
        ban = IPBan(
            ip_address=req.ip_address,
            ban_reason=req.reason,
            is_permanent=req.permanent,
            expires_at=None if req.permanent else datetime.now(timezone.utc) + timedelta(hours=req.duration_hours),
            created_by="manual",
        )
        session.add(ban)

    await session.commit()
    return {"status": "success", "message": f"IP {req.ip_address} banned"}


@router.post("/unban")
async def unban_ip_endpoint(
    req: UnbanRequest,
    session: AsyncSession = Depends(get_logs_db),
):
    result = await session.execute(
        select(IPBan).where(IPBan.ip_address == req.ip_address)
    )
    ban = result.scalar_one_or_none()
    if ban:
        await session.delete(ban)
        await session.commit()
        return {"status": "success", "message": f"IP {req.ip_address} unbanned"}
    return {"status": "error", "message": "IP not found"}


@router.get("/bans")
async def list_bans(
    session: AsyncSession = Depends(get_logs_db),
):
    result = await session.execute(
        select(IPBan).order_by(IPBan.banned_at.desc())
    )
    bans = result.scalars().all()
    return {
        "status": "success",
        "data": [
            {
                "ip_address": b.ip_address,
                "reason": b.ban_reason,
                "is_permanent": b.is_permanent,
                "banned_at": b.banned_at.isoformat() if b.banned_at else None,
                "expires_at": b.expires_at.isoformat() if b.expires_at else None,
                "ban_count": b.ban_count,
            }
            for b in bans
        ],
    }
