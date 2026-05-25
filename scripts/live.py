#!/usr/bin/env python3
"""Live paper trading runner with full strategy and risk management.

Usage:
    python scripts/live.py --mode paper --tickers AAPL,MSFT --strategy sma_cross
    python scripts/live.py --mode paper --tickers BTC-USD --strategy orchestrator
"""

from __future__ import annotations

import argparse
import logging
import time
from datetime import datetime, timedelta

import pandas as pd

from agents.orchestrator import TradingOrchestrator
from core.enums import OrderSide, OrderType, Timeframe
from core.types import Order, PortfolioState, SignalMatrix
from data.providers.yfinance import YFinanceDataSource
from execution.paper_trading import PaperTradingExecutor
from risk.circuit_breakers import CircuitBreaker
from risk.engine import RiskEngine
from risk.limits import PositionLimits
from risk.position_sizing import PositionSizer
from risk.stop_loss import StopLossTracker
from signals.composite import SignalAggregator
from signals.engine_registry import create_engine, list_engines

logger = logging.getLogger(__name__)


def sma_cross_strategy(bars: dict[str, pd.DataFrame], portfolio: PortfolioState) -> list[Order]:
    orders = []
    for symbol, df in bars.items():
        if len(df) < 50:
            continue
        close = df["close"]
        sma_20 = close.tail(20).mean()
        sma_50 = close.tail(50).mean()
        last_close = float(close.iloc[-1])
        pos = portfolio.positions.get(symbol)
        if last_close > sma_20 and sma_20 > sma_50 and (pos is None or pos.quantity == 0):
            orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=10, order_type=OrderType.MARKET, price=last_close))
        elif last_close < sma_20 and pos is not None and pos.quantity > 0:
            orders.append(Order(symbol=symbol, side=OrderSide.SELL, quantity=pos.quantity, order_type=OrderType.MARKET, price=last_close))
    return orders


def orchestrator_strategy(bars: dict[str, pd.DataFrame], portfolio: PortfolioState) -> list[Order]:
    """Strategy driven by the full signal pipeline + multi-agent TradingOrchestrator."""
    engine_names = list_engines("smc") + list_engines("regime") + list_engines("pattern") + list_engines("structure")
    engines = {}
    for name in engine_names:
        e = create_engine(name)
        if e is not None:
            engines[name] = e

    aggregator = SignalAggregator()
    for name in engines:
        aggregator.register(name)

    symbol = next(iter(bars)) if bars else ""
    symbol_bars = list(bars.values())[0] if bars else pd.DataFrame()
    if symbol_bars.empty or len(symbol_bars) < 50:
        return []

    symbol_bars.attrs["symbol"] = symbol
    symbol_bars.attrs["timeframe"] = "1d"

    results = {}
    for name, engine in engines.items():
        try:
            results[name] = engine.compute(symbol_bars)
        except Exception as e:
            logger.debug("Engine %s error: %s", name, e)
            results[name] = []

    signal_matrix = aggregator.aggregate(results, [symbol])
    signal_matrix.timestamp = datetime.utcnow()

    orchestrator = TradingOrchestrator()
    current_prices = {symbol: float(symbol_bars["close"].iloc[-1])}

    orders = orchestrator.run(
        tickers=[symbol],
        portfolio=portfolio,
        signals=signal_matrix,
        current_prices=current_prices,
        prices_df=bars,
    )
    return orders


STRATEGIES = {
    "sma_cross": sma_cross_strategy,
    "orchestrator": orchestrator_strategy,
}


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    parser = argparse.ArgumentParser(description="Run paper/live trading")
    parser.add_argument("--mode", default="paper", choices=["paper", "live"], help="Trading mode")
    parser.add_argument("--tickers", default="AAPL,MSFT", help="Comma-separated tickers")
    parser.add_argument("--capital", type=float, default=1_000_000.0, help="Initial capital")
    parser.add_argument("--strategy", default="orchestrator", choices=list(STRATEGIES.keys()), help="Strategy to run")
    parser.add_argument("--interval", type=int, default=60, help="Polling interval in seconds")
    args = parser.parse_args()

    tickers = [t.strip() for t in args.tickers.split(",")]
    strategy_fn = STRATEGIES[args.strategy]

    executor = PaperTradingExecutor(initial_cash=args.capital)
    executor.connect()

    risk_engine = RiskEngine(
        position_limits=PositionLimits(type("limits", (), {"max_position_size_pct": 0.15, "max_leverage": 2.0, "max_concentration_pct": 0.25})()),
        stop_loss=StopLossTracker(),
        position_sizer=PositionSizer(type("limits", (), {"max_position_size_pct": 0.15})()),
        circuit_breaker=CircuitBreaker(),
    )
    data_source = YFinanceDataSource()

    logger.info("Starting %s trading for %s with strategy '%s'", args.mode, tickers, args.strategy)
    logger.info("Initial capital: $%.2f", args.capital)

    try:
        while True:
            portfolio = executor.get_portfolio()
            prices: dict[str, float] = {}
            bars: dict[str, pd.DataFrame] = {}

            for ticker in tickers:
                try:
                    bar = data_source.fetch_latest_bar(ticker, Timeframe.D1)
                    if bar:
                        prices[ticker] = bar.close
                        try:
                            bars[ticker] = data_source.fetch_bars(
                                ticker, Timeframe.D1,
                                start=datetime.now() - timedelta(days=60),
                                end=datetime.now(),
                            )
                        except Exception as e:
                            logger.warning("Error fetching history for %s: %s", ticker, e)
                except Exception as e:
                    logger.warning("Error fetching %s: %s", ticker, e)

            if prices:
                executor.update_prices(prices)

            portfolio = executor.get_portfolio()

            try:
                orders = strategy_fn(bars, portfolio)
            except Exception as e:
                logger.error("Strategy error: %s", e)
                orders = []

            for order in orders:
                price = prices.get(order.symbol, 0.0)
                if price <= 0:
                    logger.warning("No price for %s, skipping order", order.symbol)
                    continue
                if order.price is None:
                    order.price = price

                passed, reason = risk_engine.validate_order(order, portfolio, price)
                if not passed:
                    logger.warning("Risk rejected order %s %s: %s", order.symbol, order.side, reason)
                    continue

                fill = executor.submit_order(order)
                if fill:
                    logger.info("Filled: %s %s x%d @ %.2f", fill.symbol, fill.side, fill.quantity, fill.price)

            risk_engine.update(portfolio)

            portfolio = executor.get_portfolio()
            logger.info(
                "Value: $%.2f | Cash: $%.2f | Positions: %d",
                portfolio.total_value, portfolio.cash, len(portfolio.positions),
            )

            for _ in range(args.interval):
                time.sleep(1)

    except KeyboardInterrupt:
        logger.info("Shutting down...")
        executor.disconnect()
        logger.info("Done.")


if __name__ == "__main__":
    main()
