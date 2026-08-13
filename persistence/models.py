from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, BigInteger, Boolean, JSON, Index
from sqlalchemy import Text as SA_Text

from .database import Base


class Trade(Base):
    __tablename__ = "trades"
    __table_args__ = (
        Index("ix_trades_symbol_ts", "symbol", "timestamp"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(40), nullable=False, index=True)
    side = Column(String(10), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    commission = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    signal_ids = Column(Text, default="[]")
    strategy = Column(String(50), default="")
    pnl = Column(Float, nullable=True)
    pnl_pct = Column(Float, nullable=True)


class SignalRecord(Base):
    __tablename__ = "signals"
    __table_args__ = (
        Index("ix_signals_symbol_ts", "symbol", "timestamp"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(40), nullable=False, index=True)
    signal_type = Column(String(30), nullable=False)
    direction = Column(Integer, nullable=False)
    strength = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    price = Column(Float, default=0.0)
    level = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    metadata_json = Column(Text, default="{}")


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    cash = Column(Float, default=0.0)
    total_value = Column(Float, default=0.0)
    equity = Column(Float, default=0.0)
    positions_json = Column(Text, default="{}")
    margin_used = Column(Float, default=0.0)


class AgentDecision(Base):
    __tablename__ = "agent_decisions"
    __table_args__ = (
        Index("ix_agent_decisions_agent_ts", "agent", "timestamp"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent = Column(String(50), nullable=False, index=True)
    ticker = Column(String(40), nullable=False)
    signal = Column(String(10), nullable=False)
    confidence = Column(Float, default=0.0)
    reasoning = Column(Text, default="")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    metadata_json = Column(Text, default="{}")


class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
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
    flow_type = Column(String(50), default="hedge_fund")
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class HedgeFundFlowRun(Base):
    """Stores individual hedge fund deliberation runs."""

    __tablename__ = "hedge_fund_flow_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    flow_id = Column(Integer, nullable=False, index=True)
    ticker = Column(String(40), nullable=False)
    consensus = Column(String(10), nullable=False)
    confidence = Column(Float, default=0.0)
    opinions_json = Column(Text, default="[]")
    portfolio_snapshot_id = Column(Integer, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)


class WatchlistItem(Base):
    """Per-user stock watchlist."""

    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=False, index=True)
    symbol = Column(String(40), nullable=False)
    company = Column(String(200), default="")
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PriceAlert(Base):
    """User-configured price alerts."""

    __tablename__ = "price_alerts"
    __table_args__ = (
        Index("ix_price_alerts_user_symbol", "user_id", "symbol"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=False, index=True)
    symbol = Column(String(40), nullable=False)
    target_price = Column(Float, nullable=False)
    condition = Column(String(10), nullable=False)  # ABOVE or BELOW
    active = Column(Integer, default=1)
    triggered = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)


class Order(Base):
    """Persistent order records."""

    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_symbol_ts", "symbol", "created_at"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_created_at", "created_at"),
    )

    id = Column(String(36), primary_key=True)
    symbol = Column(String(40), nullable=False, index=True)
    side = Column(String(40), nullable=False)
    quantity = Column(Float, nullable=False)
    order_type = Column(String(40), nullable=False)
    price = Column(Float, nullable=True)
    stop_price = Column(Float, nullable=True)
    status = Column(String(40), default="SUBMITTED")
    filled_quantity = Column(Float, default=0)
    remaining_quantity = Column(Float, default=0)
    average_fill_price = Column(Float, nullable=True)
    time_in_force = Column(String(10), default="DAY")
    reduce_only = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


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
    status = Column(String(40), nullable=False, default="active")
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AgentJob(Base):
    __tablename__ = "agent_jobs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_id = Column(String(40), nullable=False, unique=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    agent_token_id = Column(Integer, nullable=True)
    kind = Column(String(40), nullable=False)
    status = Column(String(40), nullable=False, default="queued")
    request = Column(SA_Text, nullable=False, default="{}")
    result = Column(SA_Text, nullable=True)
    error = Column(SA_Text, nullable=True)
    progress = Column(SA_Text, nullable=True)
    idempotency_key = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class MarketNewsSnapshot(Base):
    __tablename__ = "market_news_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(50), nullable=False)
    snapshot_key = Column(String(200), nullable=False)
    items_json = Column(Text, nullable=False)
    summary_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class MacroSignalSnapshot(Base):
    __tablename__ = "macro_signal_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_key = Column(String(200), nullable=False)
    verdict = Column(String(50), nullable=False)
    bullish_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    signals_json = Column(Text, nullable=False)
    meta_json = Column(Text, nullable=False)
    source_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class EtfFlowSnapshot(Base):
    __tablename__ = "etf_flow_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_key = Column(String(200), nullable=False)
    summary_json = Column(Text, nullable=False)
    etfs_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class StockAnalysisSnapshot(Base):
    __tablename__ = "stock_analysis_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(40), nullable=False)
    market = Column(String(40), nullable=False)
    analysis_id = Column(String(200), nullable=False)
    current_price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    signal = Column(String(40), nullable=False)
    signal_score = Column(Float, nullable=False)
    trend_status = Column(String(50), nullable=False)
    support_levels_json = Column(Text, nullable=False)
    resistance_levels_json = Column(Text, nullable=False)
    bullish_factors_json = Column(Text, nullable=False)
    risk_factors_json = Column(Text, nullable=False)
    summary_text = Column(Text, nullable=False)
    analysis_json = Column(Text, nullable=False)
    news_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TradingAgentsRun(Base):
    """TradingAgents multi-agent analysis runs."""

    __tablename__ = "tradingagents_runs"
    __table_args__ = (
        Index("ix_tradingagents_runs_status", "status"),
        Index("ix_tradingagents_runs_started_at", "started_at"),
    )

    id = Column(String(36), primary_key=True)
    ticker = Column(String(40), nullable=False, index=True)
    status = Column(String(40), nullable=False, default="queued")
    config_json = Column(Text, default="{}")
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)

    # Pipeline state tracking
    current_stage = Column(String(50), nullable=True)
    current_node = Column(String(100), nullable=True)
    tool_call_count = Column(Integer, default=0)
    elapsed_ms = Column(Integer, nullable=True)
    cancel_requested = Column(Integer, default=0)
    error_detail = Column(Text, nullable=True)


class TradingAgentsEvent(Base):
    """Per-event log for a pipeline run."""

    __tablename__ = "tradingagents_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(36), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    event_data = Column(Text, default="{}")
    node_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TradingAgentsReport(Base):
    """Per-stage report snapshots for a run."""

    __tablename__ = "tradingagents_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(36), nullable=False, index=True)
    stage = Column(String(50), nullable=False)
    payload_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
