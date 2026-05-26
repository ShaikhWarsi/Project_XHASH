"""
RSI Bounce Strategy
Inspired by freqtrade sample strategy pattern.
Buys when RSI oversold and price near lower Bollinger Band.
Sells when RSI overbought or price near upper Bollinger Band.
"""
from finscript import Strategy, indicator


class RsiBounce(Strategy):
    rsi_period = 14
    rsi_oversold = 30
    rsi_overbought = 70
    bb_period = 20
    bb_std = 2.0
    use_trend_filter = True
    trend_ema_period = 200

    def populate_indicators(self, data):
        data["rsi"] = indicator.rsi(data["close"], self.rsi_period)
        data["bb_mid"] = indicator.sma(data["close"], self.bb_period)
        data["bb_std"] = indicator.stddev(data["close"], self.bb_period)
        data["bb_upper"] = data["bb_mid"] + self.bb_std * data["bb_std"]
        data["bb_lower"] = data["bb_mid"] - self.bb_std * data["bb_std"]
        data["bb_width"] = (data["bb_upper"] - data["bb_lower"]) / data["bb_mid"]
        if self.use_trend_filter:
            data["trend_ema"] = indicator.ema(data["close"], self.trend_ema_period)
        return data

    def populate_buy_trend(self, data):
        conditions = (
            (data["rsi"] < self.rsi_oversold)
            & (data["close"] <= data["bb_lower"])
            & (data["bb_width"] > 0.02)
        )
        if self.use_trend_filter:
            conditions &= data["close"] > data["trend_ema"]
        data["buy_signal"] = conditions
        return data

    def populate_sell_trend(self, data):
        conditions = (
            (data["rsi"] > self.rsi_overbought)
            | (data["close"] >= data["bb_upper"])
        )
        data["sell_signal"] = conditions
        return data
