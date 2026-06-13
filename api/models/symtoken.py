from __future__ import annotations

import logging
from threading import Lock

from cachetools import TTLCache
from sqlalchemy import Column, Integer, String, Float, Index, create_engine
from sqlalchemy.orm import declarative_base, Session

logger = logging.getLogger(__name__)

Base = declarative_base()

_cache = TTLCache(maxsize=1024, ttl=3600)
_cache_lock = Lock()


class SymToken(Base):
    __tablename__ = "symtoken"

    id = Column(Integer, primary_key=True)
    symbol = Column(String, nullable=False, index=True)
    brsymbol = Column(String, nullable=False, index=True)
    name = Column(String)
    exchange = Column(String, index=True)
    brexchange = Column(String, index=True)
    token = Column(String, index=True)
    expiry = Column(String)
    strike = Column(Float)
    lotsize = Column(Integer)
    instrumenttype = Column(String)
    tick_size = Column(Float)
    contract_value = Column(Float)

    __table_args__ = (
        Index("idx_symbol_exchange", "symbol", "exchange"),
        Index("idx_brsymbol_exchange", "brsymbol", "exchange"),
    )


def init_db(engine):
    Base.metadata.create_all(engine)
    logger.info("SymToken table created/verified")


def _make_cache_key(prefix: str, *args) -> str:
    return f"{prefix}:{':'.join(str(a) for a in args)}"


def get_token(session: Session, symbol: str, exchange: str) -> str | None:
    key = _make_cache_key("token", symbol, exchange)
    with _cache_lock:
        cached = _cache.get(key)
        if cached is not None:
            return cached
    row = session.query(SymToken).filter(
        SymToken.symbol == symbol,
        SymToken.exchange == exchange,
    ).first()
    result = row.token if row else None
    with _cache_lock:
        _cache[key] = result
    return result


def get_symbol(session: Session, token: str, exchange: str) -> str | None:
    key = _make_cache_key("symbol", token, exchange)
    with _cache_lock:
        cached = _cache.get(key)
        if cached is not None:
            return cached
    row = session.query(SymToken).filter(
        SymToken.token == token,
        SymToken.exchange == exchange,
    ).first()
    result = row.symbol if row else None
    with _cache_lock:
        _cache[key] = result
    return result


def get_br_symbol(session: Session, symbol: str, exchange: str) -> str | None:
    key = _make_cache_key("brsymbol", symbol, exchange)
    with _cache_lock:
        cached = _cache.get(key)
        if cached is not None:
            return cached
    row = session.query(SymToken).filter(
        SymToken.symbol == symbol,
        SymToken.exchange == exchange,
    ).first()
    result = row.brsymbol if row else None
    with _cache_lock:
        _cache[key] = result
    return result


def get_brexchange(session: Session, symbol: str, exchange: str) -> str | None:
    key = _make_cache_key("brexchange", symbol, exchange)
    with _cache_lock:
        cached = _cache.get(key)
        if cached is not None:
            return cached
    row = session.query(SymToken).filter(
        SymToken.symbol == symbol,
        SymToken.exchange == exchange,
    ).first()
    result = row.brexchange if row else None
    with _cache_lock:
        _cache[key] = result
    return result


def get_symbol_info(session: Session, symbol: str, exchange: str) -> dict | None:
    key = _make_cache_key("info", symbol, exchange)
    with _cache_lock:
        cached = _cache.get(key)
        if cached is not None:
            return cached
    row = session.query(SymToken).filter(
        SymToken.symbol == symbol,
        SymToken.exchange == exchange,
    ).first()
    if not row:
        return None
    result = {
        "id": row.id,
        "symbol": row.symbol,
        "brsymbol": row.brsymbol,
        "name": row.name,
        "exchange": row.exchange,
        "brexchange": row.brexchange,
        "token": row.token,
        "expiry": row.expiry,
        "strike": row.strike,
        "lotsize": row.lotsize,
        "instrumenttype": row.instrumenttype,
        "tick_size": row.tick_size,
        "contract_value": row.contract_value,
    }
    with _cache_lock:
        _cache[key] = result
    return result


def search_symbols(
    session: Session,
    query: str,
    exchange: str | None = None,
    limit: int = 20,
) -> list[dict]:
    q = session.query(SymToken)
    pattern = f"%{query}%"
    q = q.filter(
        SymToken.symbol.ilike(pattern)
        | SymToken.name.ilike(pattern)
        | SymToken.brsymbol.ilike(pattern)
    )
    if exchange:
        q = q.filter(SymToken.exchange == exchange)
    rows = q.limit(limit).all()
    return [
        {
            "id": r.id,
            "symbol": r.symbol,
            "brsymbol": r.brsymbol,
            "name": r.name,
            "exchange": r.exchange,
            "brexchange": r.brexchange,
            "token": r.token,
            "expiry": r.expiry,
            "strike": r.strike,
            "lotsize": r.lotsize,
            "instrumenttype": r.instrumenttype,
            "tick_size": r.tick_size,
            "contract_value": r.contract_value,
        }
        for r in rows
    ]


def get_distinct_exchanges(session: Session) -> list[str]:
    key = "distinct_exchanges"
    with _cache_lock:
        cached = _cache.get(key)
        if cached is not None:
            return cached
    rows = session.query(SymToken.exchange).distinct().order_by(SymToken.exchange).all()
    result = [r[0] for r in rows if r[0]]
    with _cache_lock:
        _cache[key] = result
    return result


def get_symbol_count(session: Session) -> int:
    key = "symbol_count"
    with _cache_lock:
        cached = _cache.get(key)
        if cached is not None:
            return cached
    result = session.query(SymToken).count()
    with _cache_lock:
        _cache[key] = result
    return result
