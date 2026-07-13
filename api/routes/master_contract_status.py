from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from persistence.models_auth import MasterContractStatus
from persistence.multi_db import get_auth_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/master-contract", tags=["master_contract"])


class UpdateStatusRequest(BaseModel):
    broker: str
    status: str
    message: str = ""
    total_symbols: str = "0"


@router.get("/status")
async def get_all_status(
    session: AsyncSession = Depends(get_auth_db),
):
    result = await session.execute(
        select(MasterContractStatus).order_by(MasterContractStatus.broker)
    )
    statuses = result.scalars().all()

    return {
        "status": "success",
        "data": [
            {
                "broker": s.broker,
                "status": s.status,
                "message": s.message,
                "last_updated": s.last_updated.isoformat() if s.last_updated else None,
                "total_symbols": s.total_symbols,
                "is_ready": s.is_ready,
                "last_download_time": s.last_download_time.isoformat() if s.last_download_time else None,
            }
            for s in statuses
        ],
    }


@router.get("/status/{broker}")
async def get_broker_status(
    broker: str,
    session: AsyncSession = Depends(get_auth_db),
):
    result = await session.execute(
        select(MasterContractStatus).where(MasterContractStatus.broker == broker)
    )
    status = result.scalar_one_or_none()

    if not status:
        return {
            "broker": broker,
            "status": "unknown",
            "message": "No status available",
            "is_ready": False,
        }

    return {
        "broker": status.broker,
        "status": status.status,
        "message": status.message,
        "last_updated": status.last_updated.isoformat() if status.last_updated else None,
        "total_symbols": status.total_symbols,
        "is_ready": status.is_ready,
    }


@router.get("/ready/{broker}")
async def check_broker_ready(
    broker: str,
    session: AsyncSession = Depends(get_auth_db),
):
    result = await session.execute(
        select(MasterContractStatus).where(MasterContractStatus.broker == broker)
    )
    status = result.scalar_one_or_none()
    return {"broker": broker, "ready": status.is_ready if status else False}


@router.post("/retry")
async def retry_download(
    req: UpdateStatusRequest,
    session: AsyncSession = Depends(get_auth_db),
):
    result = await session.execute(
        select(MasterContractStatus).where(MasterContractStatus.broker == req.broker)
    )
    status = result.scalar_one_or_none()

    if status:
        status.status = "pending"
        status.message = "Retry requested"
        status.last_updated = datetime.now(timezone.utc)
        status.is_ready = False
    else:
        status = MasterContractStatus(
            broker=req.broker,
            status="pending",
            message="Retry requested",
            last_updated=datetime.now(timezone.utc),
            is_ready=False,
        )
        session.add(status)

    await session.commit()
    return {"status": "success", "message": f"Retry initiated for {req.broker}"}


@router.post("/update")
async def update_status(
    req: UpdateStatusRequest,
    session: AsyncSession = Depends(get_auth_db),
):
    result = await session.execute(
        select(MasterContractStatus).where(MasterContractStatus.broker == req.broker)
    )
    status = result.scalar_one_or_none()

    if status:
        status.status = req.status
        status.message = req.message
        status.total_symbols = req.total_symbols
        status.is_ready = req.status == "success"
        status.last_updated = datetime.now(timezone.utc)
    else:
        status = MasterContractStatus(
            broker=req.broker,
            status=req.status,
            message=req.message,
            total_symbols=req.total_symbols,
            is_ready=req.status == "success",
            last_updated=datetime.now(timezone.utc),
        )
        session.add(status)

    await session.commit()
    return {"status": "success", "message": f"Status updated for {req.broker}"}
