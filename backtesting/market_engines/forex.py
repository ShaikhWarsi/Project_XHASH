"""Forex (FX spot / CFD) backtest engine.

Market rules:
  - 24x5 (Mon Sydney open to Fri NYC close)
  - Spread replaces explicit commission (bid-ask)
  - Leverage: 50:1 to 500:1 (configurable)
  - Standard lot = 100,000 units
  - Swap (overnight rollover interest) at daily close
  - No price limits, no restrictions on direction
"""

from __future__ import annotations

import pandas as pd

from backtesting.market_engines.base import BaseEngine
from backtesting.market_engines._market_hooks import normalize_forex_symbol, calc_forex_swap


_SPREAD_PIPS: dict[str, float] = {
    "EUR/USD": 1.0, "GBP/USD": 1.2, "USD/JPY": 1.0, "USD/CHF": 1.3,
    "AUD/USD": 1.2, "USD/CAD": 1.5, "NZD/USD": 1.5,
    "EUR/GBP": 1.5, "EUR/JPY": 1.5, "GBP/JPY": 2.5, "EUR/CHF": 1.8,
    "AUD/JPY": 2.0, "CHF/JPY": 2.5, "EUR/AUD": 2.0, "GBP/AUD": 3.0,
    "EUR/CAD": 2.5, "GBP/CAD": 3.5, "AUD/CAD": 2.5, "NZD/JPY": 2.5,
    "USD/TRY": 15.0, "USD/ZAR": 10.0, "USD/MXN": 8.0,
    "USD/SGD": 3.0, "USD/HKD": 3.0, "USD/CNH": 5.0,
}
_DEFAULT_SPREAD_PIPS = 2.0

STANDARD_LOT = 100_000


def _pip_value(symbol: str) -> float:
    quote = symbol.split("/")[1] if "/" in symbol else symbol[3:6]
    return 0.01 if quote.upper() == "JPY" else 0.0001


class ForexEngine(BaseEngine):
    """Forex engine for spot / CFD pairs.

    Config keys:
      - leverage: default 100.0 (100:1)
      - spread_pips_override: override spread for all pairs
      - lot_size: default 100000 (standard lot)
      - swap_enabled: default True
      - slippage_pips: additional slippage beyond spread, default 0.3
    """

    def __init__(self, config: dict):
        config = {**config, "leverage": config.get("leverage", 100.0)}
        super().__init__(config)
        self.spread_override = config.get("spread_pips_override")
        self.lot_size: float = config.get("lot_size", STANDARD_LOT)
        self.swap_enabled: bool = config.get("swap_enabled", True)
        self.slippage_pips: float = config.get("slippage_pips", 0.3)
        self._last_swap_dates: dict = {}

    def can_execute(self, symbol: str, direction: int, bar: pd.Series) -> bool:
        return True

    def round_size(self, raw_size: float, price: float) -> float:
        return max(int(raw_size / 1000) * 1000, 0)

    def calc_commission(self, size: float, price: float, _direction: int, is_open: bool) -> float:
        return 0.0

    def apply_slippage(self, price: float, direction: int) -> float:
        return self.apply_slippage_for_symbol(self._active_symbol, price, direction)

    def apply_slippage_for_symbol(self, symbol: str, price: float, direction: int) -> float:
        pair = normalize_forex_symbol(symbol)
        pip = _pip_value(pair)

        if self.spread_override is not None:
            spread_pips = self.spread_override
        else:
            spread_pips = _SPREAD_PIPS.get(pair, _DEFAULT_SPREAD_PIPS)

        total_pips = (spread_pips / 2) + self.slippage_pips
        return price + direction * total_pips * pip

    def on_bar(self, symbol: str, bar: pd.Series, timestamp: pd.Timestamp) -> None:
        if not self.swap_enabled:
            return
        swap = calc_forex_swap(
            symbol, timestamp, self.positions,
            self.lot_size, self._last_swap_dates,
        )
        self.capital += swap
