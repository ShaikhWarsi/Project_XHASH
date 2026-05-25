from __future__ import annotations

import numpy as np
import pandas as pd

from core.enums import SignalType
from core.types import Bar
from signals.base import SignalEngine


class MarketStructureEngine(SignalEngine):
    """BOS/CHoCH detection from swing highs/lows.
    Ported from smc_analysis.py _bos_choch_local + _swing_highs_lows_local.
    """

    def __init__(self, swing_length: int = 50):
        super().__init__()
        self.swing_length = swing_length

    @property
    def signal_type(self) -> SignalType:
        return SignalType.BOS

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        swings = self._swing_highs_lows(df)
        bos_choch = self._bos_choch(df, swings)
        signals = []

        for i in range(len(bos_choch)):
            row = bos_choch.iloc[i]
            if row["BOS"] == 0 and row["CHOCH"] == 0:
                continue
            bos_val = row["BOS"] if row["BOS"] != 0 else row["CHOCH"]
            level = float(row["Level"])
            if level == 0:
                continue
            is_bull = bos_val > 0
            is_choch = row["CHOCH"] != 0
            signals.append(self._make_signal(
                direction=1 if is_bull else -1,
                strength=0.7 if not is_choch else 0.8,
                confidence=0.7,
                level=level,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                metadata={"type": "CHOCH" if is_choch else "BOS", "is_bull": is_bull},
            ))

        self._store_signals(signals)
        return self._last_signals

    def _swing_highs_lows(self, ohlc: pd.DataFrame) -> pd.DataFrame:
        sl = self.swing_length * 2
        swing = np.where(
            ohlc["high"] == ohlc["high"].shift(-(sl // 2)).rolling(sl).max(), 1,
            np.where(ohlc["low"] == ohlc["low"].shift(-(sl // 2)).rolling(sl).min(), -1, np.nan),
        )
        while True:
            positions = np.where(~np.isnan(swing))[0]
            if len(positions) < 2:
                break
            current = swing[positions[:-1]]
            nxt = swing[positions[1:]]
            highs = ohlc["high"].iloc[positions[:-1]].values
            lows = ohlc["low"].iloc[positions[:-1]].values
            nh = ohlc["high"].iloc[positions[1:]].values
            nl = ohlc["low"].iloc[positions[1:]].values
            remove = np.zeros(len(positions), dtype=bool)
            ch = (current == 1) & (nxt == 1)
            remove[:-1] |= ch & (highs < nh)
            remove[1:] |= ch & (highs >= nh)
            cl = (current == -1) & (nxt == -1)
            remove[:-1] |= cl & (lows > nl)
            remove[1:] |= cl & (lows <= nl)
            if not remove.any():
                break
            swing[positions[remove]] = np.nan
        level = np.where(~np.isnan(swing), np.where(swing == 1, ohlc["high"], ohlc["low"]), np.nan)
        return pd.DataFrame({"HighLow": swing, "Level": level}, index=ohlc.index)

    def _bos_choch(self, ohlc: pd.DataFrame, swings: pd.DataFrame) -> pd.DataFrame:
        level_order, hl_order = [], []
        bos = np.zeros(len(ohlc), dtype=np.int32)
        choch = np.zeros(len(ohlc), dtype=np.int32)
        level = np.zeros(len(ohlc), dtype=np.float32)
        last_positions = []

        for i in range(len(swings)):
            if np.isnan(swings["HighLow"].iloc[i]):
                continue
            level_order.append(swings["Level"].iloc[i])
            hl_order.append(swings["HighLow"].iloc[i])
            if len(level_order) >= 4:
                if len(last_positions) >= 2:
                    bos[last_positions[-2]] = self._check_bos(hl_order[-4:], level_order[-4:])
                    choch[last_positions[-2]] = self._check_choch(hl_order[-4:], level_order[-4:])
                    if bos[last_positions[-2]] != 0 or choch[last_positions[-2]] != 0:
                        level[last_positions[-2]] = level_order[-3]
            last_positions.append(i)

        broken = self._check_broken(ohlc, bos, choch, level)
        for k in np.where(np.logical_or(bos != 0, choch != 0))[0]:
            if broken[k] == 0:
                bos[k] = choch[k] = 0
                level[k] = 0
        bos = np.where(bos != 0, bos, 0)
        choch = np.where(choch != 0, choch, 0)
        return pd.DataFrame({"BOS": bos, "CHOCH": choch, "Level": level, "BrokenIndex": broken})

    def _check_bos(self, hl: list, levels: list) -> int:
        if hl == [-1, 1, -1, 1] and levels[0] < levels[1] < levels[2] < levels[3]:
            return 1
        if hl == [1, -1, 1, -1] and levels[0] > levels[1] > levels[2] > levels[3]:
            return -1
        return 0

    def _check_choch(self, hl: list, levels: list) -> int:
        if hl == [-1, 1, -1, 1] and levels[2] < levels[0] < levels[1] < levels[3]:
            return 1
        if hl == [1, -1, 1, -1] and levels[2] > levels[0] > levels[1] > levels[3]:
            return -1
        return 0

    def _check_broken(self, ohlc, bos, choch, level) -> np.ndarray:
        broken = np.zeros(len(ohlc), dtype=np.int32)
        for i in np.where(np.logical_or(bos != 0, choch != 0))[0]:
            if bos[i] > 0 or choch[i] > 0:
                mask = ohlc["close"].iloc[i + 2:].values > level[i]
            elif bos[i] < 0 or choch[i] < 0:
                mask = ohlc["close"].iloc[i + 2:].values < level[i]
            else:
                continue
            if np.any(mask):
                broken[i] = int(np.argmax(mask)) + i + 2
        return broken

    def update(self, bar: Bar) -> list:
        return self._last_signals


class LiquidityEngine(SignalEngine):
    """Liquidity detection from swing highs/lows.
    Ported from smc_analysis.py _liquidity_local.
    """

    def __init__(self, range_percent: float = 0.01):
        super().__init__()
        self.range_percent = range_percent

    @property
    def signal_type(self) -> SignalType:
        return SignalType.LIQUIDITY

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = df["close"].iloc[-1] if len(df) > 0 else 0

        sl = 50
        swings = MarketStructureEngine(swing_length=sl)._swing_highs_lows(df)
        shl = swings.copy()
        n = len(df)
        pip_range = (df["high"].max() - df["low"].min()) * self.range_percent
        ohlc_high = df["high"].values
        ohlc_low = df["low"].values
        shl_HL = shl["HighLow"].values.copy()
        shl_Level = shl["Level"].values.copy()

        liquidity = np.full(n, np.nan)
        sweep = np.full(n, np.nan)

        for i in np.nonzero(shl_HL == 1)[0]:
            if shl_HL[i] != 1:
                continue
            hl = shl_Level[i]
            rl, rh = hl - pip_range, hl + pip_range
            group = [hl]
            swept = 0
            if i + 1 < n:
                cond = ohlc_high[i + 1:] >= rh
                if np.any(cond):
                    swept = i + 1 + int(np.argmax(cond))
            for j in np.nonzero(shl_HL == 1)[0]:
                if j <= i:
                    continue
                if swept and j >= swept:
                    break
                if shl_HL[j] == 1 and rl <= shl_Level[j] <= rh:
                    group.append(shl_Level[j])
                    shl_HL[j] = 0
            if len(group) > 1:
                liquidity[i] = 1
                sweep[i] = swept

        for i in np.nonzero(shl_HL == -1)[0]:
            if shl_HL[i] != -1:
                continue
            ll = shl_Level[i]
            rl, rh = ll - pip_range, ll + pip_range
            group = [ll]
            swept = 0
            if i + 1 < n:
                cond = ohlc_low[i + 1:] <= rl
                if np.any(cond):
                    swept = i + 1 + int(np.argmax(cond))
            for j in np.nonzero(shl_HL == -1)[0]:
                if j <= i:
                    continue
                if swept and j >= swept:
                    break
                if shl_HL[j] == -1 and rl <= shl_Level[j] <= rh:
                    group.append(shl_Level[j])
                    shl_HL[j] = 0
            if len(group) > 1:
                liquidity[i] = -1
                sweep[i] = swept

        signals = []
        for i in range(n):
            if not np.isnan(liquidity[i]):
                is_bull = liquidity[i] == 1
                signals.append(self._make_signal(
                    direction=1 if is_bull else -1,
                    strength=0.5,
                    confidence=0.5,
                    level=float(shl_Level[i]),
                    symbol=symbol,
                    timeframe=timeframe,
                    price=last_price,
                    metadata={"type": "bullish_liquidity" if is_bull else "bearish_liquidity", "swept_idx": int(sweep[i]) if not np.isnan(sweep[i]) else None},
                ))
        self._store_signals(signals)
        return self._last_signals
