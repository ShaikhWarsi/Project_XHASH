"""Example: SuperTrend indicator calculation"""
import pandas as pd
import numpy as np


def supertrend(df, period=10, multiplier=3):
    hl = (df["high"] + df["low"]) / 2
    atr = df["high"].rolling(period).max() - df["low"].rolling(period).min()
    atr = atr.rolling(period).mean()

    upper_band = hl + multiplier * atr
    lower_band = hl - multiplier * atr

    supertrend = np.full(len(df), np.nan)
    direction = np.full(len(df), np.nan)

    for i in range(period, len(df)):
        if i == period:
            supertrend[i] = upper_band[i]
            direction[i] = 1
        else:
            prev_close = df["close"].iloc[i - 1]
            prev_supertrend = supertrend[i - 1]

            if prev_supertrend <= prev_close:
                supertrend[i] = max(upper_band[i], prev_supertrend)
                direction[i] = 1
            else:
                supertrend[i] = min(lower_band[i], prev_supertrend)
                direction[i] = -1

    return supertrend, direction


if __name__ == "__main__":
    data = {
        "high": [110, 112, 115, 113, 116, 118, 120, 119, 122, 125],
        "low": [105, 108, 110, 109, 112, 114, 115, 116, 118, 120],
        "close": [108, 111, 114, 112, 115, 117, 119, 118, 121, 124],
    }
    df = pd.DataFrame(data)
    st, direction = supertrend(df)
    df["supertrend"] = st
    df["direction"] = direction
    print(df)
