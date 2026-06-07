from __future__ import annotations

import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)
from datetime import datetime
from typing import Callable, Optional

import numpy as np
import pandas as pd

from core.enums import OrderSide
from core.position import Position
from core.types import PortfolioState
from execution.backtest import BacktestExecutor
from execution.order import Order, OrderType as BTOrderType, OrderStatus as BTOrderStatus
from execution.matching import OrderMatchingEngine
from execution.comminfo import CommInfo
from execution.fillers import AdaptiveFillPerc
from analytics.trade import Trade, TradeAnalyzer


@dataclass
class BacktestResult:
    total_return: float = 0.0
    annualized_return: float = 0.0
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    max_drawdown: float = 0.0
    win_rate: float = 0.0
    profit_factor: float = 0.0
    total_trades: int = 0
    equity_curve: list[float] = field(default_factory=list)
    timestamps: list[datetime] = field(default_factory=list)
    trade_analysis: dict = field(default_factory=dict)
    analyzer_results: dict = field(default_factory=dict)


class BacktestEngine:
    def __init__(
        self,
        initial_capital: float = 1_000_000.0,
        commission: float = 0.001,
        slippage: float = 0.001,
        market_rules: Optional[dict] = None,
    ):
        self.initial_capital = initial_capital
        self.commission = commission
        self.slippage = slippage
        self.market_rules = market_rules or {}
        self.executor = BacktestExecutor(slippage=slippage, commission=commission)
        mkt = self.market_rules
        self.comminfo = CommInfo(
            commission=commission,
            stocklike=True,
            percabs=True,
            leverage=mkt.get("leverage", 1.0),
        )
        self.matching_engine = OrderMatchingEngine(
            initial_cash=initial_capital,
            comminfo=self.comminfo,
            filler=AdaptiveFillPerc(max_participation=0.15),
            slippage_perc=slippage,
        )
        self.trades: list[Trade] = []
        self._open_trades: dict[str, Trade] = {}
        self.analyzers = []
        self.max_open_trades: int = 0
        self.dividend_yields: dict[str, float] = {}
        self.dividend_dates: dict[str, pd.Series] = {}
        self.borrow_rates: dict[str, float] = {}
        self.split_factors: dict[str, Callable[[str, int], float]] = {}
        self._pending_splits: dict[str, list[dict]] = {}
        self._split_series: dict[str, pd.Series] = {}


    def load_corporate_actions(self, symbols: list[str]):
        import yfinance as yf
        for sym in symbols:
            try:
                t = yf.Ticker(sym)
                divs = t.dividends
                if divs is not None and not divs.empty:
                    self.dividend_dates[sym] = divs
                    annual_div = divs.tail(252).sum() if len(divs) > 252 else divs.sum()
                    price = 100.0
                    self.dividend_yields[sym] = annual_div / price
                splits = t.splits
                if splits is not None and not splits.empty:
                    self._split_series[sym] = splits
            except Exception as e:
                logger.debug("Failed to load corp actions for %s: %s", sym, e)


    def _apply_splits(self, symbol: str, current_price: float, bar_idx: int) -> float:
        split_fn = self.split_factors.get(symbol)
        if split_fn:
            return split_fn(symbol, current_price)
        return current_price

    def add_analyzer(self, analyzer):
        analyzer.strategy = self
        analyzer._start()
        self.analyzers.append(analyzer)

    def get_analysis(self, name: str = ""):
        results = {}
        for a in self.analyzers:
            r = a.get_analysis()
            if r:
                results.update(r)
        return results

    def run(
        self,
        strategy_fn: Callable,
        data: dict[str, pd.DataFrame],
        symbols: Optional[list[str]] = None,
    ) -> BacktestResult:
        if symbols is None:
            symbols = list(data.keys())

        self.matching_engine.reset(self.initial_capital)
        if self.market_rules:
            mkt = self.market_rules
            self.matching_engine._comminfo = CommInfo(
                commission=mkt.get("commission", self.commission),
                stocklike=mkt.get("stocklike", True),
                percabs=True,
                leverage=mkt.get("leverage", 1.0),
            )
            self.matching_engine._slippage_perc = mkt.get("slippage", self.slippage)

        portfolio = PortfolioState(
            cash=self.initial_capital,
            positions={},
            total_value=self.initial_capital,
        )
        self.trades = []
        self._open_trades.clear()

        aligned = {sym: data[sym].copy().sort_index() for sym in symbols if sym in data}
        if not aligned:
            return BacktestResult()

        index_map = {sym: df.index for sym, df in aligned.items()}
        all_indices = sorted(set().union(*[set(idx) for idx in index_map.values()]))

        equity_curve: list[float] = [self.initial_capital]
        timestamps: list[datetime] = []
        current_prices: dict[str, float] = {}

        for bar_idx, current_ts in enumerate(all_indices):
            for sym in symbols:
                df = aligned.get(sym)
                if df is not None:
                    mask = df.index <= current_ts
                    if mask.any():
                        current_prices[sym] = float(df.loc[mask, "close"].iloc[-1])

            if len(current_prices) < len(symbols) or bar_idx < 20:
                continue

            for sym in symbols:
                price = current_prices.get(sym)
                if price:
                    adj_price = self._apply_splits(sym, price, bar_idx)
                    if adj_price != price:
                        pos = self.matching_engine.get_position(sym)
                        if pos != 0:
                            split_ratio = price / max(adj_price, 0.01)
                            new_pos = int(pos * split_ratio)
                            self.matching_engine.positions[sym] = new_pos

                sym_divs = self.dividend_dates.get(sym)
                if sym_divs is not None and not sym_divs.empty:
                    div_mask = sym_divs.index.date == current_ts.date()
                    if div_mask.any():
                        div_per_share = float(sym_divs[div_mask].iloc[0])
                        pos_size = self.matching_engine.get_position(sym)
                        if pos_size > 0:
                            self.matching_engine.cash += div_per_share * abs(pos_size)
                        elif pos_size < 0:
                            self.matching_engine.cash -= div_per_share * abs(pos_size)

                sym_split = self._split_series.get(sym)
                if sym_split is not None and not sym_split.empty:
                    split_mask = sym_split.index.date == current_ts.date()
                    if split_mask.any():
                        ratio = float(sym_split[split_mask].iloc[0])
                        if ratio > 0:
                            pos_size = self.matching_engine.get_position(sym)
                            if pos_size != 0:
                                new_pos = int(pos_size * ratio)
                                self.matching_engine.positions[sym] = new_pos

            self.matching_engine._bar_index = bar_idx
            for sym in symbols:
                price = current_prices.get(sym)
                if price is not None:
                    df = aligned.get(sym)
                    bar_vol = 1_000_000
                    if df is not None and current_ts in df.index:
                        bar_vol = int(df.loc[current_ts, "volume"]) if "volume" in df.columns else 1_000_000
                    self.matching_engine.set_bar_data(
                        open_p=price, high=price * 1.001,
                        low=price * 0.999, close=price,
                        volume=bar_vol,
                    )

            try:
                current_data = {
                    sym: df.loc[:current_ts]
                    for sym, df in aligned.items()
                }
                orders = strategy_fn(current_data, portfolio)

                # Respect max_open_trades (0 = unlimited)
                if self.max_open_trades > 0:
                    current_open = sum(1 for s in symbols if self.matching_engine.get_position(s) != 0)
                    orders = orders[:max(0, self.max_open_trades - current_open)]

                for order in orders:
                    price = current_prices.get(order.symbol)
                    if price is None:
                        continue

                    total_qty = int(order.quantity)
                    adv = aligned.get(order.symbol, pd.DataFrame())
                    adv_dollar = float(adv["close"].iloc[-min(len(adv), 21):].mean() * adv["volume"].iloc[-min(len(adv), 21):].mean()) if "close" in adv.columns and "volume" in adv.columns else price * 1_000_000
                    order_dollar = total_qty * price
                    max_split_size = max(int(adv_dollar * 0.01 / max(price, 0.01)), 10)

                    if order_dollar > adv_dollar * 0.01 and total_qty > max_split_size:
                        n_splits = min(max(2, total_qty // max_split_size), 20)
                        chunk = total_qty // n_splits
                        remaining_chunks = [chunk] * n_splits
                        remaining_chunks[-1] += total_qty - sum(remaining_chunks)
                        self._pending_splits[order.symbol] = [
                            {"qty": c, "side": order.side.value, "order_type": order.order_type.value}
                            for c in remaining_chunks
                        ]
                        qty = self._pending_splits[order.symbol].pop(0)["qty"]
                    else:
                        qty = total_qty

                    bt_order = Order(
                        order_type=BTOrderType.Market,
                        size=qty,
                        price=price,
                        symbol=order.symbol,
                    )

                    if order.order_type.value == "limit":
                        bt_order.exectype = BTOrderType.Limit
                    elif order.order_type.value == "stop":
                        bt_order.exectype = BTOrderType.Stop

                    if order.side.value == "buy":
                        self.matching_engine.buy(bt_order)
                    else:
                        self.matching_engine.sell(bt_order)

                for sym, splits in list(self._pending_splits.items()):
                    if splits:
                        chunk = splits.pop(0)
                        price = current_prices.get(sym, 0)
                        if price > 0:
                            bt_order = Order(
                                order_type=BTOrderType.Market,
                                size=chunk["qty"],
                                price=price,
                                symbol=sym,
                            )
                            if chunk["side"] == "buy":
                                self.matching_engine.buy(bt_order)
                            else:
                                self.matching_engine.sell(bt_order)
                    if not splits:
                        del self._pending_splits[sym]

            except Exception as e:
                logger.warning("Failed to process order in backtest: %s", e)

            self.matching_engine.next()

            _notif_max = 100000
            for _ in range(_notif_max):
                notif = self.matching_engine.get_notification()
                if notif is None:
                    break
                if notif.status in (BTOrderStatus.Completed, BTOrderStatus.Partial):
                    sym = getattr(notif, 'symbol', '')
                    exbits = notif.executed.exbits
                    if exbits:
                        last_ex = exbits[-1]
                        trade = self._open_trades.get(sym)
                        if trade is None:
                            trade = Trade(data=sym, tradeid=notif.tradeid, historyon=False)
                            self.trades.append(trade)
                        trade.update(
                            size=last_ex.size,
                            price=last_ex.price,
                            comminfo=self.comminfo,
                            order=notif,
                            dt=float(current_ts.timestamp()),
                            barindex=bar_idx,
                        )
                        if trade.isclosed:
                            self._open_trades.pop(sym, None)
                        else:
                            self._open_trades[sym] = trade
                    for a in self.analyzers:
                        a._notify_order(notif)

            div_income = 0.0
            for sym in symbols:
                pos_size = self.matching_engine.get_position(sym)
                price = current_prices.get(sym, 0.0)
                if pos_size != 0 and price > 0:
                    div_yield = self.dividend_yields.get(sym, 0.0)
                    if div_yield > 0:
                        daily_div = (div_yield / 252.0) * abs(pos_size) * price
                        if pos_size > 0:
                            div_income += daily_div
                        else:
                            div_income -= daily_div
            if div_income != 0.0:
                self.matching_engine.cash += div_income
                pos_price = self.matching_engine.get_position_price(sym)
                price = current_prices.get(sym, 0.0)
                if pos_size:
                    if sym in portfolio.positions:
                        portfolio.positions[sym].update_price(price)
                    else:
                        from core.types import Position as LegacyPosition
                        portfolio.positions[sym] = LegacyPosition(
                            symbol=sym, quantity=int(pos_size),
                            side=OrderSide.BUY if pos_size > 0 else OrderSide.SELL,
                            entry_price=pos_price, current_price=price,
                        )
                elif sym in portfolio.positions:
                    del portfolio.positions[sym]

            cash = self.matching_engine.cash
            pos_value = sum(
                abs(self.matching_engine.get_position(s)) * current_prices.get(s, 0.0)
                for s in symbols
            )
            total_value = cash + pos_value
            equity_curve.append(total_value)
            timestamps.append(current_ts.to_pydatetime())

        for a in self.analyzers:
            a._stop()

        analyzer_results = self.get_analysis()
        trade_analysis = TradeAnalyzer.analyze(self.trades)
        wins = trade_analysis.get("winners", 0)
        total_trades = trade_analysis.get("total", 0)

        return self._compute_results(equity_curve, timestamps, total_trades, wins, trade_analysis, analyzer_results)

    @staticmethod
    def _compute_results(
        equity_curve: list[float],
        timestamps: list[datetime],
        total_trades: int,
        wins: int,
        trade_analysis: dict,
        analyzer_results: dict,
    ) -> BacktestResult:
        eq = np.array(equity_curve)
        returns = np.diff(eq) / eq[:-1]

        total_return = (eq[-1] / eq[0]) - 1 if eq[0] > 0 else 0.0
        n_years = len(returns) / 252 if len(returns) > 0 else 1.0
        ann_return = (1 + total_return) ** (1 / max(n_years, 0.01)) - 1

        sharpe = 0.0
        if len(returns) > 1 and np.std(returns) > 0:
            sharpe = float(np.mean(returns) / np.std(returns) * np.sqrt(252))

        downside = returns[returns < 0]
        sortino = 0.0
        if len(downside) > 0 and np.std(downside) > 0:
            sortino = float(np.mean(returns) / np.std(downside) * np.sqrt(252))

        peak = np.maximum.accumulate(eq)
        drawdowns = (eq - peak) / peak
        max_dd = float(np.min(drawdowns)) if len(drawdowns) > 0 else 0.0

        win_rate = wins / max(total_trades, 1)
        gross_profit = sum(returns[returns > 0]) if any(returns > 0) else 0.0
        gross_loss = abs(sum(returns[returns < 0])) if any(returns < 0) else 1.0
        profit_factor = gross_profit / max(gross_loss, 1e-10)

        return BacktestResult(
            total_return=total_return,
            annualized_return=ann_return,
            sharpe_ratio=sharpe,
            sortino_ratio=sortino,
            max_drawdown=max_dd,
            win_rate=win_rate,
            profit_factor=profit_factor,
            total_trades=total_trades,
            equity_curve=equity_curve,
            timestamps=timestamps,
            trade_analysis=trade_analysis,
            analyzer_results=analyzer_results,
        )
