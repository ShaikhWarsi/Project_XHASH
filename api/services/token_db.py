from __future__ import annotations

import logging
import time
from typing import Any

from sqlalchemy.orm import Session

from api.models.symtoken import (
    SymToken,
    get_token as _get_token,
    get_symbol as _get_symbol,
    get_br_symbol as _get_br_symbol,
    get_brexchange as _get_brexchange,
    get_symbol_info as _get_symbol_info,
    search_symbols as _search_symbols,
    get_distinct_exchanges as _get_distinct_exchanges,
    get_symbol_count as _get_symbol_count,
)

logger = logging.getLogger(__name__)


class TokenCache:
    def __init__(self, maxsize: int = 5000, ttl: int = 3600):
        self._maxsize = maxsize
        self._ttl = ttl
        self._cache: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        entry = self._cache.get(key)
        if entry is None:
            return None
        ts, value = entry
        if time.monotonic() - ts > self._ttl:
            del self._cache[key]
            return None
        return value

    def set(self, key: str, value: Any):
        if len(self._cache) >= self._maxsize:
            try:
                oldest = next(iter(self._cache))
                del self._cache[oldest]
            except StopIteration:
                pass
        self._cache[key] = (time.monotonic(), value)

    def clear(self):
        self._cache.clear()

    def stats(self) -> dict:
        now = time.monotonic()
        valid = sum(1 for v in self._cache.values() if now - v[0] <= self._ttl)
        expired = len(self._cache) - valid
        return {
            "size": len(self._cache),
            "maxsize": self._maxsize,
            "ttl": self._ttl,
            "valid": valid,
            "expired": expired,
        }


token_cache = TokenCache(maxsize=5000, ttl=3600)


def _cache_key(prefix: str, *args) -> str:
    return f"{prefix}:{':'.join(str(a) for a in args)}"


def get_token(session: Session, symbol: str, exchange: str) -> str | None:
    key = _cache_key("token", symbol, exchange)
    cached = token_cache.get(key)
    if cached is not None:
        return cached
    result = _get_token(session, symbol, exchange)
    token_cache.set(key, result)
    return result


def get_symbol(session: Session, token: str, exchange: str) -> str | None:
    key = _cache_key("symbol", token, exchange)
    cached = token_cache.get(key)
    if cached is not None:
        return cached
    result = _get_symbol(session, token, exchange)
    token_cache.set(key, result)
    return result


def get_br_symbol(session: Session, symbol: str, exchange: str) -> str | None:
    key = _cache_key("brsymbol", symbol, exchange)
    cached = token_cache.get(key)
    if cached is not None:
        return cached
    result = _get_br_symbol(session, symbol, exchange)
    token_cache.set(key, result)
    return result


def get_brexchange(session: Session, symbol: str, exchange: str) -> str | None:
    key = _cache_key("brexchange", symbol, exchange)
    cached = token_cache.get(key)
    if cached is not None:
        return cached
    result = _get_brexchange(session, symbol, exchange)
    token_cache.set(key, result)
    return result


def get_symbol_info(session: Session, symbol: str, exchange: str) -> dict | None:
    key = _cache_key("info", symbol, exchange)
    cached = token_cache.get(key)
    if cached is not None:
        return cached
    result = _get_symbol_info(session, symbol, exchange)
    if result:
        token_cache.set(key, result)
    return result


def search_symbols(
    session: Session,
    query: str,
    exchange: str | None = None,
    limit: int = 20,
) -> list[dict]:
    results = _search_symbols(session, query, exchange, limit)
    scored = []
    q_lower = query.lower().strip()
    for r in results:
        score = 0
        sym_lower = r["symbol"].lower()
        name_lower = (r.get("name") or "").lower()
        br_lower = r["brsymbol"].lower()
        if sym_lower == q_lower:
            score += 100
        elif br_lower == q_lower:
            score += 90
        elif sym_lower.startswith(q_lower):
            score += 80
        elif br_lower.startswith(q_lower):
            score += 70
        elif q_lower in sym_lower:
            score += 50
        elif q_lower in br_lower:
            score += 40
        if name_lower and q_lower in name_lower:
            score += 30
        if name_lower and name_lower.startswith(q_lower):
            score += 20
        scored.append((score, r))
    scored.sort(key=lambda x: -x[0])
    return [r for _, r in scored]


def get_distinct_exchanges(session: Session) -> list[str]:
    key = "distinct_exchanges"
    cached = token_cache.get(key)
    if cached is not None:
        return cached
    result = _get_distinct_exchanges(session)
    token_cache.set(key, result)
    return result


def get_symbol_count(session: Session) -> int:
    key = "symbol_count"
    cached = token_cache.get(key)
    if cached is not None:
        return cached
    result = _get_symbol_count(session)
    token_cache.set(key, result)
    return result


def load_cache_for_broker(session: Session, broker: str, symbols_data: list[dict]):
    loaded = 0
    for item in symbols_data:
        symbol = item.get("symbol")
        exchange = item.get("exchange", broker)
        if symbol:
            key = _cache_key("token", symbol, exchange)
            token_cache.set(key, item.get("token"))
            key2 = _cache_key("brsymbol", symbol, exchange)
            token_cache.set(key2, item.get("brsymbol"))
            key3 = _cache_key("info", symbol, exchange)
            token_cache.set(key3, item)
            loaded += 1
    logger.info("TokenCache: pre-loaded %d symbols for broker %s", loaded, broker)


def get_tokens_bulk(session: Session, symbols: list[str]) -> dict[str, str | None]:
    result = {}
    remaining = []
    for sym in symbols:
        ex = sym.split(":")
        key = _cache_key("token", ex[0], ex[1] if len(ex) > 1 else "")
        cached = token_cache.get(key)
        if cached is not None:
            result[sym] = cached
        else:
            remaining.append(ex)
    if remaining:
        for parts in remaining:
            symbol = parts[0]
            exchange = parts[1] if len(parts) > 1 else ""
            token = _get_token(session, symbol, exchange)
            k = _cache_key("token", symbol, exchange)
            token_cache.set(k, token)
            result[f"{symbol}:{exchange}"] = token
    return result


def get_symbols_bulk(session: Session, tokens: list[str]) -> dict[str, str | None]:
    result = {}
    remaining = []
    for tok in tokens:
        ex = tok.split(":")
        key = _cache_key("symbol", ex[0], ex[1] if len(ex) > 1 else "")
        cached = token_cache.get(key)
        if cached is not None:
            result[tok] = cached
        else:
            remaining.append(ex)
    if remaining:
        for parts in remaining:
            token_val = parts[0]
            exchange = parts[1] if len(parts) > 1 else ""
            symbol = _get_symbol(session, token_val, exchange)
            k = _cache_key("symbol", token_val, exchange)
            token_cache.set(k, symbol)
            result[f"{token_val}:{exchange}"] = symbol
    return result


def clear_cache():
    token_cache.clear()
    logger.info("TokenCache cleared")


def get_cache_stats() -> dict:
    return token_cache.stats()
