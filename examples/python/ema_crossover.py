"""Example: EMA crossover strategy logic"""
import pandas as pd
import numpy as np


def ema_crossover_strategy(df, fast_period=9, slow_period=21):
    df = df.copy()
    df["ema_fast"] = df["close"].ewm(span=fast_period, adjust=False).mean()
    df["ema_slow"] = df["close"].ewm(span=slow_period, adjust=False).mean()
    df["signal"] = 0
    df.loc[df["ema_fast"] > df["ema_slow"], "signal"] = 1
    df.loc[df["ema_fast"] <= df["ema_slow"], "signal"] = -1
    df["position"] = df["signal"].diff()
    return df


if __name__ == "__main__":
    np.random.seed(42)
    prices = 100 + np.cumsum(np.random.randn(100))
    df = pd.DataFrame({"close": prices})
    result = ema_crossover_strategy(df)
    buys = result[result["position"] == 2]
    sells = result[result["position"] == -2]
    print(f"Buy signals: {len(buys)}, Sell signals: {len(sells)}")
    print(result.tail())
