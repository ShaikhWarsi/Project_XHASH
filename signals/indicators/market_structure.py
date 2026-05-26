from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd

from core.enums import SignalType
from signals.base import SignalEngine


@dataclass
class LocalExtreme:
    ext_type: int
    index: int
    price: float
    timestamp: pd.Timestamp
    conf_index: int
    conf_price: float
    conf_timestamp: pd.Timestamp


def extremes_sanity_checks(ext_df: pd.DataFrame) -> None:
    if len(ext_df) < 2:
        return
    assert len(ext_df[ext_df["ext_type"] == ext_df["ext_type"].shift()]) == 0
    assert ext_df["index"].diff().min() >= 0
    ext_df["last"] = ext_df["price"].shift()
    high_exts = ext_df[ext_df["ext_type"] == 1]
    assert len(high_exts[high_exts["price"] <= high_exts["last"]]) == 0
    low_exts = ext_df[ext_df["ext_type"] == -1]
    assert len(low_exts[low_exts["price"] >= low_exts["last"]]) == 0


class ATRDirectionalChange:
    def __init__(self, atr_lookback: int):
        self._up_move = True
        self._pend_max = np.nan
        self._pend_min = np.nan
        self._pend_max_i = 0
        self._pend_min_i = 0

        self._atr_lb = atr_lookback
        self._atr_sum = np.nan
        self.extremes: list[LocalExtreme] = []

    def _create_ext(
        self, ext_type: str, ext_i: int, conf_i: int,
        time_index: pd.DatetimeIndex,
        high: np.ndarray, low: np.ndarray, close: np.ndarray,
    ) -> None:
        if ext_type == "high":
            t = 1
            arr = high
        else:
            t = -1
            arr = low

        ext = LocalExtreme(
            ext_type=t, index=ext_i, price=arr[ext_i],
            timestamp=time_index[ext_i],
            conf_index=conf_i, conf_price=close[conf_i],
            conf_timestamp=time_index[conf_i],
        )
        self.extremes.append(ext)

    def update(
        self, i: int, time_index: pd.DatetimeIndex,
        high: np.ndarray, low: np.ndarray, close: np.ndarray,
    ) -> None:
        if i < self._atr_lb:
            return
        elif i == self._atr_lb:
            h_window = high[i - self._atr_lb + 1: i + 1]
            l_window = low[i - self._atr_lb + 1: i + 1]
            c_window = close[i - self._atr_lb: i]

            tr1 = h_window - l_window
            tr2 = np.abs(h_window - c_window)
            tr3 = np.abs(l_window - c_window)
            self._atr_sum = np.sum(np.max(np.stack([tr1, tr2, tr3]), axis=0))
        else:
            tr_val_curr = max(
                high[i] - low[i],
                abs(high[i] - close[i - 1]),
                abs(low[i] - close[i - 1]),
            )

            rm_i = i - self._atr_lb
            tr_val_remove = max(
                high[rm_i] - low[rm_i],
                abs(high[rm_i] - close[rm_i - 1]),
                abs(low[rm_i] - close[rm_i - 1]),
            )

            self._atr_sum += tr_val_curr
            self._atr_sum -= tr_val_remove

        atr = self._atr_sum / self._atr_lb

        if np.isnan(self._pend_max):
            self._pend_max = high[i]
            self._pend_min = low[i]
            self._pend_max_i = self._pend_min_i = i

        if self._up_move:
            if high[i] > self._pend_max:
                self._pend_max = high[i]
                self._pend_max_i = i
            elif low[i] < self._pend_max - atr:
                self._create_ext("high", self._pend_max_i, i, time_index, high, low, close)

                self._up_move = False
                self._pend_min = low[i]
                self._pend_min_i = i
        else:
            if low[i] < self._pend_min:
                self._pend_min = low[i]
                self._pend_min_i = i
            elif high[i] > self._pend_min + atr:
                self._create_ext("low", self._pend_min_i, i, time_index, high, low, close)

                self._up_move = True
                self._pend_max = high[i]
                self._pend_max_i = i


