"""Create all tables matching current ORM models

Revision ID: 0001
Revises: None
Create Date: 2025-05-23
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trades",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("side", sa.String(length=10), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("commission", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("signal_ids", sa.Text(), server_default=sa.text("'[]'"), nullable=True),
        sa.Column("strategy", sa.String(length=50), server_default=sa.text("''"), nullable=True),
        sa.Column("pnl", sa.Float(), nullable=True),
        sa.Column("pnl_pct", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trades_symbol"), "trades", ["symbol"])
    op.create_index(op.f("ix_trades_timestamp"), "trades", ["timestamp"])

    op.create_table(
        "signals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("signal_type", sa.String(length=30), nullable=False),
        sa.Column("direction", sa.Integer(), nullable=False),
        sa.Column("strength", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("confidence", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("price", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("level", sa.Float(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("metadata_json", sa.Text(), server_default=sa.text("'{}'"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_signals_symbol"), "signals", ["symbol"])
    op.create_index(op.f("ix_signals_timestamp"), "signals", ["timestamp"])

    op.create_table(
        "portfolio_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("cash", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("total_value", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("equity", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("positions_json", sa.Text(), server_default=sa.text("'{}'"), nullable=True),
        sa.Column("margin_used", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_portfolio_snapshots_timestamp"), "portfolio_snapshots", ["timestamp"])

    op.create_table(
        "agent_decisions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("agent", sa.String(length=50), nullable=False),
        sa.Column("ticker", sa.String(length=20), nullable=False),
        sa.Column("signal", sa.String(length=10), nullable=False),
        sa.Column("confidence", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("reasoning", sa.Text(), server_default=sa.text("''"), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("metadata_json", sa.Text(), server_default=sa.text("'{}'"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agent_decisions_agent"), "agent_decisions", ["agent"])

    op.create_table(
        "backtest_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("config_json", sa.Text(), server_default=sa.text("'{}'"), nullable=True),
        sa.Column("metrics_json", sa.Text(), server_default=sa.text("'{}'"), nullable=True),
        sa.Column("equity_curve_json", sa.Text(), server_default=sa.text("'[]'"), nullable=True),
        sa.Column("total_return", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("sharpe_ratio", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("max_drawdown", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "api_keys",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("key_value", sa.String(length=500), nullable=False),
        sa.Column("is_active", sa.Integer(), server_default=sa.text("1"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_api_keys_provider"), "api_keys", ["provider"])

    op.create_table(
        "hedge_fund_flows",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), server_default=sa.text("''"), nullable=True),
        sa.Column("tickers", sa.Text(), server_default=sa.text("'[]'"), nullable=True),
        sa.Column("agents", sa.Text(), server_default=sa.text("'[]'"), nullable=True),
        sa.Column("config_json", sa.Text(), server_default=sa.text("'{}'"), nullable=True),
        sa.Column("is_active", sa.Integer(), server_default=sa.text("1"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "hedge_fund_flow_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("flow_id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=20), nullable=False),
        sa.Column("consensus", sa.String(length=10), nullable=False),
        sa.Column("confidence", sa.Float(), server_default=sa.text("0.0"), nullable=True),
        sa.Column("opinions_json", sa.Text(), server_default=sa.text("'[]'"), nullable=True),
        sa.Column("portfolio_snapshot_id", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_hedge_fund_flow_runs_flow_id"), "hedge_fund_flow_runs", ["flow_id"])

    op.create_table(
        "watchlist",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=50), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("company", sa.String(length=200), server_default=sa.text("''"), nullable=True),
        sa.Column("added_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_watchlist_user_id"), "watchlist", ["user_id"])

    op.create_table(
        "price_alerts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=50), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("target_price", sa.Float(), nullable=False),
        sa.Column("condition", sa.String(length=10), nullable=False),
        sa.Column("active", sa.Integer(), server_default=sa.text("1"), nullable=True),
        sa.Column("triggered", sa.Integer(), server_default=sa.text("0"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_price_alerts_user_id"), "price_alerts", ["user_id"])
    op.create_index(op.f("ix_price_alerts_symbol"), "price_alerts", ["symbol"])


def downgrade() -> None:
    op.drop_table("price_alerts")
    op.drop_table("watchlist")
    op.drop_table("hedge_fund_flow_runs")
    op.drop_table("hedge_fund_flows")
    op.drop_table("api_keys")
    op.drop_table("backtest_runs")
    op.drop_table("agent_decisions")
    op.drop_table("portfolio_snapshots")
    op.drop_table("signals")
    op.drop_table("trades")
