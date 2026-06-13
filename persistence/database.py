from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator, Optional

from alembic.config import Config
from alembic.command import upgrade, stamp
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

logger = logging.getLogger(__name__)


async def _run_alembic_upgrade_async(sync_url: str):
    try:
        await asyncio.wait_for(
            asyncio.to_thread(_run_alembic_upgrade, sync_url),
            timeout=30,
        )
    except asyncio.TimeoutError:
        logger.warning("Alembic upgrade timed out after 30s")
    except Exception as e:
        logger.warning("Alembic upgrade failed: %s", e)

_engine = None
_session_factory = None
_init_lock = asyncio.Lock()
_init_done = False


class Base(DeclarativeBase):
    pass


def get_db_path() -> str:
    default_path = Path.cwd() / "trading_engine.db"
    return f"sqlite+aiosqlite:///{default_path}"


def _run_alembic_upgrade(db_url: str):
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url.replace("+aiosqlite", ""))
    upgrade(alembic_cfg, "head")
    try:
        stamp(alembic_cfg, "head")
    except Exception:
        logger.exception("alembic stamp(head) failed")


def _migrate_existing_tables(conn):
    """Add missing columns to tables that were already created before a schema update."""
    import sqlalchemy as sa
    from sqlalchemy import inspect
    try:
        inspector = inspect(conn)
        columns = {c["name"] for c in inspector.get_columns("tradingagents_runs")}
    except Exception:
        return  # table doesn't exist yet, nothing to migrate
    sqlite_types = {
        "current_stage": "VARCHAR(50)",
        "current_node": "VARCHAR(100)",
        "tool_call_count": "INTEGER DEFAULT 0",
        "elapsed_ms": "INTEGER",
        "cancel_requested": "INTEGER DEFAULT 0",
        "error_detail": "TEXT",
    }
    for name, col_type in sqlite_types.items():
        if name not in columns:
            conn.execute(sa.text(f"ALTER TABLE tradingagents_runs ADD COLUMN {name} {col_type}"))
            logger.info("Added missing column tradingagents_runs.%s", name)


async def init_db(db_url: Optional[str] = None):
    global _engine, _session_factory, _init_done
    url = db_url or get_db_path()
    engine_kwargs: dict = {"echo": False}
    if url.startswith("sqlite"):
        engine_kwargs["poolclass"] = NullPool
    else:
        engine_kwargs["pool_size"] = 5
        engine_kwargs["max_overflow"] = 10
    _engine = create_async_engine(url, **engine_kwargs)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)

    from .models import Base
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_existing_tables)
    _init_done = True
    logger.info(f"Database initialized: {url}")
    asyncio.create_task(_run_alembic_upgrade_async(url.replace("+aiosqlite", "")))


async def close_db():
    global _engine, _session_factory, _init_done
    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        _init_done = False


def get_engine():
    return _engine


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    global _init_done
    if not _init_done:
        async with _init_lock:
            if not _init_done:
                await init_db()
                _init_done = True
    async with _session_factory() as session:
        yield session
