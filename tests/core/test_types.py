from __future__ import annotations

from datetime import datetime

from core.types import (
    Bar,
)


class TestBar:
    def test_to_dict(self):
        ts = datetime(2024, 1, 1, 12, 0)
        bar = Bar(symbol="AAPL", timestamp=ts, open=100.0, high=105.0, low=99.0, close=102.0, volume=10000)
        d = bar.to_dict()
        assert d["symbol"] == "AAPL"
        assert d["close"] == 102.0


class TestPortfolioState:
    def test_exposure(self, sample_portfolio):
        assert sample_portfolio.long_exposure > 0
        assert sample_portfolio.short_exposure == 0
        assert sample_portfolio.gross_exposure == sample_portfolio.long_exposure

    def test_update_price(self, sample_portfolio):
        pos = sample_portfolio.positions["AAPL"]
        pos.update_price(160.0)
        assert pos.unrealized_pnl == 1000.0  # (160-150)*100
