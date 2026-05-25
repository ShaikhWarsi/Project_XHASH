from __future__ import annotations

import pandas as pd

from backtesting.engine import BacktestEngine


def dummy_strategy(bars, portfolio):
    from core.enums import OrderSide, OrderType
    from core.types import Order
    orders = []
    for symbol, df in bars.items():
        if len(df) >= 50:
            close = df["close"]
            last = float(close.iloc[-1])
            pos = portfolio.positions.get(symbol)
            if pos is None or pos.quantity == 0:
                orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=10, price=last, order_type=OrderType.MARKET))
            else:
                orders.append(Order(symbol=symbol, side=OrderSide.SELL, quantity=pos.quantity, price=last, order_type=OrderType.MARKET))
    return orders


def test_backtest_engine_runs(sample_ohlcv):
    engine = BacktestEngine(initial_capital=100_000.0, commission=0.0, slippage=0.0)
    data = {"TEST": sample_ohlcv}
    result = engine.run(dummy_strategy, data)
    assert result.total_trades > 0
    assert len(result.equity_curve) > 0
    assert result.sharpe_ratio is not None


def _hold_strategy(bars, portfolio):
    from core.enums import OrderSide, OrderType
    from core.types import Order
    orders = []
    for symbol, df in bars.items():
        last = float(df["close"].iloc[-1])
        pos = portfolio.positions.get(symbol)
        if pos is None or pos.quantity == 0:
            orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=100, price=last, order_type=OrderType.MARKET))
    return orders

def test_backtest_commission_affects_result():
    n = 100
    dates = pd.date_range("2024-01-01", periods=n, freq="d")
    close = [100.0 + i * 0.5 for i in range(n)]
    df = pd.DataFrame({
        "open": close, "high": [c + 1 for c in close],
        "low": [c - 1 for c in close], "close": close,
        "volume": [1000] * n,
    }, index=dates)
    df.attrs["symbol"] = "TEST"
    df.attrs["timeframe"] = "1d"
    data = {"TEST": df}

    engine_no_comm = BacktestEngine(initial_capital=100_000.0, commission=0.0, slippage=0.0)
    result_no_comm = engine_no_comm.run(_hold_strategy, data)

    engine_high_comm = BacktestEngine(initial_capital=100_000.0, commission=0.05, slippage=0.0)
    result_high_comm = engine_high_comm.run(_hold_strategy, data)

    assert result_no_comm.total_return > result_high_comm.total_return
