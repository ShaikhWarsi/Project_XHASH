#!/usr/bin/env python3
"""Backtest runner script.

Usage:
    python scripts/run.py --tickers AAPL,MSFT --start 2024-01-01 --end 2024-12-31
"""

from __future__ import annotations

import argparse
from datetime import datetime
from typing import Any, Dict, Optional

import pandas as pd

from analytics.metrics import PerformanceMetrics
from analytics.reports import ReportGenerator
from backtesting.engine import BacktestEngine, BacktestResult
from backtesting.engine_factory import get_engine_params
from core.enums import Timeframe
from data.providers.yfinance import YFinanceDataSource


def fetch_data(tickers: list[str], start: datetime, end: datetime) -> dict[str, pd.DataFrame]:
    source = YFinanceDataSource()
    data = {}
    for ticker in tickers:
        print(f"Fetching {ticker}...")
        df = source.fetch_bars(ticker, Timeframe.D1, start, end)
        if df is not None and len(df) > 0:
            data[ticker] = df
    return data


def sma_cross_strategy(bars, portfolio):
    from core.enums import OrderSide, OrderType
    from core.types import Order

    orders = []
    for symbol, df in bars.items():
        if len(df) < 50:
            continue
        close = df["close"]
        sma_20 = close.tail(20).mean()
        sma_50 = close.tail(50).mean()
        last_close = close.iloc[-1]

        pos = portfolio.positions.get(symbol)
        if last_close > sma_20 and sma_20 > sma_50 and (pos is None or pos.quantity == 0):
            orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=10, order_type=OrderType.MARKET, price=last_close))
        elif last_close < sma_20 and pos is not None and pos.quantity > 0:
            orders.append(Order(symbol=symbol, side=OrderSide.SELL, quantity=pos.quantity, order_type=OrderType.MARKET, price=last_close))
    return orders


def momentum_strategy(bars, portfolio):
    from core.enums import OrderSide, OrderType
    from core.types import Order

    orders = []
    for symbol, df in bars.items():
        if len(df) < 20:
            continue
        close = df["close"]
        returns = close.pct_change(5).iloc[-1] if len(close) > 5 else 0
        last_close = close.iloc[-1]
        pos = portfolio.positions.get(symbol)
        if returns > 0.02 and (pos is None or pos.quantity == 0):
            orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=10, order_type=OrderType.MARKET, price=last_close))
        elif returns < -0.02 and pos is not None and pos.quantity > 0:
            orders.append(Order(symbol=symbol, side=OrderSide.SELL, quantity=pos.quantity, order_type=OrderType.MARKET, price=last_close))
    return orders


def mean_reversion_strategy(bars, portfolio):
    from core.enums import OrderSide, OrderType
    from core.types import Order

    orders = []
    for symbol, df in bars.items():
        if len(df) < 20:
            continue
        close = df["close"]
        sma = close.tail(20).mean()
        std = close.tail(20).std()
        last_close = close.iloc[-1]
        pos = portfolio.positions.get(symbol)
        if last_close < sma - 1.5 * std and (pos is None or pos.quantity == 0):
            orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=10, order_type=OrderType.MARKET, price=last_close))
        elif last_close > sma + 1.5 * std and pos is not None and pos.quantity > 0:
            orders.append(Order(symbol=symbol, side=OrderSide.SELL, quantity=pos.quantity, order_type=OrderType.MARKET, price=last_close))
    return orders


STRATEGIES = {
    "sma_cross": sma_cross_strategy,
    "momentum": momentum_strategy,
    "mean_reversion": mean_reversion_strategy,
}


def run_backtest(
    strategy_name: str = "sma_cross",
    tickers: Optional[list[str]] = None,
    start: str = "",
    end: str = "",
    capital: float = 100000.0,
    engine_type: str = "default",
    leverage: Optional[float] = None,
) -> Dict[str, Any]:
    if not start:
        start = (datetime.now().replace(year=datetime.now().year - 1)).strftime("%Y-%m-%d")
    if not end:
        end = datetime.now().strftime("%Y-%m-%d")
    if tickers is None:
        tickers = ["AAPL", "MSFT"]

    start_dt = datetime.strptime(start, "%Y-%m-%d")
    end_dt = datetime.strptime(end, "%Y-%m-%d")

    print(f"Fetching data for {tickers} from {start} to {end}...")
    data = fetch_data(tickers, start_dt, end_dt)
    if not data:
        print("No data fetched. Aborting.")
        return {"error": "No data fetched"}

    strategy_fn = STRATEGIES.get(strategy_name, sma_cross_strategy)
    overrides = {"leverage": leverage} if leverage is not None else {}
    engine_params = get_engine_params(engine_type, overrides)

    engine = BacktestEngine(
        initial_capital=capital,
        market_rules=engine_params,
        commission=engine_params["commission"],
        slippage=engine_params["slippage"],
    )
    print(f"Running backtest ({engine_type}, {strategy_name})...")
    result: BacktestResult = engine.run(strategy_fn, data)

    return {
        "total_return": result.total_return,
        "annualized_return": result.annualized_return,
        "sharpe_ratio": result.sharpe_ratio,
        "sortino_ratio": result.sortino_ratio,
        "max_drawdown": result.max_drawdown,
        "win_rate": result.win_rate,
        "profit_factor": result.profit_factor,
        "total_trades": result.total_trades,
    }


def main():
    parser = argparse.ArgumentParser(description="Run a backtest")
    parser.add_argument("--tickers", default="AAPL,MSFT", help="Comma-separated tickers")
    parser.add_argument("--start", default="2024-01-01", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", default="2024-12-31", help="End date (YYYY-MM-DD)")
    parser.add_argument("--capital", type=float, default=1_000_000.0, help="Initial capital")
    parser.add_argument("--strategy", default="sma_cross", help="Strategy (sma_cross/momentum/mean_reversion)")
    parser.add_argument("--engine", default="default", help="Market engine type")
    parser.add_argument("--leverage", type=float, default=None, help="Leverage multiplier (overrides engine default)")
    args = parser.parse_args()

    tickers = [t.strip() for t in args.tickers.split(",")]
    result = run_backtest(
        strategy_name=args.strategy,
        tickers=tickers,
        start=args.start,
        end=args.end,
        capital=args.capital,
        engine_type=args.engine,
        leverage=args.leverage,
    )

    if "error" in result:
        print(result["error"])
        return

    metrics = PerformanceMetrics.compute(
        [result.get("total_return", 0)]  # simplified
    )
    report = ReportGenerator.text_report(metrics, title="Backtest Results")
    print()
    print(report)
    for key, value in result.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
