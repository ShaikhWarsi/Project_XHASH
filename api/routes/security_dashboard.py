from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func

from persistence.multi_db import LogsSession, AuthSession
from persistence.models_traffic import IPBan, Error404Tracker, InvalidAPIKeyTracker
from persistence.models_auth import Settings, LoginAttempt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/security", tags=["security_dashboard"])

DEFAULT_SETTINGS = {
    "auto_ban_enabled": False,
    "404_threshold": 100,
    "404_ban_duration": 0,
    "api_threshold": 100,
    "api_ban_duration": 0,
    "repeat_offender_limit": 2,
}


def _get_settings() -> dict:
    session = AuthSession()
    try:
        s = session.query(Settings).filter(Settings.config_key == "security").first()
        if s is None:
            return dict(DEFAULT_SETTINGS)
        return {**DEFAULT_SETTINGS, **json.loads(s.config_value)}
    finally:
        session.close()


def _save_settings(data: dict) -> None:
    session = AuthSession()
    try:
        s = session.query(Settings).filter(Settings.config_key == "security").first()
        if s is None:
            s = Settings(config_key="security", config_value=json.dumps(data))
            session.add(s)
        else:
            existing = json.loads(s.config_value)
            existing.update(data)
            s.config_value = json.dumps(existing)
        session.commit()
    finally:
        session.close()


class SecuritySettingsUpdate(BaseModel):
    auto_ban_enabled: bool | None = None
    threshold_404: int | None = None
    ban_duration_404: int | None = None
    threshold_api: int | None = None
    ban_duration_api: int | None = None
    repeat_offender_limit: int | None = None


@router.get("/settings")
def get_security_settings():
    return _get_settings()


@router.post("/settings")
def update_security_settings(body: SecuritySettingsUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    _save_settings(data)
    return {"status": "success", "message": "Security settings saved"}


@router.get("/stats")
def get_security_stats():
    logs = LogsSession()
    auth = AuthSession()
    try:
        settings = _get_settings()
        total_bans = logs.query(IPBan).count()
        permanent_bans = logs.query(IPBan).filter(IPBan.is_permanent == True).count()
        temporary_bans = total_bans - permanent_bans
        suspicious_ips = logs.query(Error404Tracker).count()
        near_threshold = logs.query(Error404Tracker).filter(
            Error404Tracker.error_count >= settings.get("404_threshold", 100) * 0.8
        ).count()
        return {
            "total_bans": total_bans,
            "permanent_bans": permanent_bans,
            "temporary_bans": temporary_bans,
            "suspicious_ips": suspicious_ips,
            "near_threshold": near_threshold,
        }
    finally:
        logs.close()
        auth.close()


@router.get("/data")
def get_security_data():
    logs = LogsSession()
    try:
        banned = logs.query(IPBan).order_by(IPBan.banned_at.desc()).all()
        suspicious = logs.query(Error404Tracker).order_by(Error404Tracker.error_count.desc()).all()
        api_abuse = logs.query(InvalidAPIKeyTracker).order_by(InvalidAPIKeyTracker.attempt_count.desc()).all()
        return {
            "banned_ips": [
                {
                    "ip_address": b.ip_address,
                    "ban_reason": b.ban_reason or "",
                    "banned_at": b.banned_at.strftime("%d-%m-%Y %I:%M:%S %p") if b.banned_at else "Unknown",
                    "expires_at": b.expires_at.strftime("%d-%m-%Y %I:%M:%S %p") if b.expires_at else "Permanent",
                    "is_permanent": b.is_permanent or False,
                    "ban_count": b.ban_count or 1,
                    "created_by": b.created_by or "system",
                }
                for b in banned
            ],
            "suspicious_ips": [
                {
                    "ip_address": s.ip_address,
                    "error_count": s.error_count or 0,
                    "first_error_at": s.first_error_at.strftime("%d-%m-%Y %I:%M:%S %p") if s.first_error_at else "Unknown",
                    "last_error_at": s.last_error_at.strftime("%d-%m-%Y %I:%M:%S %p") if s.last_error_at else "Unknown",
                    "paths_attempted": s.paths_attempted or "",
                }
                for s in suspicious
            ],
            "api_abuse_ips": [
                {
                    "ip_address": a.ip_address,
                    "attempt_count": a.attempt_count or 0,
                    "first_attempt_at": a.first_attempt_at.strftime("%d-%m-%Y %I:%M:%S %p") if a.first_attempt_at else "Unknown",
                    "last_attempt_at": a.last_attempt_at.strftime("%d-%m-%Y %I:%M:%S %p") if a.last_attempt_at else "Unknown",
                    "api_keys_tried": a.api_keys_tried or "",
                }
                for a in api_abuse
            ],
            "security_settings": _get_settings(),
        }
    finally:
        logs.close()


@router.post("/ban-ip")
def ban_ip(body: dict):
    ip = body.get("ip", "").strip()
    reason = body.get("reason", "Manual ban")
    duration_hours = body.get("duration_hours", 24)
    logs = LogsSession()
    try:
        existing = logs.query(IPBan).filter(IPBan.ip_address == ip).first()
        if existing:
            existing.ban_count = (existing.ban_count or 0) + 1
            existing.ban_reason = reason
            if duration_hours == 0:
                existing.is_permanent = True
                existing.expires_at = None
            else:
                existing.is_permanent = False
                existing.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=duration_hours)
        else:
            if duration_hours == 0:
                expires = None
                permanent = True
            else:
                expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=duration_hours)
                permanent = False
            ban = IPBan(ip_address=ip, ban_reason=reason, is_permanent=permanent, expires_at=expires, created_by="admin")
            logs.add(ban)
        logs.commit()
        return {"status": "success", "message": f"IP {ip} banned"}
    finally:
        logs.close()


