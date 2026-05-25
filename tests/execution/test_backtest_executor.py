from __future__ import annotations

from core.enums import OrderSide, OrderType
from core.types import Order
from execution.backtest import BacktestExecutor


class TestBacktestExecutor:
    def test_submit_market_order(self):
        ex = BacktestExecutor(slippage=0.001, commission=0.001)
        ex.connect()
        order = Order(symbol="AAPL", side=OrderSide.BUY, quantity=100, price=150.0, order_type=OrderType.MARKET)
        fill = ex.submit_order(order)
        assert fill is not None
        assert fill.symbol == "AAPL"
        assert fill.quantity == 100
        assert fill.price > 0
        assert fill.order_id.startswith("BT-")

    def test_submit_and_check_portfolio(self):
        ex = BacktestExecutor(slippage=0.0, commission=0.0)
        ex.connect()
        order = Order(symbol="AAPL", side=OrderSide.BUY, quantity=100, price=150.0, order_type=OrderType.MARKET)
        ex.submit_order(order)
        portfolio = ex.get_portfolio()
        assert len(portfolio.positions) == 1
        assert portfolio.positions["AAPL"].quantity == 100
        assert portfolio.positions["AAPL"].entry_price == 150.0

    def test_sell_reduces_position(self):
        ex = BacktestExecutor(slippage=0.0, commission=0.0)
        ex.connect()
        ex.submit_order(Order(symbol="AAPL", side=OrderSide.BUY, quantity=100, price=150.0, order_type=OrderType.MARKET))
        ex.submit_order(Order(symbol="AAPL", side=OrderSide.SELL, quantity=50, price=160.0, order_type=OrderType.MARKET))
        portfolio = ex.get_portfolio()
        assert portfolio.positions["AAPL"].quantity == 50
        assert portfolio.positions["AAPL"].realized_pnl == 500.0  # 50 * (160-150)

    def test_apply_slippage_buy(self):
        ex = BacktestExecutor(slippage=0.01, commission=0.0)
        ex.connect()
        order = Order(symbol="AAPL", side=OrderSide.BUY, quantity=100, price=100.0, order_type=OrderType.MARKET)
        fill = ex.submit_order(order)
        assert fill.price == 101.0  # 100 * 1.01

    def test_apply_slippage_sell(self):
        ex = BacktestExecutor(slippage=0.01, commission=0.0)
        ex.connect()
        order = Order(symbol="AAPL", side=OrderSide.SELL, quantity=100, price=100.0, order_type=OrderType.MARKET)
        fill = ex.submit_order(order)
        assert fill.price == 99.0  # 100 * 0.99
