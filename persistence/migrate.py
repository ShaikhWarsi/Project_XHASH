"""Migration configuration for Alembic.

Run: alembic init migrations  (already done — config in alembic.ini)
Run: alembic revision --autogenerate -m "description"
Run: alembic upgrade head
"""

# Database URL: edit .env or set DATABASE_URL env var
#   DATABASE_URL=sqlite+aiosqlite:///trading_engine.db
#   DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/trading_engine

import os

_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{os.path.join(os.path.dirname(os.path.dirname(__file__)), 'trading_engine.db')}",
)


def get_url() -> str:
    return _DATABASE_URL
