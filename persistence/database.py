from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

_engine = None
_session_factory = None
_init_lock = asyncio.Lock()
_init_done = False


class Base(DeclarativeBase):
    pass


def get_db_path() -> str:
    default_path = Path.cwd() / "trading_engine.db"
    return f"sqlite+aiosqlite:///{default_path}"


async def init_db(db_url: Optional[str] = None):
    global _engine, _session_factory
    url = db_url or get_db_path()
    _engine = create_async_engine(url, echo=False)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)

    from .models import Base
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"Database initialized: {url}")


async def close_db():
    global _engine, _session_factory, _init_done
    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        _init_done = False


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    global _init_done
    if not _init_done:
        async with _init_lock:
            if not _init_done:
                await init_db()
                _init_done = True
    async with _session_factory() as session:
        yield session
