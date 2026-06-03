"""Add HedgeFundFlowRun table

Revision ID: 2f8c5d9e4b1a
Revises: 1b1feba3d897
Create Date: 2025-01-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f8c5d9e4b1a'
down_revision: Union[str, None] = '1b1feba3d897'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass