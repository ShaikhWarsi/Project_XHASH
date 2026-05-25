import pytest
from execution.exchanges.signal_to_order import (
    normalize_symbol,
    signal_to_sides,
    quote_amount_from_base_qty,
)
from execution.exchanges.base import LiveTradingError


class TestSignalToOrder:
    def test_normalize_standard(self):
        assert normalize_symbol("BTC/USDT") == "BTC/USDT"

    def test_normalize_clean(self):
        assert normalize_symbol("BTCUSDT") == "BTC/USDT"

    def test_normalize_with_colon(self):
        assert normalize_symbol("BTC/USDT:USDT") == "BTC/USDT"

    def test_normalize_bare_symbol(self):
        assert normalize_symbol("PI") == "PI/USDT"

    def test_normalize_eth(self):
        assert normalize_symbol("ETHUSD") == "ETH/USD"

    def test_normalize_empty(self):
        assert normalize_symbol("") == ""

    def test_signal_open_long(self):
        side, pos_side, reduce_only = signal_to_sides("open_long")
        assert side == "buy"
        assert pos_side == "long"
        assert reduce_only is False

    def test_signal_add_long(self):
        side, pos_side, reduce_only = signal_to_sides("add_long")
        assert side == "buy"

    def test_signal_open_short(self):
        side, pos_side, reduce_only = signal_to_sides("open_short")
        assert side == "sell"
        assert pos_side == "short"

    def test_signal_close_long(self):
        side, pos_side, reduce_only = signal_to_sides("close_long")
        assert side == "sell"
        assert pos_side == "long"
        assert reduce_only is True

    def test_signal_close_short(self):
        side, pos_side, reduce_only = signal_to_sides("close_short")
        assert side == "buy"
        assert pos_side == "short"
        assert reduce_only is True

    def test_signal_reduce_long(self):
        side, pos_side, reduce_only = signal_to_sides("reduce_long")
        assert side == "sell"
        assert reduce_only is True

    def test_invalid_signal(self):
        with pytest.raises(LiveTradingError):
            signal_to_sides("invalid_signal")

    def test_quote_amount_zero(self):
        assert quote_amount_from_base_qty(None, symbol="BTC/USDT", base_qty=0) == 0.0