class HierarchicalExtremes:
    def __init__(self, levels: int, atr_lookback: int):
        self._base_dc = ATRDirectionalChange(atr_lookback)
        self._levels = levels

        self.extremes: list[list[LocalExtreme]] = [[] for _ in range(levels)]

    @staticmethod
    def _comparison(x: float, y: float, ext_type: int) -> bool:
        return x > y if ext_type == 1 else x < y

    def _new_ext(
        self, level: int, conf_i: int, conf_price: float,
        conf_time: pd.Timestamp, ext_type: int,
    ) -> None:
        if level >= self._levels - 1:
            return

        ext_i = len(self.extremes[level]) - 1
        new_ext = self.extremes[level][ext_i]
        assert new_ext.ext_type == ext_type

        if ext_i < 4:
            return

        prev_ext = self.extremes[level][ext_i - 2]
        assert prev_ext.ext_type == ext_type
        if not self._comparison(prev_ext.price, new_ext.price, ext_type):
            return

        prev_next_lvl = None
        if len(self.extremes[level + 1]) > 0:
            prev_next_lvl = self.extremes[level + 1][-1]
            if prev_next_lvl.ext_type != ext_type:
                if not self._comparison(prev_ext.price, prev_next_lvl.price, ext_type):
                    return

        for prior_i in range(ext_i - 4, -1, -2):
            prior = self.extremes[level][prior_i]
            assert prior.ext_type == ext_type

            if self._comparison(prior.price, prev_ext.price, ext_type):
                return

            if prev_next_lvl is not None and prior.index <= prev_next_lvl.index:
                break
            elif prior.price == prev_ext.price:
                prev_ext = prior
            elif self._comparison(prior.price, prev_ext.price, -ext_type):
                break

        new_ext = copy.copy(prev_ext)
        new_ext.conf_index = conf_i
        new_ext.conf_price = conf_price
        new_ext.conf_timestamp = conf_time

        if prev_next_lvl is not None and prev_next_lvl.ext_type == ext_type:
            upgrade_point = None
            for j in range(ext_i - 1, -1, -2):
                prior = self.extremes[level][j]
                assert prior.ext_type == -ext_type

                if prior.index >= new_ext.index:
                    continue
                if prior.index <= prev_next_lvl.index:
                    break
                if upgrade_point is None or not self._comparison(prior.price, upgrade_point.price, ext_type):
                    upgrade_point = prior

            assert upgrade_point is not None
            upgraded = copy.copy(upgrade_point)
            upgraded.conf_index = conf_i
            upgraded.conf_price = conf_price
            upgraded.conf_timestamp = conf_time
            self.extremes[level + 1].append(upgraded)
            self._new_ext(level + 1, conf_i, conf_price, conf_time, -ext_type)

        self.extremes[level + 1].append(new_ext)
        self._new_ext(level + 1, conf_i, conf_price, conf_time, ext_type)

    def update(
        self, i: int, time_index: pd.DatetimeIndex,
        high: np.ndarray, low: np.ndarray, close: np.ndarray,
    ) -> None:
        prev_len = len(self._base_dc.extremes)
        self._base_dc.update(i, time_index, high, low, close)

        if len(self._base_dc.extremes) <= prev_len:
            return

        new_ext = self._base_dc.extremes[-1]
        self.extremes[0].append(new_ext)

        self._new_ext(0, i, close[i], time_index[i], new_ext.ext_type)

    def _get_level_extreme(self, level: int, ext_type: int, lag: int = 0) -> Optional[LocalExtreme]:
        lvl = self.extremes[level]
        if not lvl:
            return None
        last_ext = lvl[-1]

        offset = 1 if last_ext.ext_type != ext_type else 0

        l2 = lag * 2
        if l2 + offset >= len(lvl):
            return None
        return lvl[-(l2 + offset + 1)]

    def get_level_high(self, level: int, lag: int = 0) -> Optional[LocalExtreme]:
        return self._get_level_extreme(level, 1, lag)

    def get_level_low(self, level: int, lag: int = 0) -> Optional[LocalExtreme]:
        return self._get_level_extreme(level, -1, lag)

    def get_level_high_price(self, level: int, lag: int = 0) -> float:
        lvl = self._get_level_extreme(level, 1, lag)
        return lvl.price if lvl is not None else np.nan

    def get_level_low_price(self, level: int, lag: int = 0) -> float:
        lvl = self._get_level_extreme(level, -1, lag)
        return lvl.price if lvl is not None else np.nan


