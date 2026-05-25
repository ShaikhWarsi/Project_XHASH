from __future__ import annotations

from collections import deque

import pandas as pd

from core.enums import SignalType
from signals.base import SignalEngine


class PriceActionEngine(SignalEngine):
    """LuxAlgo-style price action concepts.
    Ported from price_action_concepts.py.
    """

    def __init__(self, internal_lookback: int = 5, swing_lookback: int = 50):
        super().__init__()
        self.iLen = internal_lookback
        self.sLen = swing_lookback

    @property
    def signal_type(self) -> SignalType:
        return SignalType.STRUCTURE

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        # State
        up_p, up_n, up_l = deque(), deque(), deque()
        dn_p, dn_n, dn_l = deque(), deque(), deque()
        sup_p, sup_n, sup_l = deque(), deque(), deque()
        sdn_p, sdn_n, sdn_l = deque(), deque(), deque()
        itrend, strend = 0, 0
        hN, lN = deque([0], maxlen=1), deque([0], maxlen=1)
        hS, lS = deque([0], maxlen=1), deque([0], maxlen=1)

        signals = []

        # Precompute pivot masks
        def get_pivots(src, left, right, is_high=True):
            window = left + right + 1
            if is_high:
                peaks = src.rolling(window=window, center=True).max() == src
            else:
                peaks = src.rolling(window=window, center=True).min() == src
            return peaks.shift(right).fillna(False)

        iH = get_pivots(df["high"], self.iLen, self.iLen, True)
        iL = get_pivots(df["low"], self.iLen, self.iLen, False)
        sH = get_pivots(df["high"], self.sLen, self.sLen, True)
        sL = get_pivots(df["low"], self.sLen, self.sLen, False)

        for i in range(len(df)):
            row = df.iloc[i]
            close = row["close"]
            prev_close = df["close"].iloc[i - 1] if i > 0 else close

            # Internal pivots
            if iH.iloc[i]:
                val = float(df["high"].iloc[i - self.iLen])
                up_p.appendleft(val)
                up_l.appendleft(val)
                up_n.appendleft(i - self.iLen)
                hN.appendleft(i - self.iLen)
            if iL.iloc[i]:
                val = float(df["low"].iloc[i - self.iLen])
                dn_p.appendleft(val)
                dn_l.appendleft(val)
                dn_n.appendleft(i - self.iLen)
                lN.appendleft(i - self.iLen)
            if sH.iloc[i]:
                val = float(df["high"].iloc[i - self.sLen])
                sup_p.appendleft(val)
                sup_l.appendleft(val)
                sup_n.appendleft(i - self.sLen)
                hS.appendleft(i - self.sLen)
            if sL.iloc[i]:
                val = float(df["low"].iloc[i - self.sLen])
                sdn_p.appendleft(val)
                sdn_l.appendleft(val)
                sdn_n.appendleft(i - self.sLen)
                lS.appendleft(i - self.sLen)

            # Internal BOS/CHoCH
            if len(up_p) > 0 and len(dn_l) > 1:
                level = up_p[0]
                if prev_close <= level and close > level:
                    is_choch = itrend < 0
                    signals.append(self._make_signal(
                        direction=1,
                        strength=0.6,
                        confidence=0.5,
                        level=level,
                        symbol=symbol,
                        timeframe=timeframe,
                        price=close,
                        metadata={"type": "CHoCH" if is_choch else "BOS", "scale": "internal"},
                    ))
                    itrend = 1
                    up_p.clear()
                    up_n.clear()

            if len(dn_p) > 0 and len(up_l) > 1:
                level = dn_p[0]
                if prev_close >= level and close < level:
                    is_choch = itrend > 0
                    signals.append(self._make_signal(
                        direction=-1,
                        strength=0.6,
                        confidence=0.5,
                        level=level,
                        symbol=symbol,
                        timeframe=timeframe,
                        price=close,
                        metadata={"type": "CHoCH" if is_choch else "BOS", "scale": "internal"},
                    ))
                    itrend = -1
                    dn_p.clear()
                    dn_n.clear()

            # Swing BOS/CHoCH
            if len(sup_p) > 0 and len(sdn_l) > 1:
                level = sup_p[0]
                if prev_close <= level and close > level:
                    is_choch = strend < 0
                    signals.append(self._make_signal(
                        direction=1,
                        strength=0.7,
                        confidence=0.6,
                        level=level,
                        symbol=symbol,
                        timeframe=timeframe,
                        price=close,
                        metadata={"type": "CHoCH" if is_choch else "BOS", "scale": "swing"},
                    ))
                    strend = 1
                    sup_p.clear()
                    sup_n.clear()

            if len(sdn_p) > 0 and len(sup_l) > 1:
                level = sdn_p[0]
                if prev_close >= level and close < level:
                    is_choch = strend > 0
                    signals.append(self._make_signal(
                        direction=-1,
                        strength=0.7,
                        confidence=0.6,
                        level=level,
                        symbol=symbol,
                        timeframe=timeframe,
                        price=close,
                        metadata={"type": "CHoCH" if is_choch else "BOS", "scale": "swing"},
                    ))
                    strend = -1
                    sdn_p.clear()
                    sdn_n.clear()

        self._store_signals(signals)
        return self._last_signals
