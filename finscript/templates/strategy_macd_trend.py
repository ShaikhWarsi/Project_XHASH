"""
MACD + Trend Filter Strategy
Inspired by freqtrade sample strategy.
Uses MACD crossover with trend confirmation via EMAs.
"""
from finscript import Strategy, indicator


class MacdTrend(Strategy):
    macd_fast = 12
    macd_slow = 26
    macd_signal = 9
    trend_ema_short = 50
    trend_ema_long = 200
    volume_min = 500_000

    def populate_indicators(self, data):
        data["ema_fast"] = indicator.ema(data["close"], self.macd_fast)
        data["ema_slow"] = indicator.ema(data["close"], self.macd_slow)
        data["macd"] = data["ema_fast"] - data["ema_slow"]
        data["macd_signal"] = indicator.ema(data["macd"], self.macd_signal)
        data["macd_hist"] = data["macd"] - data["macd_signal"]
        data["trend_short"] = indicator.ema(data["close"], self.trend_ema_short)
        data["trend_long"] = indicator.ema(data["close"], self.trend_ema_long)
        data["volume_avg"] = indicator.sma(data["volume"], 20)
        return data

    def populate_buy_trend(self, data):
        data["buy_signal"] = (
            (data["macd"] > data["macd_signal"])
            & data["macd"].shift(1).le(data["macd_signal"].shift(1))
            & (data["trend_short"] > data["trend_long"])
            & (data["volume"] > self.volume_min)
            & (data["volume"] > data["volume_avg"])
        )
        return data

    def populate_sell_trend(self, data):
        data["sell_signal"] = (
            (data["macd"] < data["macd_signal"])
            & data["macd"].shift(1).ge(data["macd_signal"].shift(1))
        ) | (data["trend_short"] < data["trend_long"])
        return data
