"""Add flow_type column to hedge_fund_flows

Revision ID: 4c8d9e0f1a3b
Revises: d5e78f9a1b2c
Create Date: 2026-06-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4c8d9e0f1a3b"
down_revision: Union[str, None] = "d5e78f9a1b2c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "hedge_fund_flows",
        sa.Column("flow_type", sa.String(50), nullable=False, server_default="hedge_fund"),
    )


def downgrade() -> None:
    op.drop_column("hedge_fund_flows", "flow_type")
