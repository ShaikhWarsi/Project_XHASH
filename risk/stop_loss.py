from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from core.enums import OrderSide
from core.types import Order, PortfolioState


class StopLossTracker:
    def __init__(self, atr_multiplier: float = 2.0):
        self.atr_multiplier = atr_multiplier
        self._stop_levels: dict[str, float] = {}
        self._atr_cache: dict[str, float] = {}

    def check(self, order: Order, portfolio: PortfolioState, price: float) -> tuple[bool, str]:
        stop = self._stop_levels.get(order.symbol)
        if stop is None:
            return True, ""
        if order.side in (OrderSide.BUY, OrderSide.COVER) and price >= stop:
            return True, ""
        if order.side in (OrderSide.SELL, OrderSide.SHORT) and price <= stop:
            return True, ""
        return False, f"Stop loss {stop:.2f} hit for {order.symbol}"

    def compute_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        if df is None or len(df) < period + 1:
            return 0.0
        high = df["high"].values if "high" in df.columns else df["High"].values
        low = df["low"].values if "low" in df.columns else df["Low"].values
        close = df["close"].values if "close" in df.columns else df["Close"].values

        tr = np.maximum(
            high[1:] - low[1:],
            np.maximum(
                np.abs(high[1:] - close[:-1]),
                np.abs(low[1:] - close[:-1]),
            ),
        )
        atr = np.mean(tr[-period:])
        return float(atr)

    def update_atr(self, symbol: str, df: pd.DataFrame):
        atr = self.compute_atr(df)
        if atr > 0:
            self._atr_cache[symbol] = atr

    def update(self, portfolio: PortfolioState, price_data: Optional[dict[str, pd.DataFrame]] = None):
        for symbol, pos in portfolio.positions.items():
            if pos.quantity == 0:
                self._stop_levels.pop(symbol, None)
                continue

            if price_data and symbol in price_data:
                self.update_atr(symbol, price_data[symbol])

            cached = self._atr_cache.get(symbol)
            if cached is not None and cached > 0:
                atr = cached
            else:
                atr = pos.current_price * 0.02
            stop_distance = atr * self.atr_multiplier

            if pos.side == OrderSide.BUY:
                self._stop_levels[symbol] = pos.entry_price - stop_distance
            else:
                self._stop_levels[symbol] = pos.entry_price + stop_distance

    def is_stopped(self, symbol: str, current_price: float, side: OrderSide = OrderSide.BUY) -> bool:
        if symbol not in self._stop_levels:
            return False
        stop = self._stop_levels[symbol]
        if side == OrderSide.BUY:
            return current_price <= stop
        return current_price >= stop

    def get_stops(self) -> dict[str, float]:
        return dict(self._stop_levels)
