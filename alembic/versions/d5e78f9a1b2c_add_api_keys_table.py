"""Add api_keys table

Revision ID: d5e78f9a1b2c
Revises: 3f9a6b7c8d2e
Create Date: 2025-01-15 10:00:00
"""
from __future__ import annotations

from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e78f9a1b2c"
down_revision: Union[str, None] = "3f9a6b7c8d2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "api_keys",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("key_value", sa.String(length=500), nullable=False),
        sa.Column("is_active", sa.Integer(), server_default=sa.text("1"), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_api_keys_provider"), "api_keys", ["provider"])


def downgrade() -> None:
    op.drop_index(op.f("ix_api_keys_provider"), table_name="api_keys")
    op.drop_table("api_keys")
