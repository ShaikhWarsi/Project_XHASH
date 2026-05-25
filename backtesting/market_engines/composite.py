"""Composite cross-market backtest engine.

Manages a shared capital pool across multiple market engines.
Sub-engines are used as stateless "rule books" for market-specific
calculations. All state lives in CompositeEngine.
"""

from __future__ import annotations

from typing import Dict, List

import pandas as pd

from backtesting.market_engines.base import BaseEngine
from backtesting.market_engines._market_hooks import (
    detect_market,
    is_china_futures,
    calc_crypto_funding_fee,
    check_crypto_liquidation,
    calc_forex_swap,
)


def _build_rule_engines(config: dict, codes: List[str]) -> Dict[str, BaseEngine]:
    markets = {detect_market(c) for c in codes}
    engines: Dict[str, BaseEngine] = {}

    for market in markets:
        if market == "a_share":
            from backtesting.market_engines.china_a import ChinaAEngine
            engines["a_share"] = ChinaAEngine(config)
        elif market == "us_equity":
            from backtesting.market_engines.global_equity import GlobalEquityEngine
            engines["us_equity"] = GlobalEquityEngine(config, market="us")
        elif market == "hk_equity":
            from backtesting.market_engines.global_equity import GlobalEquityEngine
            engines["hk_equity"] = GlobalEquityEngine(config, market="hk")
        elif market == "crypto":
            from backtesting.market_engines.crypto import CryptoEngine
            engines["crypto"] = CryptoEngine(config)
        elif market == "forex":
            from backtesting.market_engines.forex import ForexEngine
            engines["forex"] = ForexEngine(config)
        elif market == "futures":
            china = any(
                is_china_futures(c) for c in codes if detect_market(c) == "futures"
            )
            if china:
                from backtesting.market_engines.china_futures import ChinaFuturesEngine
                engines["futures"] = ChinaFuturesEngine(config)
            else:
                from backtesting.market_engines.global_futures import GlobalFuturesEngine
                engines["futures"] = GlobalFuturesEngine(config)

    return engines


class CompositeEngine(BaseEngine):
    """Cross-market engine with shared capital pool.

    Sub-engines are stateless rule providers.
    All positions, capital, and trades live here.
    """

    def __init__(self, config: dict, codes: List[str]):
        super().__init__(config)

        self._symbol_market: Dict[str, str] = {c: detect_market(c) for c in codes}
        self._rule_engines = _build_rule_engines(config, codes)

        self._funding_applied: set = set()
        self._funding_daily_done: set = set()
        self._last_swap_dates: dict = {}

    def _rule_for(self, symbol: str) -> BaseEngine:
        market = self._symbol_market.get(symbol, "a_share")
        return self._rule_engines[market]

    def can_execute(self, symbol: str, direction: int, bar: pd.Series) -> bool:
        market = self._symbol_market.get(symbol, "a_share")

        if market == "a_share" and direction == 0:
            pos = self.positions.get(symbol)
            if pos is not None:
                bar_date = None
                if hasattr(bar, "name") and hasattr(bar.name, "date"):
                    bar_date = bar.name.date()
                entry_date = (
                    pos.entry_time.date()
                    if hasattr(pos.entry_time, "date")
                    else None
                )
                if bar_date and entry_date and bar_date == entry_date:
                    return False

        return self._rule_for(symbol).can_execute(symbol, direction, bar)

    def round_size(self, raw_size: float, price: float) -> float:
        return self._rule_for(self._active_symbol).round_size(raw_size, price)

    def calc_commission(
        self, size: float, price: float, direction: int, is_open: bool,
    ) -> float:
        return self._rule_for(self._active_symbol).calc_commission(
            size, price, direction, is_open,
        )

    def apply_slippage(self, price: float, direction: int) -> float:
        sub = self._rule_for(self._active_symbol)
        sub._active_symbol = self._active_symbol
        return sub.apply_slippage(price, direction)

    def _calc_pnl(
        self, symbol: str, direction: int, size: float,
        entry_price: float, exit_price: float,
    ) -> float:
        return self._rule_for(symbol)._calc_pnl(
            symbol, direction, size, entry_price, exit_price,
        )

    def _calc_margin(
        self, symbol: str, size: float, price: float, leverage: float,
    ) -> float:
        return self._rule_for(symbol)._calc_margin(symbol, size, price, leverage)

    def _calc_raw_size(
        self, symbol: str, target_notional: float, price: float,
    ) -> float:
        return self._rule_for(symbol)._calc_raw_size(symbol, target_notional, price)

    def on_bar(self, symbol: str, bar: pd.Series, timestamp: pd.Timestamp) -> None:
        market = self._symbol_market.get(symbol)

        if market == "crypto":
            crypto_sub = self._rule_engines["crypto"]
            fee = calc_crypto_funding_fee(
                symbol, bar, timestamp, self.positions,
                crypto_sub.funding_rate,
                self._funding_applied, self._funding_daily_done,
            )
            self.capital -= fee

            if check_crypto_liquidation(symbol, bar, self.positions):
                pos = self.positions.get(symbol)
                if pos is not None:
                    mark_price = float(bar.get("close", pos.entry_price))
                    liq_price = crypto_sub.apply_slippage(mark_price, -pos.direction)
                    self._close_position(symbol, liq_price, timestamp, "liquidation")

        elif market == "forex":
            forex_sub = self._rule_engines["forex"]
            if forex_sub.swap_enabled:
                swap = calc_forex_swap(
                    symbol, timestamp, self.positions,
                    forex_sub.lot_size, self._last_swap_dates,
                )
                self.capital += swap
