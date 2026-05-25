"""Global futures backtest engine (CME / ICE / Eurex).

Market rules:
  - Nearly 24x5
  - Margin: initial + maintenance
  - Contract multiplier: per-product
  - Commission: per-contract ($1-3)
  - Minimum unit: 1 contract
"""

from __future__ import annotations

import re

import pandas as pd

from backtesting.market_engines.futures_base import FuturesBaseEngine


_MULTIPLIER: dict[str, float] = {
    "ES": 50, "NQ": 20, "YM": 5, "RTY": 50,
    "MES": 5, "MNQ": 2, "MYM": 0.5, "M2K": 5,
    "CL": 1000, "NG": 10000, "RB": 42000, "HO": 42000,
    "GC": 100, "SI": 5000, "HG": 25000, "PL": 50, "PA": 100,
    "MGC": 10, "SIL": 1000,
    "ZC": 50, "ZS": 50, "ZW": 50, "ZM": 100, "ZL": 600,
    "ZB": 1000, "ZN": 1000, "ZF": 1000, "ZT": 2000,
    "6E": 125000, "6J": 12500000, "6B": 62500, "6A": 100000, "6C": 100000,
    "KC": 37500, "SB": 112000, "CC": 10, "CT": 50000,
    "LE": 400, "HE": 400, "GF": 500,
    "FESX": 10, "FDAX": 25, "FGBL": 1000,
}

_MARGIN_PER_CONTRACT: dict[str, float] = {
    "ES": 12650, "NQ": 17600, "YM": 8800, "RTY": 6600,
    "MES": 1265, "MNQ": 1760,
    "CL": 6270, "NG": 3300,
    "GC": 9950, "SI": 11000, "HG": 4400, "PL": 3300,
    "MGC": 995,
    "ZC": 1650, "ZS": 2200, "ZW": 1925,
    "ZB": 4400, "ZN": 2200, "ZF": 1375,
    "6E": 2475, "6J": 3300, "6B": 2750,
}

_PRICE_LIMIT: dict[str, float] = {
    "ES": 0.07, "NQ": 0.07, "YM": 0.07, "RTY": 0.07,
    "MES": 0.07, "MNQ": 0.07,
}

_COMMISSION_PER_CONTRACT: dict[str, float] = {
    "ES": 2.25, "NQ": 2.25, "YM": 2.25, "RTY": 2.25,
    "MES": 0.62, "MNQ": 0.62,
    "CL": 2.25, "NG": 2.25,
    "GC": 2.25, "SI": 2.25, "HG": 2.25,
    "MGC": 0.62,
    "ZC": 2.25, "ZS": 2.25, "ZW": 2.25,
    "ZB": 1.52, "ZN": 1.52, "ZF": 1.02,
    "6E": 2.25, "6J": 2.25, "6B": 2.25,
}
_DEFAULT_COMMISSION = 2.50


def _extract_product(symbol: str) -> str:
    code = symbol.split(".")[0].upper()
    m = re.match(r"([A-Z]{2,4})([FGHJKMNQUVXZ])(\d{1,4})$", code)
    if m:
        return m.group(1)
    m = re.match(r"([A-Z]+)(\d{4})$", code)
    if m:
        return m.group(1)
    m = re.match(r"([A-Z]+)", code)
    return m.group(1) if m else code


class GlobalFuturesEngine(FuturesBaseEngine):
    """International futures engine (CME/CBOT/NYMEX/COMEX/ICE/Eurex).

    Config keys:
      - slippage: default 0.0003
      - commission_per_contract: override
    """

    def __init__(self, config: dict):
        leverage = config.get("leverage", 10.0)
        config = {**config, "leverage": leverage}
        super().__init__(config)
        self.slippage_rate: float = config.get("slippage", 0.0003)
        self._comm_override = config.get("commission_per_contract")

    def can_execute(self, symbol: str, direction: int, bar: pd.Series) -> bool:
        product = _extract_product(symbol)
        limit = _PRICE_LIMIT.get(product)
        if limit is None:
            return True
        pct_chg = _calc_pct_change(bar)
        if pct_chg is not None:
            if direction == 1 and pct_chg >= limit - 0.001:
                return False
            if direction == -1 and pct_chg <= -limit + 0.001:
                return False
            if direction == 0:
                pos = self.positions.get(symbol)
                if pos is not None:
                    if pos.direction == 1 and pct_chg <= -limit + 0.001:
                        return False
                    if pos.direction == -1 and pct_chg >= limit - 0.001:
                        return False
        return True

    def round_size(self, raw_size: float, price: float) -> float:
        return max(int(raw_size), 0)

    def calc_commission(self, size: float, price: float, _direction: int, is_open: bool) -> float:
        if self._comm_override is not None:
            return size * self._comm_override
        return self.calc_commission_for_symbol(self._active_symbol, size, price, is_open)

    def calc_commission_for_symbol(
        self, symbol: str, size: float, price: float, is_open: bool,
    ) -> float:
        product = _extract_product(symbol)
        rate = _COMMISSION_PER_CONTRACT.get(product, _DEFAULT_COMMISSION)
        return size * rate

    def apply_slippage(self, price: float, direction: int) -> float:
        return price * (1 + direction * self.slippage_rate)

    def get_contract_multiplier(self, symbol: str) -> float:
        product = _extract_product(symbol)
        return float(_MULTIPLIER.get(product, 50))


def _calc_pct_change(bar: pd.Series):
    close = bar.get("close")
    pre_close = bar.get("pre_close")
    if close is not None and pre_close is not None and pre_close > 0:
        return (float(close) - float(pre_close)) / float(pre_close)

    settle = bar.get("settle")
    pre_settle = bar.get("pre_settle")
    if settle is not None and pre_settle is not None and pre_settle > 0:
        return (float(settle) - float(pre_settle)) / float(pre_settle)

    if "pct_chg" in bar.index:
        val = bar["pct_chg"]
        if pd.notna(val):
            raw = float(val)
            return raw / 100.0 if abs(raw) > 1.0 else raw
    return None
