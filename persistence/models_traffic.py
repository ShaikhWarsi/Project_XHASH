from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta

from cachetools import TTLCache
from sqlalchemy import Boolean, Column, DateTime, Float, Index, Integer, String, Text, select, func

from .multi_db import LogBase

logger = logging.getLogger(__name__)

_ip_ban_cache = TTLCache(maxsize=2048, ttl=60)


class TrafficLog(LogBase):
    __tablename__ = "traffic_logs"

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    client_ip = Column(String(50), nullable=False)
    method = Column(String(10), nullable=False)
    path = Column(String(500), nullable=False)
    status_code = Column(Integer, nullable=False)
    duration_ms = Column(Float, nullable=False)
    host = Column(String(500))
    error = Column(String(500))
    user_id = Column(Integer)

    __table_args__ = (
        Index("idx_traffic_timestamp", "timestamp"),
        Index("idx_traffic_client_ip", "client_ip"),
        Index("idx_traffic_status_code", "status_code"),
        Index("idx_traffic_user_id", "user_id"),
        Index("idx_traffic_ip_timestamp", "client_ip", "timestamp"),
    )


class IPBan(LogBase):
    __tablename__ = "ip_bans"

    id = Column(Integer, primary_key=True)
    ip_address = Column(String(50), unique=True, nullable=False, index=True)
    ban_reason = Column(String(200))
    ban_count = Column(Integer, default=1)
    banned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True))
    is_permanent = Column(Boolean, default=False)
    created_by = Column(String(50), default="system")


class Error404Tracker(LogBase):
    __tablename__ = "error_404_tracker"

    id = Column(Integer, primary_key=True)
    ip_address = Column(String(50), nullable=False, index=True)
    error_count = Column(Integer, default=1)
    first_error_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_error_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    paths_attempted = Column(Text)

    __table_args__ = (
        Index("idx_404_error_count", "error_count"),
        Index("idx_404_first_error_at", "first_error_at"),
    )


class InvalidAPIKeyTracker(LogBase):
    __tablename__ = "invalid_api_key_tracker"

    id = Column(Integer, primary_key=True)
    ip_address = Column(String(50), nullable=False, index=True)
    attempt_count = Column(Integer, default=1)
    first_attempt_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_attempt_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    api_keys_tried = Column(Text)

    __table_args__ = (
        Index("idx_api_tracker_attempt_count", "attempt_count"),
        Index("idx_api_tracker_first_attempt_at", "first_attempt_at"),
    )
