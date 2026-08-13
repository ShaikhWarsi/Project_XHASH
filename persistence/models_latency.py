from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

import numpy as np
from cachetools import TTLCache
from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, select, func, case

from .multi_db import LatencyBase

logger = logging.getLogger(__name__)

PERCENTILE_WINDOW_DAYS = 30
_stats_cache = TTLCache(maxsize=1, ttl=60)


class OrderLatency(LatencyBase):
    __tablename__ = "order_latency"

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    order_id = Column(String(100), nullable=False)
    user_id = Column(Integer)
    broker = Column(String(50))
    symbol = Column(String(50))
    order_type = Column(String(40))
    rtt_ms = Column(Float)
    validation_latency_ms = Column(Float)
    response_latency_ms = Column(Float)
    overhead_ms = Column(Float)
    total_latency_ms = Column(Float, nullable=False)
    request_body = Column(JSON)
    response_body = Column(JSON)
    status = Column(String(40))
    error = Column(String(500))