class ATRMarketStructureEngine(SignalEngine):
    def __init__(self, atr_lookback: int = 1440, n_levels: int = 3, max_extremes_per_level: int = 500):
        super().__init__()
        self._atr_lookback = atr_lookback
        self._n_levels = n_levels
        self._max_extremes_per_level = max_extremes_per_level
        self._he = HierarchicalExtremes(n_levels, atr_lookback)
        self._last_processed = 0
        self._extremes: dict[int, list[LocalExtreme]] = {level: [] for level in range(n_levels)}
        self._symbol = ""
        self._timeframe = ""

    @property
    def signal_type(self) -> SignalType:
        return SignalType.STRUCTURE

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        self._symbol = df.attrs.get("symbol", self._symbol)
        self._timeframe = df.attrs.get("timeframe", self._timeframe)

        h = df["high"].values
        l = df["low"].values
        c = df["close"].values
        time_index = df.index
        last_price = float(c[-1])

        signals = []

        for i in range(self._last_processed, len(h)):
            prev_counts = [len(self._he.extremes[lvl]) for lvl in range(self._n_levels)]
            self._he.update(i, time_index, h, l, c)

            for level in range(self._n_levels):
                new_count = len(self._he.extremes[level])
                if new_count > prev_counts[level]:
                    for j in range(prev_counts[level], new_count):
                        ext = self._he.extremes[level][j]
                        self._extremes[level].append(ext)
                        if len(self._extremes[level]) > self._max_extremes_per_level:
                            self._extremes[level] = self._extremes[level][-self._max_extremes_per_level:]

                        direction = 1 if ext.ext_type == -1 else -1
                        level_strength = (level + 1) / self._n_levels
                        confidence = min(0.5 + 0.25 * level / max(1, self._n_levels - 1), 0.95)

                        signals.append(self._make_signal(
                            direction=direction,
                            strength=level_strength,
                            confidence=confidence,
                            level=ext.price,
                            symbol=self._symbol,
                            timeframe=self._timeframe,
                            price=last_price,
                            metadata={
                                "ms_level": level,
                                "ext_type": "high" if ext.ext_type == 1 else "low",
                                "ext_index": int(ext.index),
                                "conf_index": int(ext.conf_index),
                                "timestamp": str(ext.timestamp),
                                "conf_timestamp": str(ext.conf_timestamp),
                            },
                        ))

        self._last_processed = len(h)
        self._store_signals(signals)
        return signals

    def get_current_structure(self) -> dict:
        last_trend: Optional[str] = None
        all_extremes: list[LocalExtreme] = []
        for level in range(self._n_levels):
            all_extremes.extend(self._extremes[level])
        all_extremes.sort(key=lambda e: e.index)

        if len(all_extremes) >= 2:
            last_two = all_extremes[-2:]
            if last_two[0].ext_type == -1 and last_two[1].ext_type == 1:
                last_trend = "up"
            elif last_two[0].ext_type == 1 and last_two[1].ext_type == -1:
                last_trend = "down"

        key_levels: dict[str, list[dict]] = {"resistance": [], "support": []}
        for level in range(self._n_levels):
            for ext in reversed(self._extremes[level][-5:]):
                entry = {"price": ext.price, "level": level, "index": int(ext.index), "timestamp": str(ext.timestamp)}
                if ext.ext_type == 1:
                    if not any(abs(e["price"] - ext.price) / max(ext.price, 1e-8) < 1e-6 for e in key_levels["resistance"]):
                        key_levels["resistance"].append(entry)
                else:
                    if not any(abs(e["price"] - ext.price) / max(ext.price, 1e-8) < 1e-6 for e in key_levels["support"]):
                        key_levels["support"].append(entry)

        return {
            "trend": last_trend,
            "key_levels": key_levels,
            "extremes_count": {level: len(self._extremes[level]) for level in range(self._n_levels)},
        }

    def get_level_high(self, level: int, lag: int = 0) -> Optional[LocalExtreme]:
        return self._he.get_level_high(level, lag)

    def get_level_low(self, level: int, lag: int = 0) -> Optional[LocalExtreme]:
        return self._he.get_level_low(level, lag)

    def get_level_high_price(self, level: int, lag: int = 0) -> float:
        return self._he.get_level_high_price(level, lag)

    def get_level_low_price(self, level: int, lag: int = 0) -> float:
        return self._he.get_level_low_price(level, lag)
