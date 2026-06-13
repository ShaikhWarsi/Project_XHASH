from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DECIMAL, Boolean, Column, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from .multi_db import SandboxBase


class SandboxOrders(SandboxBase):
    __tablename__ = "sandbox_orders"
    __table_args__ = (
        Index("idx_user_status", "user_id", "order_status"),
        Index("idx_symbol_exchange", "symbol", "exchange"),
        CheckConstraint("order_status IN ('open', 'complete', 'cancelled', 'rejected')", name="check_order_status"),
        CheckConstraint("action IN ('BUY', 'SELL')", name="check_action"),
        CheckConstraint("price_type IN ('MARKET', 'LIMIT', 'SL', 'SL-M')", name="check_price_type"),
        CheckConstraint("product IN ('CNC', 'NRML', 'MIS')", name="check_product"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    orderid = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    strategy = Column(String(100), nullable=True)
    symbol = Column(String(50), nullable=False, index=True)
    exchange = Column(String(20), nullable=False, index=True)
    action = Column(String(10), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(DECIMAL(10, 2), nullable=True)
    trigger_price = Column(DECIMAL(10, 2), nullable=True)
    price_type = Column(String(20), nullable=False)
    product = Column(String(20), nullable=False)
    order_status = Column(String(20), nullable=False, default="open", index=True)
    average_price = Column(DECIMAL(10, 2), nullable=True)
    filled_quantity = Column(Integer, default=0)
    pending_quantity = Column(Integer, nullable=False)
    rejection_reason = Column(Text, nullable=True)
    margin_blocked = Column(DECIMAL(10, 2), nullable=True, default=0.00)
    order_timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    update_timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class SandboxTrades(SandboxBase):
    __tablename__ = "sandbox_trades"
    __table_args__ = (
        Index("idx_user_symbol", "user_id", "symbol"),
        Index("idx_orderid", "orderid"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    tradeid = Column(String(50), unique=True, nullable=False, index=True)
    orderid = Column(String(50), nullable=False, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    exchange = Column(String(20), nullable=False, index=True)
    action = Column(String(10), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    product = Column(String(20), nullable=False)
    strategy = Column(String(100), nullable=True)
    trade_timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class SandboxPositions(SandboxBase):
    __tablename__ = "sandbox_positions"
    __table_args__ = (
        UniqueConstraint("user_id", "symbol", "exchange", "product", name="unique_position"),
        Index("idx_user_product", "user_id", "product"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    exchange = Column(String(20), nullable=False, index=True)
    product = Column(String(20), nullable=False)
    quantity = Column(Integer, nullable=False)
    average_price = Column(DECIMAL(10, 2), nullable=False)
    ltp = Column(DECIMAL(10, 2), nullable=True)
    pnl = Column(DECIMAL(10, 2), default=0.00)
    pnl_percent = Column(DECIMAL(10, 4), default=0.00)
    accumulated_realized_pnl = Column(DECIMAL(10, 2), default=0.00)
    today_realized_pnl = Column(DECIMAL(10, 2), default=0.00)
    margin_blocked = Column(DECIMAL(15, 2), default=0.00)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class SandboxHoldings(SandboxBase):
    __tablename__ = "sandbox_holdings"
    __table_args__ = (UniqueConstraint("user_id", "symbol", "exchange", name="unique_holding"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    exchange = Column(String(20), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    average_price = Column(DECIMAL(10, 2), nullable=False)
    ltp = Column(DECIMAL(10, 2), nullable=True)
    pnl = Column(DECIMAL(10, 2), default=0.00)
    pnl_percent = Column(DECIMAL(10, 4), default=0.00)
    settlement_date = Column(Date, nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class SandboxFunds(SandboxBase):
    __tablename__ = "sandbox_funds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), unique=True, nullable=False, index=True)
    total_capital = Column(DECIMAL(15, 2), default=10000000.00)
    available_balance = Column(DECIMAL(15, 2), default=10000000.00)
    used_margin = Column(DECIMAL(15, 2), default=0.00)
    realized_pnl = Column(DECIMAL(15, 2), default=0.00)
    today_realized_pnl = Column(DECIMAL(15, 2), default=0.00)
    unrealized_pnl = Column(DECIMAL(15, 2), default=0.00)
    total_pnl = Column(DECIMAL(15, 2), default=0.00)
    last_reset_date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    reset_count = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class SandboxDailyPnL(SandboxBase):
    __tablename__ = "sandbox_daily_pnl"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="unique_user_daily_pnl"),
        Index("idx_user_date", "user_id", "date"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    realized_pnl = Column(DECIMAL(15, 2), default=0.00)
    positions_unrealized_pnl = Column(DECIMAL(15, 2), default=0.00)
    holdings_unrealized_pnl = Column(DECIMAL(15, 2), default=0.00)
    total_mtm = Column(DECIMAL(15, 2), default=0.00)
    available_balance = Column(DECIMAL(15, 2), default=0.00)
    used_margin = Column(DECIMAL(15, 2), default=0.00)
    portfolio_value = Column(DECIMAL(15, 2), default=0.00)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class SandboxConfig(SandboxBase):
    __tablename__ = "sandbox_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    config_key = Column(String(100), unique=True, nullable=False, index=True)
    config_value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
