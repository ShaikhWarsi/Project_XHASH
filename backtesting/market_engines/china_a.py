"""A-share (China mainland) backtest engine.

Market rules:
  - T+1: cannot sell shares bought today
  - No short selling for retail investors
  - Price limits: +/-10% main board, +/-20% ChiNext/STAR, +/-5% ST
  - Minimum lot: 100 shares
  - Commission: 5 RMB minimum, 0.025% bilateral
  - Stamp tax: 0.05% sell-side only
  - Transfer fee: 0.001% bilateral
"""

from __future__ import annotations

import logging

import pandas as pd

from backtesting.market_engines.base import BaseEngine

logger = logging.getLogger(__name__)


class ChinaAEngine(BaseEngine):
    """A-share market engine.

    Config keys:
      - commission_rate: default 0.00025
      - commission_min: default 5.0 (RMB)
      - stamp_tax: default 0.0005
      - transfer_fee: default 0.00001
      - slippage: default 0.001
    """

    def __init__(self, config: dict):
        config = {**config, "leverage": 1.0}
        super().__init__(config)
        self.commission_rate: float = config.get("commission_rate", 0.00025)
        self.commission_min: float = config.get("commission_min", 5.0)
        self.stamp_tax: float = config.get("stamp_tax", 0.0005)
        self.transfer_fee: float = config.get("transfer_fee", 0.00001)
        self.slippage_rate: float = config.get("slippage", 0.001)

    def can_execute(self, symbol: str, direction: int, bar: pd.Series) -> bool:
        if direction == -1:
            return False

        if direction == 0:
            pos = self.positions.get(symbol)
            if pos is not None:
                bar_date = _bar_date(bar)
                entry_date = pos.entry_time.date() if hasattr(pos.entry_time, "date") else None
                if bar_date is not None and entry_date is not None and bar_date == entry_date:
                    return False

        pct_chg = _calc_pct_change(bar)
        if pct_chg is not None:
            limit = _price_limit(symbol)
            if direction == 1 and pct_chg >= limit - 0.001:
                return False
            if direction == 0 and pct_chg <= -limit + 0.001:
                return False

        return True

    def round_size(self, raw_size: float, price: float) -> float:
        return max(int(raw_size / 100) * 100, 0)

    def calc_commission(self, size: float, price: float, _direction: int, is_open: bool) -> float:
        notional = size * price
        comm = max(notional * self.commission_rate, self.commission_min)
        comm += notional * self.transfer_fee
        if not is_open:
            comm += notional * self.stamp_tax
        return comm

    def apply_slippage(self, price: float, direction: int) -> float:
        return price * (1 + direction * self.slippage_rate)


def _bar_date(bar: pd.Series):
    for col in ("trade_date", "date"):
        if col in bar.index:
            val = bar[col]
            if hasattr(val, "date"):
                return val.date()
            try:
                return pd.Timestamp(val).date()
            except Exception as e:
                logger.debug("Failed to parse bar date: %s", e)
    if hasattr(bar, "name") and hasattr(bar.name, "date"):
        return bar.name.date()
    return None


def _calc_pct_change(bar: pd.Series):
    if "pct_chg" in bar.index:
        val = bar["pct_chg"]
        if pd.notna(val):
            return float(val) / 100.0

    close = bar.get("close")
    pre_close = bar.get("pre_close")
    if close is not None and pre_close is not None and pre_close > 0:
        return (float(close) - float(pre_close)) / float(pre_close)
    return None


def _price_limit(symbol: str) -> float:
    code = symbol.split(".")[0] if "." in symbol else symbol
    if code.startswith("300") or code.startswith("688"):
        return 0.20
    if code.startswith("8") and len(code) == 6:
        return 0.30
    return 0.10
