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
    pass


def downgrade() -> None:
    pass
