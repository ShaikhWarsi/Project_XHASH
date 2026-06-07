from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)

class AuditLogEntry(BaseModel):
    action: str
    entity_type: str | None = None
    entity_id: str | None = None
    details: dict[str, Any] = {}
    timestamp: str | None = None


router = APIRouter(prefix="/audit", tags=["audit"])

_audit_logs: list[dict[str, Any]] = []
_MAX_AUDIT_LOGS = 5000


@router.get("/logs")
async def audit_logs(limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0)):
    total = len(_audit_logs)
    start = max(0, total - offset - limit)
    end = max(0, total - offset)
    return {"logs": _audit_logs[start:end], "total": total, "limit": limit, "offset": offset}


@router.post("/log")
async def create_log(entry: AuditLogEntry):
    log = entry.model_dump()
    if "timestamp" not in log or not log["timestamp"]:
        log["timestamp"] = datetime.now(timezone.utc).isoformat()
    _audit_logs.append(log)
    if len(_audit_logs) > _MAX_AUDIT_LOGS:
        _audit_logs[:len(_audit_logs) - _MAX_AUDIT_LOGS] = []
    logger.info("Audit log: %s", entry.action)
    return {"status": "ok"}
