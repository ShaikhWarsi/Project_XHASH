from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from core.enums import OrderSide
from core.types import PortfolioState, Position


@dataclass
class PositionState:
    long: int = 0
    short: int = 0
    long_cost_basis: float = 0.0
    short_cost_basis: float = 0.0
    short_margin_used: float = 0.0


@dataclass
class TickerGains:
    long: float = 0.0
    short: float = 0.0


class HedgePortfolio:
    """Portfolio manager with full long/short support, margin tracking, and cost basis."""

    def __init__(
        self,
        tickers: List[str],
        initial_cash: float = 1_000_000.0,
        margin_requirement: float = 0.5,
    ):
        self._cash = float(initial_cash)
        self._margin_requirement = margin_requirement
        self._margin_used = 0.0
        self._positions: Dict[str, PositionState] = {t: PositionState() for t in tickers}
        self._realized_gains: Dict[str, TickerGains] = {t: TickerGains() for t in tickers}

    @property
    def cash(self) -> float:
        return self._cash

    @property
    def margin_used(self) -> float:
        return self._margin_used

    @property
    def margin_requirement(self) -> float:
        return self._margin_requirement

    def get_position(self, ticker: str) -> PositionState:
        return self._positions.get(ticker, PositionState())

    def get_gains(self, ticker: str) -> TickerGains:
        return self._realized_gains.get(ticker, TickerGains())

    def buy(self, ticker: str, quantity: int, price: float) -> int:
        if quantity <= 0:
            return 0
        qty = int(quantity)
        pos = self._positions.get(ticker)
        if pos is None:
            return 0
        cost = qty * price
        if cost <= self._cash:
            total_shares = pos.long + qty
            total_cost = (pos.long_cost_basis * pos.long) + cost
            pos.long_cost_basis = total_cost / total_shares if total_shares > 0 else 0
            pos.long += qty
            self._cash -= cost
            return qty
        max_qty = int(self._cash / price) if price > 0 else 0
        if max_qty > 0:
            cost = max_qty * price
            total_shares = pos.long + max_qty
            total_cost = (pos.long_cost_basis * pos.long) + cost
            pos.long_cost_basis = total_cost / total_shares if total_shares > 0 else 0
            pos.long += max_qty
            self._cash -= cost
            return max_qty
        return 0

    def sell(self, ticker: str, quantity: int, price: float) -> int:
        pos = self._positions.get(ticker)
        if pos is None:
            return 0
        qty = min(int(quantity), pos.long) if quantity > 0 else 0
        if qty <= 0:
            return 0
        avg_cost = pos.long_cost_basis if pos.long > 0 else 0.0
        realized = (price - avg_cost) * qty
        self._realized_gains[ticker].long += realized
        pos.long -= qty
        self._cash += qty * price
        if pos.long == 0:
            pos.long_cost_basis = 0.0
        return qty

    def short(self, ticker: str, quantity: int, price: float) -> int:
        if quantity <= 0:
            return 0
        qty = int(quantity)
        pos = self._positions.get(ticker)
        if pos is None:
            return 0
        proceeds = qty * price
        margin_required = proceeds * self._margin_requirement
        available = max(0.0, self._cash - self._margin_used)
        if margin_required <= available:
            total_shares = pos.short + qty
            total_cost = (pos.short_cost_basis * pos.short) + (price * qty)
            pos.short_cost_basis = total_cost / total_shares if total_shares > 0 else 0
            pos.short += qty
            pos.short_margin_used += margin_required
            self._margin_used += margin_required
            self._cash += proceeds - margin_required
            return qty
        max_qty = int(available / (price * self._margin_requirement)) if self._margin_requirement > 0 and price > 0 else 0
        if max_qty > 0:
            proceeds = max_qty * price
            margin_required = proceeds * self._margin_requirement
            total_shares = pos.short + max_qty
            total_cost = (pos.short_cost_basis * pos.short) + (price * max_qty)
            pos.short_cost_basis = total_cost / total_shares if total_shares > 0 else 0
            pos.short += max_qty
            pos.short_margin_used += margin_required
            self._margin_used += margin_required
            self._cash += proceeds - margin_required
            return max_qty
        return 0

    def cover(self, ticker: str, quantity: int, price: float) -> int:
        pos = self._positions.get(ticker)
        if pos is None:
            return 0
        qty = min(int(quantity), pos.short) if quantity > 0 else 0
        if qty <= 0:
            return 0
        avg_price = pos.short_cost_basis if pos.short > 0 else 0.0
        realized = (avg_price - price) * qty
        portion = qty / pos.short if pos.short > 0 else 1.0
        margin_release = portion * pos.short_margin_used
        pos.short -= qty
        pos.short_margin_used -= margin_release
        self._margin_used -= margin_release
        self._cash += margin_release - (qty * price)
        self._realized_gains[ticker].short += realized
        if pos.short == 0:
            pos.short_cost_basis = 0.0
            pos.short_margin_used = 0.0
        return qty

    def total_value(self, prices: Dict[str, float]) -> float:
        val = self._cash
        for ticker, pos in self._positions.items():
            p = prices.get(ticker, 0)
            val += pos.long * p
            val -= pos.short * p
        return val

    def exposures(self, prices: Dict[str, float]) -> Dict[str, float]:
        long_ex = short_ex = 0.0
        for ticker, pos in self._positions.items():
            p = prices.get(ticker, 0)
            long_ex += pos.long * p
            short_ex += pos.short * p
        gross = long_ex + short_ex
        net = long_ex - short_ex
        ratio = long_ex / short_ex if short_ex > 1e-9 else float("inf")
        return {
            "Long Exposure": long_ex,
            "Short Exposure": short_ex,
            "Gross Exposure": gross_ex,
            "Net Exposure": net_ex,
            "Long/Short Ratio": ratio,
        }

    def to_portfolio_state(self, prices: Dict[str, float]) -> PortfolioState:
        positions: Dict[str, Position] = {}
        for ticker, pos in self._positions.items():
            p = prices.get(ticker, 0)
            if pos.long > 0:
                positions[f"{ticker}_long"] = Position(
                    symbol=ticker, quantity=pos.long,
                    side=OrderSide.BUY, entry_price=pos.long_cost_basis,
                    current_price=p,
                )
            if pos.short > 0:
                positions[f"{ticker}_short"] = Position(
                    symbol=ticker, quantity=pos.short,
                    side=OrderSide.SHORT, entry_price=pos.short_cost_basis,
                    current_price=p,
                )
        return PortfolioState(
            cash=self._cash,
            positions=positions,
            total_value=self.total_value(prices),
            margin_used=self._margin_used,
            margin_requirement=self._margin_requirement,
        )
