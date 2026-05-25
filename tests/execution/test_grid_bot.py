import pytest
from execution.grid_bot import GridBot


class TestGridBot:
    def setup_method(self):
        self.bot = GridBot(
            symbol="BTC/USDT",
            upper_price=70000.0,
            lower_price=50000.0,
            grid_count=10,
            total_investment=1000.0,
        )

    def test_grid_levels_count(self):
        levels = self.bot.get_grid_levels()
        assert len(levels) == 10

    def test_grid_levels_range(self):
        levels = self.bot.get_grid_levels()
        assert levels[0] == 50000.0
        assert levels[-1] == 70000.0

    def test_grid_levels_monotonic(self):
        levels = self.bot.get_grid_levels()
        for i in range(1, len(levels)):
            assert levels[i] > levels[i - 1]

    def test_status(self):
        status = self.bot.get_status()
        assert status["symbol"] == "BTC/USDT"
        assert status["grid_count"] == 10
        assert status["total_investment"] == 1000.0

    def test_adaptive_bounds_atr(self):
        self.bot._bars_since_update = self.bot.update_interval_bars
        result = self.bot.update_adaptive_bounds(current_price=60000.0, atr_value=1000.0)
        assert result is True
        assert self.bot.upper_price != 70000.0

    def test_adaptive_bounds_min_range(self):
        self.bot._bars_since_update = self.bot.update_interval_bars
        result = self.bot.update_adaptive_bounds(current_price=60000.0, atr_value=0.0)
        assert result is False

    def test_adaptive_bounds_not_ready(self):
        result = self.bot.update_adaptive_bounds(current_price=60000.0, atr_value=1000.0)
        assert result is False

    def test_waterfall_protection_high_price_triggers(self):
        adjusted = self.bot.waterfall_protection(65000.0, "buy")
        assert adjusted == 65000.0 * 0.99

    def test_waterfall_protection_triggered(self):
        adjusted = self.bot.waterfall_protection(55000.0, "buy")
        assert adjusted == 55000.0 * 0.99

    def test_waterfall_protection_sell(self):
        adjusted = self.bot.waterfall_protection(55000.0, "sell")
        assert adjusted == 55000.0 * 1.01

    def test_waterfall_protection_fills_reduce_cascade(self):
        for level in self.bot.grid_levels[9:]:
            self.bot.filled_levels[level] = "sell"
        adjusted = self.bot.waterfall_protection(55000.0, "sell")
        assert adjusted is None

    def test_on_fill(self):
        self.bot.on_fill(55000.0, "buy")
        assert 55000.0 in self.bot.filled_levels
        assert self.bot.filled_levels[55000.0] == "buy"

    def test_should_place_order(self):
        assert self.bot.should_place_order(60000.0, 55000.0) is True
        self.bot.on_fill(55000.0, "buy")
        assert self.bot.should_place_order(60000.0, 55000.0) is False

    def test_reset(self):
        self.bot.on_fill(55000.0, "buy")
        self.bot.grid_orders[55000.0] = {}
        self.bot.reset()
        assert len(self.bot.filled_levels) == 0
        assert len(self.bot.grid_orders) == 0
        assert self.bot.upper_price == 70000.0
        assert self.bot.lower_price == 50000.0

    def test_update_bounds_expansion_limit(self):
        self.bot._bars_since_update = self.bot.update_interval_bars
        self.bot.update_adaptive_bounds(current_price=60000.0, atr_value=5000.0)
        assert self.bot.upper_price <= 70000.0 * 3.0
        assert self.bot.lower_price >= 50000.0 / 3.0

    def test_should_not_place_order_above_price(self):
        assert self.bot.should_place_order(55000.0, 60000.0) is False
