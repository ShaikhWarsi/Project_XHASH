from __future__ import annotations

import logging
import math
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

logger = logging.getLogger(__name__)


def amount_to_precision(amount: float, precision: Optional[int] = None, step_size: Optional[float] = None) -> float:
    """Round amount to exchange precision.

    Either ``precision`` (number of decimal places) or ``step_size``
    (market-specific lot size, e.g. 0.001) must be provided.

    Uses banker's rounding (ROUND_HALF_UP) to match exchange behavior.
    """
    if step_size is not None and step_size > 0:
        precision = max(0, -int(math.floor(math.log10(step_size))))
    if precision is not None:
        d = Decimal(str(amount))
        return float(d.quantize(Decimal(10) ** -precision, rounding=ROUND_HALF_UP))
    return amount


def price_to_precision(price: float, precision: Optional[int] = None, tick_size: Optional[float] = None) -> float:
    """Round price to exchange precision.

    Either ``precision`` (number of decimal places) or ``tick_size``
    (minimum price increment) must be provided.
    """
    if tick_size is not None and tick_size > 0:
        precision = max(0, -int(math.floor(math.log10(tick_size))))
    if precision is not None:
        d = Decimal(str(price))
        return float(d.quantize(Decimal(10) ** -precision, rounding=ROUND_HALF_UP))
    return price


def amount_to_contract_precision(amount: float, contract_size: float = 1.0) -> float:
    """Round amount to nearest whole contract.

    Some exchanges require orders in whole contract multiples.
    """
    contracts = round(amount / contract_size)
    return contracts * contract_size


def get_precision_from_exchange(market: dict) -> tuple[int, int]:
    """Extract amount and price precision from a CCXT market dict.

    Returns (amount_precision, price_precision).
    Falls back to counting decimal places in step_size / tick_size.
    """
    amount_precision = market.get("precision", {}).get("amount")
    price_precision = market.get("precision", {}).get("price")

    if amount_precision is None:
        step = market.get("limits", {}).get("amount", {}).get("min", 0)
        if step and step > 0:
            amount_precision = max(0, -int(math.floor(math.log10(step))))

    if price_precision is None:
        tick = market.get("limits", {}).get("price", {}).get("min", 0)
        if tick and tick > 0:
            price_precision = max(0, -int(math.floor(math.log10(tick))))

    return (amount_precision or 8, price_precision or 8)


def validate_order_amount(amount: float, market: dict) -> bool:
    """Check amount meets exchange minimum and step size.

    Returns True if valid, False otherwise.
    """
    min_amount = market.get("limits", {}).get("amount", {}).get("min", 0)
    max_amount = market.get("limits", {}).get("amount", {}).get("max", float("inf"))
    step = market.get("precision", {}).get("amount", 0)

    if amount < min_amount:
        logger.warning(f"Amount {amount} below minimum {min_amount}")
        return False
    if amount > max_amount:
        logger.warning(f"Amount {amount} above maximum {max_amount}")
        return False
    if step and step > 0 and not math.isclose(amount % step, 0, rel_tol=1e-9):
        logger.warning(f"Amount {amount} not aligned to step {step}")
        return False
    return True


def validate_order_price(price: float, market: dict) -> bool:
    """Check price meets exchange tick size.

    Returns True if valid, False otherwise.
    """
    tick = market.get("precision", {}).get("price", 0)
    if tick and tick > 0 and not math.isclose(price % tick, 0, rel_tol=1e-9):
        logger.warning(f"Price {price} not aligned to tick {tick}")
        return False
    return True
