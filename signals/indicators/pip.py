from __future__ import annotations

import numpy as np
import pandas as pd

from core.enums import SignalType
from signals.base import SignalEngine


def find_pips(data: np.ndarray, n_pips: int, dist_measure: int = 3):
    """Find perceptually important points (PIPs) in a price series."""
    pips_x = [0, len(data) - 1]
    pips_y = [float(data[0]), float(data[-1])]

    for curr_point in range(2, n_pips):
        md = 0.0
        md_i = -1
        insert_index = -1

        for k in range(curr_point - 1):
            left_adj = k
            right_adj = k + 1

            time_diff = pips_x[right_adj] - pips_x[left_adj]
            if time_diff == 0:
                continue
            price_diff = pips_y[right_adj] - pips_y[left_adj]
            slope = price_diff / time_diff
            intercept = pips_y[left_adj] - pips_x[left_adj] * slope

            for i in range(pips_x[left_adj] + 1, pips_x[right_adj]):
                if dist_measure == 1:
                    d = ((pips_x[left_adj] - i) ** 2 + (pips_y[left_adj] - data[i]) ** 2) ** 0.5
                    d += ((pips_x[right_adj] - i) ** 2 + (pips_y[right_adj] - data[i]) ** 2) ** 0.5
                elif dist_measure == 2:
                    d = abs((slope * i + intercept) - data[i]) / (slope ** 2 + 1) ** 0.5
                else:
                    d = abs((slope * i + intercept) - data[i])

                if d > md:
                    md = d
                    md_i = i
                    insert_index = right_adj

        pips_x.insert(insert_index, md_i)
        pips_y.insert(insert_index, float(data[md_i]))

    return np.array(pips_x), np.array(pips_y)


class PIPEngine(SignalEngine):
    """Detects perceptually important points (PIPs) as structural extremes."""

    def __init__(self, n_pips: int = 10, dist_measure: int = 3):
        super().__init__()
        self.n_pips = n_pips
        self.dist_measure = dist_measure

    @property
    def signal_type(self) -> SignalType:
        return SignalType.STRUCTURE

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        close = np.log(df["close"].values)
        pips_x, pips_y = find_pips(close, self.n_pips, self.dist_measure)

        if len(pips_x) < 3:
            return []

        signals = []
        for i in range(1, len(pips_x) - 1):
            prev, curr, next_ = pips_y[i - 1], pips_y[i], pips_y[i + 1]
            is_high = curr > prev and curr > next_
            is_low = curr < prev and curr < next_

            if is_high:
                signals.append(self._make_signal(
                    direction=-1,
                    strength=0.6,
                    confidence=0.6,
                    price=last_price,
                    level=float(np.exp(curr)),
                    symbol=symbol,
                    timeframe=timeframe,
                    metadata={"pip_type": "high", "index": int(pips_x[i])},
                ))
            elif is_low:
                signals.append(self._make_signal(
                    direction=1,
                    strength=0.6,
                    confidence=0.6,
                    price=last_price,
                    level=float(np.exp(curr)),
                    symbol=symbol,
                    timeframe=timeframe,
                    metadata={"pip_type": "low", "index": int(pips_x[i])},
                ))

        self._store_signals(signals)
        return self._last_signals
