from __future__ import annotations

import time
import logging
import socket
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

SECURITY_SETTINGS_DEFAULTS = {
    "auto_ban_enabled": True,
    "auto_ban_threshold_404": 50,
    "auto_ban_threshold_api": 20,
    "auto_ban_duration_hours": 24,
    "repeat_offender_limit": 3,
}

_LOCALHOST_IPS = {"127.0.0.1", "::1", "localhost", "0.0.0.0"}


class SecurityService:
    def __init__(self):
        self._banned_ips: dict[str, dict] = {}
        self._ip_ban_cache: dict[str, bool] = {}
        self._error_404_tracker: dict[str, list[float]] = {}
        self._invalid_api_key_tracker: dict[str, list[float]] = {}
        self._login_attempts: list[dict] = []
        self._auto_ban_threshold_404: int = SECURITY_SETTINGS_DEFAULTS["auto_ban_threshold_404"]
        self._auto_ban_threshold_api: int = SECURITY_SETTINGS_DEFAULTS["auto_ban_threshold_api"]
        self._auto_ban_enabled: bool = SECURITY_SETTINGS_DEFAULTS["auto_ban_enabled"]
        self._auto_ban_duration_hours: int = SECURITY_SETTINGS_DEFAULTS["auto_ban_duration_hours"]
        self._repeat_offender_limit: int = SECURITY_SETTINGS_DEFAULTS["repeat_offender_limit"]

    @property
    def auto_ban_threshold(self) -> int:
        return self._auto_ban_threshold_404

    @auto_ban_threshold.setter
    def auto_ban_threshold(self, value: int):
        self._auto_ban_threshold_404 = max(1, value)

    def is_ip_banned(self, ip_address: str) -> bool:
        cached = self._ip_ban_cache.get(ip_address)
        if cached is not None:
            return cached
        ban = self._banned_ips.get(ip_address)
        if ban is None:
            self._ip_ban_cache[ip_address] = False
            return False
        if ban.get("is_permanent"):
            self._ip_ban_cache[ip_address] = True
            return True
        expires_at = ban.get("expires_at")
        if expires_at and datetime.now(timezone.utc) < expires_at:
            self._ip_ban_cache[ip_address] = True
            return True
        del self._banned_ips[ip_address]
        self._ip_ban_cache[ip_address] = False
        return False

    def ban_ip(self, ip_address: str, reason: str = "Manual ban", duration_hours: int = 24, permanent: bool = False, created_by: str = "system") -> bool:
        if ip_address in _LOCALHOST_IPS:
            logger.warning("Attempted to ban localhost IP: %s", ip_address)
            return False
        now = datetime.now(timezone.utc)
        expires_at = None if permanent else (now + timedelta(hours=duration_hours))
        existing = self._banned_ips.get(ip_address)
        ban_count = (existing.get("ban_count", 0) if existing else 0) + 1
        self._banned_ips[ip_address] = {
            "ip_address": ip_address,
            "reason": reason,
            "banned_at": now,
            "expires_at": expires_at,
            "is_permanent": permanent,
            "ban_count": ban_count,
            "created_by": created_by,
        }
        self._ip_ban_cache[ip_address] = True
        logger.info("Banned IP %s: reason=%s permanent=%s duration=%sh", ip_address, reason, permanent, duration_hours)
        return True

    def unban_ip(self, ip_address: str) -> bool:
        if ip_address not in self._banned_ips:
            return False
        del self._banned_ips[ip_address]
        self._ip_ban_cache[ip_address] = False
        logger.info("Unbanned IP %s", ip_address)
        return True

    def get_all_bans(self) -> list:
        return list(self._banned_ips.values())

    def get_security_stats(self) -> dict:
        now = datetime.now(timezone.utc)
        total_bans = len(self._banned_ips)
        active_bans = sum(
            1 for b in self._banned_ips.values()
            if b.get("is_permanent") or (b.get("expires_at") and b["expires_at"] > now)
        )
        total_404s = sum(len(v) for v in self._error_404_tracker.values())
        total_invalid_keys = sum(len(v) for v in self._invalid_api_key_tracker.values())
        return {
            "total_bans": total_bans,
            "active_bans": active_bans,
            "total_404_count": total_404s,
            "invalid_api_key_count": total_invalid_keys,
        }

    def track_404(self, ip_address: str):
        now = time.time()
        if ip_address not in self._error_404_tracker:
            self._error_404_tracker[ip_address] = []
        self._error_404_tracker[ip_address].append(now)
        self._check_auto_ban_404(ip_address)

    def track_invalid_api_key(self, ip_address: str):
        now = time.time()
        if ip_address not in self._invalid_api_key_tracker:
            self._invalid_api_key_tracker[ip_address] = []
        self._invalid_api_key_tracker[ip_address].append(now)
        self._check_auto_ban_api(ip_address)

    def _check_auto_ban_404(self, ip_address: str):
        if not self._auto_ban_enabled:
            return
        timestamps = self._error_404_tracker.get(ip_address, [])
        recent = [t for t in timestamps if time.time() - t < 3600]
        if len(recent) >= self._auto_ban_threshold_404:
            existing = self._banned_ips.get(ip_address)
            if existing and existing.get("ban_count", 0) >= self._repeat_offender_limit:
                self.ban_ip(ip_address, reason=f"Repeat offender (404 threshold)", permanent=True, created_by="auto-ban")
            else:
                self.ban_ip(ip_address, reason=f"Auto-ban: exceeded {self._auto_ban_threshold_404} 404s/hour", duration_hours=self._auto_ban_duration_hours, created_by="auto-ban")

    def _check_auto_ban_api(self, ip_address: str):
        if not self._auto_ban_enabled:
            return
        timestamps = self._invalid_api_key_tracker.get(ip_address, [])
        recent = [t for t in timestamps if time.time() - t < 3600]
        if len(recent) >= self._auto_ban_threshold_api:
            existing = self._banned_ips.get(ip_address)
            if existing and existing.get("ban_count", 0) >= self._repeat_offender_limit:
                self.ban_ip(ip_address, reason=f"Repeat offender (invalid API key)", permanent=True, created_by="auto-ban")
            else:
                self.ban_ip(ip_address, reason=f"Auto-ban: exceeded {self._auto_ban_threshold_api} invalid API keys/hour", duration_hours=self._auto_ban_duration_hours, created_by="auto-ban")

    def get_404_tracker(self, ip_address: Optional[str] = None):
        if ip_address:
            data = self._error_404_tracker.get(ip_address, [])
            return {ip_address: {"count": len(data), "last_seen": data[-1] if data else None}}
        result = {}
        for ip, timestamps in self._error_404_tracker.items():
            result[ip] = {"count": len(timestamps), "last_seen": timestamps[-1] if timestamps else None}
        return result

    def clear_404_tracker(self, ip_address: str):
        self._error_404_tracker.pop(ip_address, None)

    def get_login_attempts(self, limit: int = 50) -> list:
        return list(self._login_attempts)[-limit:]

    def add_login_attempt(self, attempt: dict):
        self._login_attempts.append(attempt)
        if len(self._login_attempts) > 1000:
            self._login_attempts = self._login_attempts[-1000:]

    def ban_host(self, hostname: str, reason: str = "Host-based ban", duration_hours: int = 24):
        try:
            ip_address = socket.gethostbyname(hostname)
        except socket.gaierror:
            logger.warning("Could not resolve hostname: %s", hostname)
            return False
        return self.ban_ip(ip_address, reason=reason, duration_hours=duration_hours, permanent=False, created_by="host-ban")

    def cleanup_expired_bans(self):
        now = datetime.now(timezone.utc)
        expired = [
            ip for ip, ban in self._banned_ips.items()
            if not ban.get("is_permanent") and ban.get("expires_at") and ban["expires_at"] <= now
        ]
        for ip in expired:
            del self._banned_ips[ip]
            self._ip_ban_cache[ip] = False
        if expired:
            logger.info("Cleaned up %d expired bans", len(expired))

    def clear_404_tracker_all(self):
        self._error_404_tracker.clear()


security_service = SecurityService()
