"""
SMA Crossover Strategy
Inspired by freqtrade sample strategy pattern.
Buys when fast SMA crosses above slow SMA.
Sells when fast SMA crosses below slow SMA.
"""
from finscript import Strategy, indicator


class SmaCross(Strategy):
    fast_period = 20
    slow_period = 50
    volume_filter = True
    volume_min = 1_000_000

    def populate_indicators(self, data):
        data["sma_fast"] = indicator.sma(data["close"], self.fast_period)
        data["sma_slow"] = indicator.sma(data["close"], self.slow_period)
        data["volume_avg"] = indicator.sma(data["volume"], 20)
        return data

    def populate_buy_trend(self, data):
        data["buy_signal"] = (
            (data["sma_fast"] > data["sma_slow"])
            & data["sma_fast"].shift(1).le(data["sma_slow"].shift(1))
        )
        if self.volume_filter:
            data["buy_signal"] &= data["volume"] > self.volume_min
            data["buy_signal"] &= data["volume"] > data["volume_avg"]
        return data

    def populate_sell_trend(self, data):
        data["sell_signal"] = (
            (data["sma_fast"] < data["sma_slow"])
            & data["sma_fast"].shift(1).ge(data["sma_slow"].shift(1))
        )
        return data
