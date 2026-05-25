from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, BigInteger, Boolean, JSON
from sqlalchemy import Text as SA_Text

from .database import Base


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(20), nullable=False, index=True)
    side = Column(String(10), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    commission = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    signal_ids = Column(Text, default="[]")
    strategy = Column(String(50), default="")
    pnl = Column(Float, nullable=True)
    pnl_pct = Column(Float, nullable=True)


class SignalRecord(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(20), nullable=False, index=True)
    signal_type = Column(String(30), nullable=False)
    direction = Column(Integer, nullable=False)
    strength = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    price = Column(Float, default=0.0)
    level = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    metadata_json = Column(Text, default="{}")


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    cash = Column(Float, default=0.0)
    total_value = Column(Float, default=0.0)
    equity = Column(Float, default=0.0)
    positions_json = Column(Text, default="{}")
    margin_used = Column(Float, default=0.0)


class AgentDecision(Base):
    __tablename__ = "agent_decisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent = Column(String(50), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    signal = Column(String(10), nullable=False)
    confidence = Column(Float, default=0.0)
    reasoning = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(Text, default="{}")


class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    config_json = Column(Text, default="{}")
    metrics_json = Column(Text, default="{}")
    equity_curve_json = Column(Text, default="[]")
    total_return = Column(Float, default=0.0)
    sharpe_ratio = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)


class ApiKey(Base):
    """Stores API keys for external data providers."""

    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    provider = Column(String(50), nullable=False, index=True)
    key_value = Column(String(500), nullable=False)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)


class HedgeFundFlow(Base):
    """Stores hedge fund flow configurations."""

    __tablename__ = "hedge_fund_flows"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    tickers = Column(Text, default="[]")
    agents = Column(Text, default="[]")
    config_json = Column(Text, default="{}")
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HedgeFundFlowRun(Base):
    """Stores individual hedge fund deliberation runs."""

    __tablename__ = "hedge_fund_flow_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    flow_id = Column(Integer, nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    consensus = Column(String(10), nullable=False)
    confidence = Column(Float, default=0.0)
    opinions_json = Column(Text, default="[]")
    portfolio_snapshot_id = Column(Integer, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)


class WatchlistItem(Base):
    """Per-user stock watchlist."""

    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    company = Column(String(200), default="")
    added_at = Column(DateTime, default=datetime.utcnow)


class PriceAlert(Base):
    """User-configured price alerts."""

    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    target_price = Column(Float, nullable=False)
    condition = Column(String(10), nullable=False)  # ABOVE or BELOW
    active = Column(Integer, default=1)
    triggered = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class Order(Base):
    """Persistent order records."""

    __tablename__ = "orders"

    id = Column(String(36), primary_key=True)
    symbol = Column(String(20), nullable=False, index=True)
    side = Column(String(20), nullable=False)
    quantity = Column(Float, nullable=False)
    order_type = Column(String(20), nullable=False)
    price = Column(Float, nullable=True)
    stop_price = Column(Float, nullable=True)
    status = Column(String(20), default="SUBMITTED")
    filled_quantity = Column(Float, default=0)
    remaining_quantity = Column(Float, default=0)
    average_fill_price = Column(Float, nullable=True)
    time_in_force = Column(String(10), default="DAY")
    reduce_only = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AgentToken(Base):
    __tablename__ = "agent_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(80), nullable=False)
    token_prefix = Column(String(24), nullable=False)
    token_hash = Column(String(128), nullable=False, unique=True, index=True)
    scopes = Column(String(100), nullable=False, default="R")
    markets = Column(String(500), nullable=False, default="*")
    instruments = Column(String(500), nullable=False, default="*")
    paper_only = Column(Boolean, nullable=False, default=True)
    rate_limit_per_min = Column(Integer, nullable=False, default=60)
    status = Column(String(20), nullable=False, default="active")
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AgentJob(Base):
    __tablename__ = "agent_jobs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_id = Column(String(40), nullable=False, unique=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    agent_token_id = Column(Integer, nullable=True)
    kind = Column(String(40), nullable=False)
    status = Column(String(20), nullable=False, default="queued")
    request = Column(SA_Text, nullable=False, default="{}")
    result = Column(SA_Text, nullable=True)
    error = Column(SA_Text, nullable=True)
    progress = Column(SA_Text, nullable=True)
    idempotency_key = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)


class AgentAudit(Base):
    __tablename__ = "agent_audit"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    agent_token_id = Column(Integer, nullable=True)
    agent_name = Column(String(80), nullable=True)
    route = Column(String(160), nullable=False)
    method = Column(String(8), nullable=False)
    scope_class = Column(String(4), nullable=False)
    status_code = Column(Integer, nullable=False)
    idempotency_key = Column(String(120), nullable=True)
    request_summary = Column(SA_Text, nullable=True)
    response_summary = Column(SA_Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AgentPaperOrder(Base):
    __tablename__ = "agent_paper_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_uid = Column(String(40), nullable=False, unique=True)
    user_id = Column(Integer, nullable=False, index=True)
    agent_token_id = Column(Integer, nullable=True)
    market = Column(String(40), nullable=False)
    symbol = Column(String(60), nullable=False)
    side = Column(String(8), nullable=False)
    order_type = Column(String(16), nullable=False, default="market")
    qty = Column(Float, nullable=False)
    limit_price = Column(Float, nullable=True)
    fill_price = Column(Float, nullable=True)
    fill_value = Column(Float, nullable=True)
    status = Column(String(16), nullable=False, default="filled")
    note = Column(SA_Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
