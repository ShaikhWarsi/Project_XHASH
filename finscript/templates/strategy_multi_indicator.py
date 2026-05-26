"""
Multi-Indicator Confluence Strategy
Requires alignment across RSI, MACD, and volume for higher conviction.
"""
from finscript import Strategy, indicator


class MultiIndicator(Strategy):
    rsi_period = 14
    rsi_buy_threshold = 40
    rsi_sell_threshold = 60
    macd_fast = 12
    macd_slow = 26
    macd_signal = 9
    volume_surge_min = 1.5
    atr_period = 14
    atr_multiplier = 1.5

    def populate_indicators(self, data):
        data["rsi"] = indicator.rsi(data["close"], self.rsi_period)
        data["ema_fast"] = indicator.ema(data["close"], self.macd_fast)
        data["ema_slow"] = indicator.ema(data["close"], self.macd_slow)
        data["macd"] = data["ema_fast"] - data["ema_slow"]
        data["macd_signal"] = indicator.ema(data["macd"], self.macd_signal)
        data["macd_hist"] = data["macd"] - data["macd_signal"]
        data["volume_sma"] = indicator.sma(data["volume"], 20)
        data["volume_ratio"] = data["volume"] / data["volume_sma"]
        data["atr"] = indicator.atr(data, self.atr_period)
        data["upper_wick"] = data["high"] - (data["close"] + data["open"]) / 2
        data["lower_wick"] = (data["close"] + data["open"]) / 2 - data["low"]
        return data

    def populate_buy_trend(self, data):
        macd_bullish = (
            (data["macd"] > data["macd_signal"])
            & data["macd"].shift(1).le(data["macd_signal"].shift(1))
        )
        rsi_rising = (
            (data["rsi"] > self.rsi_buy_threshold)
            & (data["rsi"] > data["rsi"].shift(1))
        )
        volume_surge = data["volume_ratio"] > self.volume_surge_min
        wick_signal = data["lower_wick"] > self.atr_multiplier * data["atr"]

        data["buy_signal"] = macd_bullish & rsi_rising & (volume_surge | wick_signal)
        return data

    def populate_sell_trend(self, data):
        macd_bearish = (
            (data["macd"] < data["macd_signal"])
            & data["macd"].shift(1).ge(data["macd_signal"].shift(1))
        )
        rsi_falling = data["rsi"] > self.rsi_sell_threshold
        volume_exhaustion = data["volume_ratio"] < 0.5

        data["sell_signal"] = macd_bearish | (rsi_falling & volume_exhaustion)
        return data
