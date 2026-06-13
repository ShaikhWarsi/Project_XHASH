from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, Integer, String

from .multi_db import HealthBase


class HealthMetric(HealthBase):
    __tablename__ = "health_metrics"

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    fd_count = Column(Integer)
    fd_limit = Column(Integer)
    fd_usage_percent = Column(Float)
    fd_available = Column(Integer)
    fd_status = Column(String(20))
    memory_rss_mb = Column(Float)
    memory_vms_mb = Column(Float)
    memory_percent = Column(Float)
    memory_available_mb = Column(Float)
    memory_swap_mb = Column(Float)
    memory_status = Column(String(20))
    db_connections_total = Column(Integer)
    db_connections = Column(JSON)
    db_status = Column(String(20))
    ws_connections_total = Column(Integer)
    ws_connections = Column(JSON)
    ws_total_symbols = Column(Integer)
    ws_status = Column(String(20))
    thread_count = Column(Integer)
    stuck_threads = Column(Integer)
    thread_details = Column(JSON)
    thread_status = Column(String(20))
    process_details = Column(JSON)
    overall_status = Column(String(20))


class HealthAlert(HealthBase):
    __tablename__ = "health_alerts"

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    alert_type = Column(String(50))
    severity = Column(String(20))
    metric_name = Column(String(50))
    metric_value = Column(Float)
    threshold_value = Column(Float)
    message = Column(String(500))
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime(timezone=True))
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True))
