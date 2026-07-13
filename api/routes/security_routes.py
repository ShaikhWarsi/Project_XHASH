from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from api.services.security_service import security_service, SECURITY_SETTINGS_DEFAULTS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/security", tags=["security_admin"])

_CACHED_SETTINGS = dict(SECURITY_SETTINGS_DEFAULTS)


class BanRequest(BaseModel):
    ip_address: str
    reason: str = "Manual ban"
    duration_hours: int = 24
    permanent: bool = False


class UnbanRequest(BaseModel):
    ip_address: str


class BanHostRequest(BaseModel):
    hostname: str
    reason: str = "Host-based ban"
    duration_hours: int = 24


class Clear404Request(BaseModel):
    ip_address: str


class SettingsUpdate(BaseModel):
    auto_ban_enabled: Optional[bool] = None
    auto_ban_threshold_404: Optional[int] = None
    auto_ban_threshold_api: Optional[int] = None
    auto_ban_duration_hours: Optional[int] = None
    repeat_offender_limit: Optional[int] = None


@router.get("")
def get_security_dashboard():
    return {
        "banned_ips": security_service.get_all_bans(),
        "stats": security_service.get_security_stats(),
        "settings": _CACHED_SETTINGS,
        "tracker_404": security_service.get_404_tracker(),
    }


@router.post("/ban")
def ban_ip(body: BanRequest):
    success = security_service.ban_ip(
        ip_address=body.ip_address,
        reason=body.reason,
        duration_hours=body.duration_hours,
        permanent=body.permanent,
        created_by="admin",
    )
    if not success:
        return {"status": "error", "message": f"Cannot ban localhost IP: {body.ip_address}"}
    return {"status": "success", "message": f"IP {body.ip_address} banned"}


@router.post("/unban")
def unban_ip(body: UnbanRequest):
    success = security_service.unban_ip(body.ip_address)
    if not success:
        return {"status": "error", "message": f"IP {body.ip_address} not found in ban list"}
    return {"status": "success", "message": f"IP {body.ip_address} unbanned"}


@router.post("/ban-host")
def ban_host(body: BanHostRequest):
    success = security_service.ban_host(
        hostname=body.hostname,
        reason=body.reason,
        duration_hours=body.duration_hours,
    )
    if not success:
        return {"status": "error", "message": f"Could not resolve hostname: {body.hostname}"}
    return {"status": "success", "message": f"Host {body.hostname} banned"}


@router.post("/clear-404")
def clear_404(body: Clear404Request):
    security_service.clear_404_tracker(body.ip_address)
    return {"status": "success", "message": f"404 tracker cleared for {body.ip_address}"}


@router.get("/stats")
def get_stats():
    return security_service.get_security_stats()


@router.get("/settings")
def get_settings():
    return _CACHED_SETTINGS


@router.post("/settings")
def update_settings(body: SettingsUpdate):
    updates = body.model_dump(exclude_none=True)
    _CACHED_SETTINGS.update(updates)
    if "auto_ban_enabled" in updates:
        security_service._auto_ban_enabled = updates["auto_ban_enabled"]
    if "auto_ban_threshold_404" in updates:
        security_service._auto_ban_threshold_404 = updates["auto_ban_threshold_404"]
    if "auto_ban_threshold_api" in updates:
        security_service._auto_ban_threshold_api = updates["auto_ban_threshold_api"]
    if "auto_ban_duration_hours" in updates:
        security_service._auto_ban_duration_hours = updates["auto_ban_duration_hours"]
    if "repeat_offender_limit" in updates:
        security_service._repeat_offender_limit = updates["repeat_offender_limit"]
    return {"status": "success", "message": "Security settings updated", "settings": _CACHED_SETTINGS}


@router.get("/login-activity")
def get_login_activity(limit: int = 50):
    return {"attempts": security_service.get_login_attempts(limit=limit)}
