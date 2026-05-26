"""
ML Ensemble Strategy Template
Combines multiple signal sources into a weighted ensemble score.
Uses finscript scoring system for position sizing.
"""
from finscript import Strategy, indicator


class MlEnsemble(Strategy):
    rsi_period = 14
    macd_fast = 12
    macd_slow = 26
    macd_signal = 9
    bb_period = 20
    bb_std = 2.0

    score_weights = {
        "rsi": 0.2,
        "macd": 0.25,
        "bb": 0.15,
        "volume": 0.15,
        "trend": 0.25,
    }

    min_score = 0.6
    max_position_pct = 0.95

    def populate_indicators(self, data):
        data["rsi"] = indicator.rsi(data["close"], self.rsi_period)
        data["ema_fast"] = indicator.ema(data["close"], self.macd_fast)
        data["ema_slow"] = indicator.ema(data["close"], self.macd_slow)
        data["macd_line"] = data["ema_fast"] - data["ema_slow"]
        data["macd_signal_line"] = indicator.ema(data["macd_line"], self.macd_signal)
        data["macd_hist"] = data["macd_line"] - data["macd_signal_line"]
        data["bb_mid"] = indicator.sma(data["close"], self.bb_period)
        data["bb_stddev"] = indicator.stddev(data["close"], self.bb_period)
        data["bb_upper"] = data["bb_mid"] + self.bb_std * data["bb_stddev"]
        data["bb_lower"] = data["bb_mid"] - self.bb_std * data["bb_stddev"]
        data["bb_position"] = (data["close"] - data["bb_lower"]) / (data["bb_upper"] - data["bb_lower"])
        data["volume_sma"] = indicator.sma(data["volume"], 20)
        data["volume_ratio"] = data["volume"] / data["volume_sma"]
        data["trend_ema"] = indicator.ema(data["close"], 200)
        data["trend_strength"] = (data["close"] - data["trend_ema"]) / data["trend_ema"]
        return data

    def score_rsi(self, data):
        rsi = data["rsi"]
        score = ((100 - rsi) / 100).clip(0, 1)
        score[rsi.between(40, 60)] = 0.3
        return score

    def score_macd(self, data):
        hist = data["macd_hist"]
        hist_norm = hist / hist.abs().rolling(50).mean()
        return (hist_norm > 0).astype(float) * hist_norm.clip(0, 1)

    def score_bb(self, data):
        pos = data["bb_position"]
        return (1 - pos).clip(0, 1)

    def score_volume(self, data):
        ratio = data["volume_ratio"]
        return ratio.clip(0, 2) / 2

    def score_trend(self, data):
        strength = data["trend_strength"]
        return strength.clip(-0.1, 0.1).add(0.1) / 0.2

    def populate_buy_trend(self, data):
        weights = self.score_weights
        data["ensemble_score"] = (
            weights["rsi"] * self.score_rsi(data)
            + weights["macd"] * self.score_macd(data)
            + weights["bb"] * self.score_bb(data)
            + weights["volume"] * self.score_volume(data)
            + weights["trend"] * self.score_trend(data)
        )
        data["buy_signal"] = data["ensemble_score"] >= self.min_score
        data["position_size"] = (data["ensemble_score"] * self.max_position_pct).clip(0, 1)
        return data

    def populate_sell_trend(self, data):
        data["sell_signal"] = data["ensemble_score"] < self.min_score * 0.5
        return data
