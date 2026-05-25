from __future__ import annotations

from typing import Literal

from .portfolio_manager import HedgePortfolio

ActionType = Literal["buy", "sell", "short", "cover", "hold"]


class TradeExecutor:
    """Executes trades against a HedgePortfolio."""

    def execute(
        self,
        ticker: str,
        action: ActionType,
        quantity: float,
        price: float,
        portfolio: HedgePortfolio,
    ) -> int:
        if quantity is None or quantity <= 0 or action == "hold":
            return 0
        qty = int(quantity)
        if action == "buy":
            return portfolio.buy(ticker, qty, price)
        if action == "sell":
            return portfolio.sell(ticker, qty, price)
        if action == "short":
            return portfolio.short(ticker, qty, price)
        if action == "cover":
            return portfolio.cover(ticker, qty, price)
        return 0
