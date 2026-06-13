from __future__ import annotations

import json
import logging
import re

logger = logging.getLogger(__name__)

_freeze_qty: dict[str, int] = {}

_DEFAULT_CRYPTO_SPOT = 1000


def _key(symbol: str, exchange: str) -> str:
    return f"{exchange.upper()}:{symbol.upper()}"


def load_from_json(path: str) -> int:
    global _freeze_qty
    try:
        with open(path, "r") as f:
            data = json.load(f)
    except Exception as e:
        logger.error("Failed to load freeze qty from %s: %s", path, e)
        return 0
    count = 0
    for entry in data if isinstance(data, list) else data.get("freeze_qty", []):
        symbol = entry.get("symbol", "")
        exchange = entry.get("exchange", "")
        qty = int(entry.get("qty", _DEFAULT_CRYPTO_SPOT))
        _freeze_qty[_key(symbol, exchange)] = qty
        count += 1
    logger.info("Loaded %d freeze qty entries from %s", count, path)
    return count


def get_freeze_qty(symbol: str, exchange: str) -> int:
    return _freeze_qty.get(_key(symbol, exchange), _DEFAULT_CRYPTO_SPOT)


_OPTION_SYMBOL_RE = re.compile(
    r"^([A-Z0-9]+)\s*\d{2}[A-Z]{3}\d{2,4}[CP]\d+(?:\.\d+)?$", re.IGNORECASE
)


def get_freeze_qty_for_option(option_symbol: str, exchange: str) -> int:
    match = _OPTION_SYMBOL_RE.match(option_symbol.upper())
    if match:
        underlying = match.group(1)
        return get_freeze_qty(underlying, exchange)
    return get_freeze_qty(option_symbol, exchange)


def set_freeze_qty(symbol: str, exchange: str, qty: int):
    _freeze_qty[_key(symbol, exchange)] = qty
    logger.info("Freeze qty set: %s for %s:%s", qty, exchange, symbol)


def get_all(exchange: str | None = None) -> dict[str, int]:
    if exchange:
        prefix = exchange.upper() + ":"
        return {
            k.split(":", 1)[1]: v
            for k, v in _freeze_qty.items()
            if k.startswith(prefix)
        }
    return {
        k.split(":", 1)[1] if ":" in k else k: v
        for k, v in _freeze_qty.items()
    }
