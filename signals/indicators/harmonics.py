from __future__ import annotations

import pandas as pd

from core.enums import SignalType
from signals.base import SignalEngine


class HarmonicPatternEngine(SignalEngine):
    """Harmonic pattern detection (Bat, Gartley, Crab, Butterfly).
    Ported from TechnicalAnalysisAutomation/harmonic_patterns.py
    and master_strategy.py find_harmonics.
    """

    def __init__(self, err_thresh: float = 0.2):
        super().__init__()
        self.err_thresh = err_thresh

    @property
    def signal_type(self) -> SignalType:
        return SignalType.HARMONIC

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        tops, bottoms = self._directional_change(df)
        extremes = []
        for t in tops:
            extremes.append({"idx": t[1], "p": float(t[2]), "type": 1})
        for b in bottoms:
            extremes.append({"idx": b[1], "p": float(b[2]), "type": -1})
        extremes.sort(key=lambda x: x["idx"])
        if len(extremes) < 5:
            return []

        signals = []
        for i in range(4, len(extremes)):
            X, A, B, C, D = extremes[i - 4], extremes[i - 3], extremes[i - 2], extremes[i - 1], extremes[i]
            XA = abs(A["p"] - X["p"])
            AB = abs(B["p"] - A["p"])
            BC = abs(C["p"] - B["p"])
            CD = abs(D["p"] - C["p"])
            if XA == 0:
                continue
            rAB_XA = AB / XA
            rBC_AB = BC / AB
            rCD_BC = CD / BC

            points_key = [e["idx"] for e in [X, A, B, C, D]]

            # Bat: AB/XA [0.382-0.5], BC/AB [0.382-0.886], CD/BC [1.618-2.618]
            if (0.3 < rAB_XA < 0.6) and (0.3 < rBC_AB < 0.9) and (1.5 < rCD_BC < 2.7):
                signals.append(self._make_signal(
                    direction=1 if D["type"] == -1 else -1,
                    strength=0.7,
                    confidence=0.6,
                    level=float(D["p"]),
                    symbol=symbol,
                    timeframe=timeframe,
                    price=last_price,
                    metadata={"pattern": "Bat", "points": points_key},
                ))
            # Gartley: AB/XA [0.618], BC/AB [0.382-0.886], CD/BC [1.13-1.618]
            if (0.5 < rAB_XA < 0.7) and (0.3 < rBC_AB < 0.9) and (1.1 < rCD_BC < 1.7):
                signals.append(self._make_signal(
                    direction=1 if D["type"] == -1 else -1,
                    strength=0.7,
                    confidence=0.5,
                    level=float(D["p"]),
                    symbol=symbol,
                    timeframe=timeframe,
                    price=last_price,
                    metadata={"pattern": "Gartley", "points": points_key},
                ))
            # Butterfly: AB/XA [0.786], BC/AB [0.382-0.886], CD/BC [1.618-2.24]
            if (0.7 < rAB_XA < 0.9) and (0.3 < rBC_AB < 0.9) and (1.5 < rCD_BC < 2.4):
                signals.append(self._make_signal(
                    direction=1 if D["type"] == -1 else -1,
                    strength=0.7,
                    confidence=0.55,
                    level=float(D["p"]),
                    symbol=symbol,
                    timeframe=timeframe,
                    price=last_price,
                    metadata={"pattern": "Butterfly", "points": points_key},
                ))
            # Crab: AB/XA [0.382-0.618], BC/AB [0.382-0.886], CD/BC [2.618-3.618]
            if (0.3 < rAB_XA < 0.7) and (0.3 < rBC_AB < 0.9) and (2.5 < rCD_BC < 3.7):
                signals.append(self._make_signal(
                    direction=1 if D["type"] == -1 else -1,
                    strength=0.75,
                    confidence=0.5,
                    level=float(D["p"]),
                    symbol=symbol,
                    timeframe=timeframe,
                    price=last_price,
                    metadata={"pattern": "Crab", "points": points_key},
                ))
            # Deep Crab: AB/XA [0.886], BC/AB [0.382-0.886], CD/BC [2.0-3.618]
            if (0.8 < rAB_XA < 0.95) and (0.3 < rBC_AB < 0.9) and (1.9 < rCD_BC < 3.7):
                signals.append(self._make_signal(
                    direction=1 if D["type"] == -1 else -1,
                    strength=0.75,
                    confidence=0.5,
                    level=float(D["p"]),
                    symbol=symbol,
                    timeframe=timeframe,
                    price=last_price,
                    metadata={"pattern": "DeepCrab", "points": points_key},
                ))
            # Cypher: AB/XA [0.382-0.618], BC/AB [1.13-1.41], CD/BC [1.27-2.00]
            if (0.3 < rAB_XA < 0.7) and (1.0 < rBC_AB < 1.5) and (1.2 < rCD_BC < 2.1):
                signals.append(self._make_signal(
                    direction=1 if D["type"] == -1 else -1,
                    strength=0.7,
                    confidence=0.45,
                    level=float(D["p"]),
                    symbol=symbol,
                    timeframe=timeframe,
                    price=last_price,
                    metadata={"pattern": "Cypher", "points": points_key},
                ))
            # Shark: AB/XA [1.13-1.618], BC/AB [1.618-2.24], CD/BC [0.886-1.13]
            if (1.0 < rAB_XA < 1.7) and (1.5 < rBC_AB < 2.4) and (0.8 < rCD_BC < 1.2):
                signals.append(self._make_signal(
                    direction=1 if D["type"] == -1 else -1,
                    strength=0.7,
                    confidence=0.4,
                    level=float(D["p"]),
                    symbol=symbol,
                    timeframe=timeframe,
                    price=last_price,
                    metadata={"pattern": "Shark", "points": points_key},
                ))

        self._store_signals(signals)
        return self._last_signals

    def _directional_change(self, df: pd.DataFrame, sigma: float = 0.02):
        high = df["high"].values
        low = df["low"].values
        close = df["close"].values
        up_zig = True
        tmp_max = high[0]
        tmp_min = low[0]
        tmp_max_i = 0
        tmp_min_i = 0
        tops, bottoms = [], []
        for i in range(len(close)):
            if up_zig:
                if high[i] > tmp_max:
                    tmp_max = high[i]
                    tmp_max_i = i
                elif close[i] < tmp_max - tmp_max * sigma:
                    tops.append([i, tmp_max_i, tmp_max])
                    up_zig = False
                    tmp_min = low[i]
                    tmp_min_i = i
            else:
                if low[i] < tmp_min:
                    tmp_min = low[i]
                    tmp_min_i = i
                elif close[i] > tmp_min + tmp_min * sigma:
                    bottoms.append([i, tmp_min_i, tmp_min])
                    up_zig = True
                    tmp_max = high[i]
                    tmp_max_i = i
        return tops, bottoms
