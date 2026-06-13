from __future__ import annotations

import os
import logging
from pathlib import Path
from typing import AsyncGenerator, Optional

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, scoped_session, sessionmaker
from sqlalchemy.pool import NullPool

logger = logging.getLogger(__name__)

DB_DIR = Path.cwd() / "db"
DB_DIR.mkdir(exist_ok=True)


class LatencyBase(DeclarativeBase):
    pass


class LogBase(DeclarativeBase):
    pass


class HealthBase(DeclarativeBase):
    pass


class SandboxBase(DeclarativeBase):
    pass


class AuthBase(DeclarativeBase):
    pass


class OpenAlgoBase(DeclarativeBase):
    pass


class MultiDB:
    def __init__(self):
        self._engines = {}
        self._factories = {}
        self._initialized = {}

    def _get_db_path(self, name: str) -> str:
        return f"sqlite+aiosqlite:///{DB_DIR / name}"

    def _get_url(self, env_var: str, default_name: str) -> str:
        return os.getenv(env_var, self._get_db_path(default_name))

    async def init_db(self, name: str, base: DeclarativeBase, url: str):
        if name in self._initialized and self._initialized[name]:
            return
        pool_kwargs = {"poolclass": NullPool} if url.startswith("sqlite") else {}
        engine = create_async_engine(url, echo=False, **pool_kwargs)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(base.metadata.create_all)
        self._engines[name] = engine
        self._factories[name] = factory
        self._initialized[name] = True
        logger.info(f"Database '{name}' initialized: {url}")

    async def init_all(self):
        configs = [
            ("latency", LatencyBase, self._get_url("LATENCY_DATABASE_URL", "latency.db")),
            ("logs", LogBase, self._get_url("LOGS_DATABASE_URL", "logs.db")),
            ("health", HealthBase, self._get_url("HEALTH_DATABASE_URL", "health.db")),
            ("sandbox", SandboxBase, self._get_url("SANDBOX_DATABASE_URL", "sandbox.db")),
            ("openalgo_auth", AuthBase, self._get_url("OPENALGO_AUTH_DATABASE_URL", "openalgo_auth.db")),
        ]
        for name, base, url in configs:
            await self.init_db(name, base, url)

    async def close_all(self):
        for name, engine in self._engines.items():
            await engine.dispose()
            logger.info(f"Database '{name}' closed")
        self._engines.clear()
        self._factories.clear()
        self._initialized.clear()

    def get_factory(self, name: str) -> async_sessionmaker[AsyncSession]:
        factory = self._factories.get(name)
        if factory is None:
            raise RuntimeError(f"Database '{name}' not initialized")
        return factory

    async def get_session(self, name: str) -> AsyncGenerator[AsyncSession, None]:
        factory = self.get_factory(name)
        async with factory() as session:
            yield session


multi_db = MultiDB()


async def get_latency_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in multi_db.get_session("latency"):
        yield session


async def get_logs_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in multi_db.get_session("logs"):
        yield session


async def get_health_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in multi_db.get_session("health"):
        yield session


async def get_sandbox_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in multi_db.get_session("sandbox"):
        yield session


async def get_auth_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in multi_db.get_session("openalgo_auth"):
        yield session


# ── Sync sessions (for routes that use sync ORM) ──

_logs_sync_engine = create_engine(
    f"sqlite:///{DB_DIR / 'logs.db'}", poolclass=NullPool, echo=False,
)
LogsSession = scoped_session(sessionmaker(bind=_logs_sync_engine))
LogBase.metadata.create_all(_logs_sync_engine)

_auth_sync_engine = create_engine(
    f"sqlite:///{DB_DIR / 'openalgo_auth.db'}", poolclass=NullPool, echo=False,
)
AuthSession = scoped_session(sessionmaker(bind=_auth_sync_engine))
AuthBase.metadata.create_all(_auth_sync_engine)
