from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple

from execution.exchanges.base import BaseRestClient, LiveOrderResult, LiveTradingError

logger = logging.getLogger(__name__)


def normalize_symbol(symbol: str, market_type: str = "swap") -> str:
    if not symbol:
        return symbol
    sym = symbol.strip()
    if ":" in sym:
        sym = sym.split(":", 1)[0]
    sym = sym.upper()
    if "/" in sym:
        return sym

    common_quotes = ["USDT", "USD", "BTC", "ETH", "BUSD", "USDC"]
    for quote in common_quotes:
        if sym.endswith(quote) and len(sym) > len(quote):
            base = sym[: -len(quote)]
            if base:
                return f"{base}/{quote}"
    return f"{sym}/USDT"


def signal_to_sides(signal_type: str) -> Tuple[str, str, bool]:
    sig = (signal_type or "").strip().lower()
    if sig in ("open_long", "add_long"):
        return "buy", "long", False
    if sig in ("open_short", "add_short"):
        return "sell", "short", False
    if sig in ("close_long", "reduce_long"):
        return "sell", "long", True
    if sig in ("close_short", "reduce_short"):
        return "buy", "short", True
    raise LiveTradingError(f"Unsupported signal_type: {signal_type}")


def place_order_from_signal(
    client: BaseRestClient,
    *,
    signal_type: str,
    symbol: str,
    amount: float,
    market_type: str = "swap",
    exchange_config: Optional[Dict[str, Any]] = None,
    client_order_id: Optional[str] = None,
) -> LiveOrderResult:
    if amount is None:
        amount = 0.0
    qty = float(amount or 0.0)
    if qty <= 0:
        raise LiveTradingError("Invalid amount")

    side, pos_side, reduce_only = signal_to_sides(signal_type)
    cfg = exchange_config if isinstance(exchange_config, dict) else {}
    mt = (market_type or cfg.get("market_type") or "swap").strip().lower()
    if mt in ("futures", "future", "perp", "perpetual"):
        mt = "swap"

    if mt == "spot" and ("short" in (signal_type or "").lower()):
        raise LiveTradingError("spot market does not support short signals")

    symbol = normalize_symbol(symbol, market_type=mt)

    return client.place_market_order(
        symbol=symbol,
        side="BUY" if side == "buy" else "SELL",
        quantity=qty,
        reduce_only=reduce_only,
        position_side=pos_side,
        client_order_id=client_order_id,
    )


def quote_amount_from_base_qty(client: BaseRestClient, *, symbol: str, base_qty: float) -> float:
    if float(base_qty or 0.0) <= 0:
        return 0.0
    if not hasattr(client, "get_ticker"):
        return float(base_qty or 0.0)
    try:
        ticker = client.get_ticker(symbol=symbol)
    except Exception as e:
        logger.warning("get_ticker failed for %s: %s", symbol, e)
        return float(base_qty or 0.0)
    if not isinstance(ticker, dict):
        return float(base_qty or 0.0)
    try:
        price = float(ticker.get("last") or ticker.get("lastPr") or ticker.get("lastPrice") or ticker.get("price") or 0.0)
    except Exception as e:
        logger.warning("Failed to parse ticker price for %s: %s", symbol, e)
        price = 0.0
    if price <= 0:
        return float(base_qty or 0.0)
    return float(base_qty or 0.0) * price