@router.post("/unban-ip")
def unban_ip(body: dict):
    ip = body.get("ip", "").strip()
    logs = LogsSession()
    try:
        logs.query(IPBan).filter(IPBan.ip_address == ip).delete()
        logs.commit()
        return {"status": "success", "message": f"IP {ip} unbanned"}
    finally:
        logs.close()


@router.post("/clear-suspicious")
def clear_suspicious(body: dict):
    ip = body.get("ip", "").strip()
    logs = LogsSession()
    try:
        logs.query(Error404Tracker).filter(Error404Tracker.ip_address == ip).delete()
        logs.commit()
        return {"status": "success"}
    finally:
        logs.close()


@router.post("/clear-api-abuse")
def clear_api_abuse(body: dict):
    ip = body.get("ip", "").strip()
    logs = LogsSession()
    try:
        logs.query(InvalidAPIKeyTracker).filter(InvalidAPIKeyTracker.ip_address == ip).delete()
        logs.commit()
        return {"status": "success"}
    finally:
        logs.close()


@router.get("/login-activity")
def get_login_activity():
    auth = AuthSession()
    try:
        attempts = auth.query(LoginAttempt).order_by(LoginAttempt.timestamp.desc()).limit(100).all()
        return {
            "status": "success",
            "attempts": [
                {
                    "username": a.username,
                    "ip_address": a.ip_address,
                    "device_info": a.device_info,
                    "status": a.status,
                    "login_type": a.login_type,
                    "broker": a.broker,
                    "failure_reason": a.failure_reason,
                    "timestamp": a.timestamp.strftime("%d-%m-%Y %I:%M:%S %p") if a.timestamp else None,
                }
                for a in attempts
            ],
        }
    finally:
        auth.close()


@router.post("/login-activity/clear")
def clear_login_activity():
    auth = AuthSession()
    try:
        auth.query(LoginAttempt).delete()
        auth.commit()
        return {"status": "success", "message": "Login history cleared"}
    finally:
        auth.close()



