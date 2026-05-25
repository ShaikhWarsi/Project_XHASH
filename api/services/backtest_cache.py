from __future__ import annotations

import hashlib
import json
import os
import logging
from typing import Any
from pathlib import Path

logger = logging.getLogger(__name__)

CACHE_DIR = os.environ.get("BACKTEST_CACHE_DIR", str(Path.home() / ".trading-engine" / "backtest_cache"))


def _cache_key(strategy_name: str, params: dict, symbol: str, start: str, end: str) -> str:
    raw = json.dumps({
        "strategy": strategy_name,
        "params": {k: v for k, v in sorted(params.items())},
        "symbol": symbol,
        "start": start,
        "end": end,
    }, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


def _cache_path(key: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    return os.path.join(CACHE_DIR, f"{key}.json")


def get_cached(strategy_name: str, params: dict, symbol: str, start: str, end: str) -> dict | None:
    key = _cache_key(strategy_name, params, symbol, start, end)
    path = _cache_path(key)
    if not os.path.isfile(path):
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        logger.warning("Cache read error: %s", e)
        return None


def set_cache(strategy_name: str, params: dict, symbol: str, start: str, end: str, result: dict) -> str:
    key = _cache_key(strategy_name, params, symbol, start, end)
    path = _cache_path(key)
    payload = {
        "key": key,
        "strategy": strategy_name,
        "params": params,
        "symbol": symbol,
        "start": start,
        "end": end,
        "result": result,
    }
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(payload, f, indent=2, default=str)
    os.replace(tmp, path)
    return key


def invalidate(strategy_name: str | None = None, symbol: str | None = None) -> int:
    if not os.path.isdir(CACHE_DIR):
        return 0
    count = 0
    for name in os.listdir(CACHE_DIR):
        if not name.endswith(".json"):
            continue
        path = os.path.join(CACHE_DIR, name)
        try:
            with open(path) as f:
                data = json.load(f)
            if strategy_name and data.get("strategy") != strategy_name:
                continue
            if symbol and data.get("symbol") != symbol:
                continue
            os.remove(path)
            count += 1
        except Exception as e:
            logger.warning("Failed to remove backtest cache %s: %s", path.name if hasattr(path, 'name') else path, e)
            continue
    return count


def stats() -> dict:
    if not os.path.isdir(CACHE_DIR):
        return {"count": 0, "size_bytes": 0}
    total_size = 0
    count = 0
    for name in os.listdir(CACHE_DIR):
        if name.endswith(".json"):
            path = os.path.join(CACHE_DIR, name)
            try:
                total_size += os.path.getsize(path)
                count += 1
            except Exception as e:
                logger.debug("Failed to stat cache file: %s", e)
                continue
    return {"count": count, "size_bytes": total_size, "size_mb": round(total_size / 1024 / 1024, 2)}
