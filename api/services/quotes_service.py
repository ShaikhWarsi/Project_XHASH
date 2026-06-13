from __future__ import annotations

import logging
import random
from typing import Any

logger = logging.getLogger(__name__)

SUPPORTED_EXCHANGES = ["NSE", "BSE", "NFO", "BFO", "CDS", "MCX", "NCDEX"]


def _generate_mock_quote(symbol: str, exchange: str) -> dict[str, Any]:
    ltp = round(random.uniform(100, 5000), 2)
    bid = round(ltp - random.uniform(0.05, 2.0), 2)
    ask = round(ltp + random.uniform(0.05, 2.0), 2)
    open_price = round(ltp * random.uniform(0.95, 1.05), 2)
    high = round(max(ltp, open_price) * random.uniform(1.0, 1.06), 2)
    low = round(min(ltp, open_price) * random.uniform(0.94, 1.0), 2)
    prev_close = round(ltp * random.uniform(0.96, 1.04), 2)
    change = round(ltp - prev_close, 2)
    change_percent = round((change / prev_close) * 100, 2) if prev_close else 0.0

    return {
        "symbol": symbol,
        "exchange": exchange,
        "ltp": ltp,
        "last_price": ltp,
        "open": open_price,
        "high": high,
        "low": low,
        "close": ltp,
        "prev_close": prev_close,
        "volume": random.randint(1000, 50000),
        "bid": bid,
        "ask": ask,
        "bid_qty": random.randint(100, 5000),
        "ask_qty": random.randint(100, 5000),
        "change": change,
        "change_percent": change_percent,
        "total_buy_qty": random.randint(50000, 500000),
        "total_sell_qty": random.randint(50000, 500000),
        "lower_circuit": round(prev_close * 0.9, 2),
        "upper_circuit": round(prev_close * 1.1, 2),
        "52_week_high": round(max(high, prev_close) * random.uniform(1.1, 1.5), 2),
        "52_week_low": round(min(low, prev_close) * random.uniform(0.5, 0.9), 2),
    }


def get_quotes(symbol: str, exchange: str = "NSE") -> tuple[bool, dict[str, Any], int]:
    try:
        if not symbol:
            return False, {"status": "error", "message": "symbol is required"}, 400
        if exchange not in SUPPORTED_EXCHANGES:
            return False, {"status": "error", "message": f"Unsupported exchange: {exchange}"}, 400

        quote = _generate_mock_quote(symbol, exchange)
        return True, {"status": "success", "data": quote}, 200
    except Exception as e:
        logger.exception("Error fetching quote: %s", e)
        return False, {"status": "error", "message": str(e)}, 500


def get_multiquotes(symbols: list[dict[str, str]]) -> tuple[bool, dict[str, Any], int]:
    try:
        if not symbols:
            return False, {"status": "error", "message": "symbols list is required"}, 400

        results = []
        errors = []

        for item in symbols:
            symbol = item.get("symbol", "")
            exchange = item.get("exchange", "NSE")
            if not symbol:
                errors.append({"symbol": symbol, "exchange": exchange, "error": "symbol is required"})
                continue
            if exchange not in SUPPORTED_EXCHANGES:
                errors.append({"symbol": symbol, "exchange": exchange, "error": f"Unsupported exchange: {exchange}"})
                continue

            quote = _generate_mock_quote(symbol, exchange)
            results.append(quote)

        return True, {
            "status": "success",
            "results": results,
            "errors": errors if errors else None,
            "total": len(results),
            "failed": len(errors),
        }, 200
    except Exception as e:
        logger.exception("Error fetching multiquotes: %s", e)
        return False, {"status": "error", "message": str(e)}, 500
