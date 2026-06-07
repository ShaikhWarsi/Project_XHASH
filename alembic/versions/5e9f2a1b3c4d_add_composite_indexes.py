"""add composite indexes for hot query patterns

Revision ID: 5e9f2a1b3c4d
Revises: 4c8d9e0f1a3b
Create Date: 2026-06-03

Adds composite (symbol, timestamp) indexes for the most queried
time-series patterns: trades, signals, orders, agent_decisions,
and price_alerts. These replace standalone single-column indexes
on those columns.

SQLite note: BRIN indexes are only supported on PostgreSQL.
If migrating to PostgreSQL, add BRIN indexes:

    CREATE INDEX ix_trades_symbol_ts_brin ON trades USING brin (timestamp);
    CREATE INDEX ix_signals_symbol_ts_brin ON signals USING brin (timestamp);
    CREATE INDEX ix_orders_symbol_ts_brin ON orders USING brin (created_at);
"""

from __future__ import annotations
from alembic import op
import sqlalchemy as sa


revision = "5e9f2a1b3c4d"
down_revision = "4c8d9e0f1a3b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index("ix_trades_symbol_ts", "trades", ["symbol", "timestamp"])
    op.create_index("ix_signals_symbol_ts", "signals", ["symbol", "timestamp"])
    op.create_index("ix_orders_symbol_ts", "orders", ["symbol", "created_at"])
    op.create_index("ix_price_alerts_user_symbol", "price_alerts", ["user_id", "symbol"])
    op.create_index("ix_agent_decisions_agent_ts", "agent_decisions", ["agent", "timestamp"])

    # Drop redundant single-column indexes now covered by composites
    op.drop_index("ix_trades_symbol", table_name="trades", if_exists=True)
    op.drop_index("ix_signals_symbol", table_name="signals", if_exists=True)
    op.drop_index("ix_orders_symbol", table_name="orders", if_exists=True)


def downgrade():
    op.create_index("ix_trades_symbol", "trades", ["symbol"])
    op.create_index("ix_signals_symbol", "signals", ["symbol"])
    op.create_index("ix_orders_symbol", "orders", ["symbol"])
    op.drop_index("ix_trades_symbol_ts", table_name="trades")
    op.drop_index("ix_signals_symbol_ts", table_name="signals")
    op.drop_index("ix_orders_symbol_ts", table_name="orders")
    op.drop_index("ix_price_alerts_user_symbol", table_name="price_alerts")
    op.drop_index("ix_agent_decisions_agent_ts", table_name="agent_decisions")
