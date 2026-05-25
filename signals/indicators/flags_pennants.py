from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from core.enums import SignalType
from signals.base import SignalEngine


@dataclass
class FlagPattern:
    base_x: int
    base_y: float
    tip_x: int = -1
    tip_y: float = -1.0
    conf_x: int = -1
    conf_y: float = -1.0
    pennant: bool = False
    flag_width: int = -1
    flag_height: float = -1.0
    pole_width: int = -1
    pole_height: float = -1.0
    support_intercept: float = -1.0
    support_slope: float = -1.0
    resist_intercept: float = -1.0
    resist_slope: float = -1.0


class FlagsPennantsEngine(SignalEngine):
    def __init__(self, order: int = 12, method: str = "pips"):
        super().__init__()
        self.order = order
        self.method = method

    @property
    def signal_type(self) -> SignalType:
        return SignalType.FLAGS_PENNANTS

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = float(df["close"].iloc[-1]) if len(df) > 0 else 0.0

        data = np.log(df["close"].values)

        if self.method == "trendline":
            bull_flags, bear_flags, bull_pennants, bear_pennants = self._find_flags_pennants_trendline(data)
        else:
            bull_flags, bear_flags, bull_pennants, bear_pennants = self._find_flags_pennants_pips(data)

        signals = []
        for pat in bull_flags:
            signals.append(self._make_signal(
                direction=1,
                strength=self._strength_from_pattern(pat),
                confidence=0.6,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                level=float(pat.conf_y),
                metadata=self._meta_from_pattern(pat, "bull_flag"),
            ))
        for pat in bear_flags:
            signals.append(self._make_signal(
                direction=-1,
                strength=self._strength_from_pattern(pat),
                confidence=0.6,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                level=float(pat.conf_y),
                metadata=self._meta_from_pattern(pat, "bear_flag"),
            ))
        for pat in bull_pennants:
            signals.append(self._make_signal(
                direction=1,
                strength=self._strength_from_pattern(pat),
                confidence=0.65,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                level=float(pat.conf_y),
                metadata=self._meta_from_pattern(pat, "bull_pennant"),
            ))
        for pat in bear_pennants:
            signals.append(self._make_signal(
                direction=-1,
                strength=self._strength_from_pattern(pat),
                confidence=0.65,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                level=float(pat.conf_y),
                metadata=self._meta_from_pattern(pat, "bear_pennant"),
            ))

        self._store_signals(signals)
        return signals

    @staticmethod
    def _strength_from_pattern(pat: FlagPattern) -> float:
        if pat.pole_height > 0 and pat.flag_width > 0:
            ratio = min(pat.flag_height / pat.pole_height, 1.0)
            return 1.0 - ratio * 0.6
        return 0.5

    @staticmethod
    def _meta_from_pattern(pat: FlagPattern, pattern_type: str) -> dict:
        return {
            "type": pattern_type,
            "pennant": pat.pennant,
            "flag_width": int(pat.flag_width),
            "flag_height": float(pat.flag_height),
            "pole_width": int(pat.pole_width),
            "pole_height": float(pat.pole_height),
            "support_slope": float(pat.support_slope),
            "resist_slope": float(pat.resist_slope),
        }

    def _rw_top(self, data: np.ndarray, i: int, order: int) -> bool:
        if i < order * 2 + 1:
            return False
        top = True
        k = i - order
        v = data[k]
        for o in range(1, order + 1):
            if data[k + o] > v or data[k - o] > v:
                top = False
                break
        return top

    def _rw_bottom(self, data: np.ndarray, i: int, order: int) -> bool:
        if i < order * 2 + 1:
            return False
        bottom = True
        k = i - order
        v = data[k]
        for o in range(1, order + 1):
            if data[k + o] < v or data[k - o] < v:
                bottom = False
                break
        return bottom

    def _find_pips(self, data: np.ndarray, n_pips: int, min_distance: int) -> tuple[np.ndarray, np.ndarray]:
        indices = [0, len(data) - 1]
        for _ in range(n_pips - 2):
            max_dist = -1.0
            max_idx = -1
            for j in range(1, len(indices)):
                left = indices[j - 1]
                right = indices[j]
                for k in range(left + min_distance, right - min_distance + 1):
                    if k in indices:
                        continue
                    d = abs(np.polyval(np.polyfit([left, right], [data[left], data[right]], 1), k) - data[k])
                    if d > max_dist:
                        max_dist = d
                        max_idx = k
            if max_idx == -1:
                break
            indices.append(max_idx)
            indices.sort()
        return np.array(indices), data[indices]

    def _check_bear_pattern_pips(self, pending: FlagPattern, data: np.ndarray, i: int) -> bool:
        order = self.order
        data_slice = data[pending.base_x:i + 1]
        min_i = data_slice.argmin() + pending.base_x

        if i - min_i < max(5, order * 0.5):
            return False

        pole_width = min_i - pending.base_x
        flag_width = i - min_i
        if flag_width > pole_width * 0.5:
            return False

        pole_height = pending.base_y - data[min_i]
        flag_height = data[min_i:i + 1].max() - data[min_i]
        if flag_height > pole_height * 0.5:
            return False

        pips_x, pips_y = self._find_pips(data[min_i:i + 1], 5, 3)
        if len(pips_y) < 5:
            return False

        if not (pips_y[2] < pips_y[1] and pips_y[2] < pips_y[3]):
            return False

        support_rise = pips_y[2] - pips_y[0]
        support_run = pips_x[2] - pips_x[0]
        support_slope = support_rise / support_run if support_run != 0 else 0.0
        support_intercept = pips_y[0]

        resist_rise = pips_y[3] - pips_y[1]
        resist_run = pips_x[3] - pips_x[1]
        resist_slope = resist_rise / resist_run if resist_run != 0 else 0.0
        resist_intercept = pips_y[1] + (pips_x[0] - pips_x[1]) * resist_slope

        if resist_slope != support_slope:
            intersection = (support_intercept - resist_intercept) / (resist_slope - support_slope)
        else:
            intersection = -flag_width * 100

        if intersection <= pips_x[4] and intersection >= 0:
            return False

        support_endpoint = pips_y[0] + support_slope * pips_x[4]
        if pips_y[4] > support_endpoint:
            return False

        if intersection < 0 and intersection > -flag_width:
            return False

        if resist_slope < 0:
            pending.pennant = True
        else:
            pending.pennant = False

        pending.tip_x = min_i
        pending.tip_y = data[min_i]
        pending.conf_x = i
        pending.conf_y = data[i]
        pending.flag_width = flag_width
        pending.flag_height = flag_height
        pending.pole_width = pole_width
        pending.pole_height = pole_height
        pending.support_slope = support_slope
        pending.support_intercept = support_intercept
        pending.resist_slope = resist_slope
        pending.resist_intercept = resist_intercept

        return True

    def _check_bull_pattern_pips(self, pending: FlagPattern, data: np.ndarray, i: int) -> bool:
        order = self.order
        data_slice = data[pending.base_x:i + 1]
        max_i = data_slice.argmax() + pending.base_x
        pole_width = max_i - pending.base_x

        if i - max_i < max(5, order * 0.5):
            return False

        flag_width = i - max_i
        if flag_width > pole_width * 0.5:
            return False

        pole_height = data[max_i] - pending.base_y
        flag_height = data[max_i] - data[max_i:i + 1].min()
        if flag_height > pole_height * 0.5:
            return False

        pips_x, pips_y = self._find_pips(data[max_i:i + 1], 5, 3)
        if len(pips_y) < 5:
            return False

        if not (pips_y[2] > pips_y[1] and pips_y[2] > pips_y[3]):
            return False

        resist_rise = pips_y[2] - pips_y[0]
        resist_run = pips_x[2] - pips_x[0]
        resist_slope = resist_rise / resist_run if resist_run != 0 else 0.0
        resist_intercept = pips_y[0]

        support_rise = pips_y[3] - pips_y[1]
        support_run = pips_x[3] - pips_x[1]
        support_slope = support_rise / support_run if support_run != 0 else 0.0
        support_intercept = pips_y[1] + (pips_x[0] - pips_x[1]) * support_slope

        if resist_slope != support_slope:
            intersection = (support_intercept - resist_intercept) / (resist_slope - support_slope)
        else:
            intersection = -flag_width * 100

        if intersection <= pips_x[4] and intersection >= 0:
            return False

        if intersection < 0 and intersection > -1.0 * flag_width:
            return False

        resist_endpoint = pips_y[0] + resist_slope * pips_x[4]
        if pips_y[4] < resist_endpoint:
            return False

        if support_slope > 0:
            pending.pennant = True
        else:
            pending.pennant = False

        pending.tip_x = max_i
        pending.tip_y = data[max_i]
        pending.conf_x = i
        pending.conf_y = data[i]
        pending.flag_width = flag_width
        pending.flag_height = flag_height
        pending.pole_width = pole_width
        pending.pole_height = pole_height
        pending.support_slope = support_slope
        pending.support_intercept = support_intercept
        pending.resist_slope = resist_slope
        pending.resist_intercept = resist_intercept

        return True

    def _find_flags_pennants_pips(self, data: np.ndarray) -> tuple[list[FlagPattern], list[FlagPattern], list[FlagPattern], list[FlagPattern]]:
        order = self.order
        pending_bull: FlagPattern | None = None
        pending_bear: FlagPattern | None = None

        bull_flags: list[FlagPattern] = []
        bear_flags: list[FlagPattern] = []
        bull_pennants: list[FlagPattern] = []
        bear_pennants: list[FlagPattern] = []

        for i in range(len(data)):
            if self._rw_top(data, i, order):
                pending_bear = FlagPattern(i - order, data[i - order])

            if self._rw_bottom(data, i, order):
                pending_bull = FlagPattern(i - order, data[i - order])

            if pending_bear is not None:
                if self._check_bear_pattern_pips(pending_bear, data, i):
                    if pending_bear.pennant:
                        bear_pennants.append(pending_bear)
                    else:
                        bear_flags.append(pending_bear)
                    pending_bear = None

            if pending_bull is not None:
                if self._check_bull_pattern_pips(pending_bull, data, i):
                    if pending_bull.pennant:
                        bull_pennants.append(pending_bull)
                    else:
                        bull_flags.append(pending_bull)
                    pending_bull = None

        return bull_flags, bear_flags, bull_pennants, bear_pennants

    def _check_trend_line(self, support: bool, pivot: int, slope: float, y: np.ndarray) -> float:
        intercept = -slope * pivot + y[pivot]
        line_vals = slope * np.arange(len(y)) + intercept
        diffs = line_vals - y
        if support and diffs.max() > 1e-5:
            return -1.0
        if not support and diffs.min() < -1e-5:
            return -1.0
        return float((diffs ** 2.0).sum())

    def _optimize_slope(self, support: bool, pivot: int, init_slope: float, y: np.ndarray) -> tuple[float, float]:
        slope_unit = (y.max() - y.min()) / len(y)
        opt_step = 1.0
        min_step = 0.0001
        curr_step = opt_step

        best_slope = init_slope
        best_err = self._check_trend_line(support, pivot, init_slope, y)
        if best_err < 0.0:
            return (init_slope, -init_slope * pivot + y[pivot])

        get_derivative = True
        derivative = None

        while curr_step > min_step:
            if get_derivative:
                slope_change = best_slope + slope_unit * min_step
                test_err = self._check_trend_line(support, pivot, slope_change, y)
                if test_err < 0.0:
                    slope_change = best_slope - slope_unit * min_step
                    test_err = self._check_trend_line(support, pivot, slope_change, y)
                    if test_err < 0.0:
                        break
                    derivative = best_err - test_err
                else:
                    derivative = test_err - best_err
                get_derivative = False

            if derivative > 0.0:
                test_slope = best_slope - slope_unit * curr_step
            else:
                test_slope = best_slope + slope_unit * curr_step

            test_err = self._check_trend_line(support, pivot, test_slope, y)
            if test_err < 0 or test_err >= best_err:
                curr_step *= 0.5
            else:
                best_err = test_err
                best_slope = test_slope
                get_derivative = True

        return (best_slope, -best_slope * pivot + y[pivot])

    def _fit_trendlines_single(self, data: np.ndarray) -> tuple[tuple[float, float], tuple[float, float]]:
        x = np.arange(len(data))
        coefs = np.polyfit(x, data, 1)
        line_points = coefs[0] * x + coefs[1]
        upper_pivot = int((data - line_points).argmax())
        lower_pivot = int((data - line_points).argmin())

        support_coefs = self._optimize_slope(True, lower_pivot, coefs[0], data)
        resist_coefs = self._optimize_slope(False, upper_pivot, coefs[0], data)

        return (support_coefs, resist_coefs)

    def _check_bull_pattern_trendline(self, pending: FlagPattern, data: np.ndarray, i: int) -> bool:
        if data[pending.tip_x + 1:i].max() > pending.tip_y:
            return False

        flag_min = data[pending.tip_x:i].min()
        pole_height = pending.tip_y - pending.base_y
        pole_width = pending.tip_x - pending.base_x
        flag_height = pending.tip_y - flag_min
        flag_width = i - pending.tip_x

        if flag_width > pole_width * 0.5:
            return False
        if flag_height > pole_height * 0.75:
            return False

        support_coefs, resist_coefs = self._fit_trendlines_single(data[pending.tip_x:i])
        support_slope, support_intercept = support_coefs
        resist_slope, resist_intercept = resist_coefs

        current_resist = resist_intercept + resist_slope * (flag_width + 1)
        if data[i] <= current_resist:
            return False

        if support_slope > 0:
            pending.pennant = True
        else:
            pending.pennant = False

        pending.conf_x = i
        pending.conf_y = data[i]
        pending.flag_width = flag_width
        pending.flag_height = flag_height
        pending.pole_width = pole_width
        pending.pole_height = pole_height
        pending.support_slope = support_slope
        pending.support_intercept = support_intercept
        pending.resist_slope = resist_slope
        pending.resist_intercept = resist_intercept

        return True

    def _check_bear_pattern_trendline(self, pending: FlagPattern, data: np.ndarray, i: int) -> bool:
        if data[pending.tip_x + 1:i].min() < pending.tip_y:
            return False

        flag_max = data[pending.tip_x:i].max()
        pole_height = pending.base_y - pending.tip_y
        pole_width = pending.tip_x - pending.base_x
        flag_height = flag_max - pending.tip_y
        flag_width = i - pending.tip_x

        if flag_width > pole_width * 0.5:
            return False
        if flag_height > pole_height * 0.75:
            return False

        support_coefs, resist_coefs = self._fit_trendlines_single(data[pending.tip_x:i])
        support_slope, support_intercept = support_coefs
        resist_slope, resist_intercept = resist_coefs

        current_support = support_intercept + support_slope * (flag_width + 1)
        if data[i] >= current_support:
            return False

        if resist_slope < 0:
            pending.pennant = True
        else:
            pending.pennant = False

        pending.conf_x = i
        pending.conf_y = data[i]
        pending.flag_width = flag_width
        pending.flag_height = flag_height
        pending.pole_width = pole_width
        pending.pole_height = pole_height
        pending.support_slope = support_slope
        pending.support_intercept = support_intercept
        pending.resist_slope = resist_slope
        pending.resist_intercept = resist_intercept

        return True

    def _find_flags_pennants_trendline(self, data: np.ndarray) -> tuple[list[FlagPattern], list[FlagPattern], list[FlagPattern], list[FlagPattern]]:
        order = self.order
        pending_bull: FlagPattern | None = None
        pending_bear: FlagPattern | None = None

        last_bottom = -1
        last_top = -1

        bull_flags: list[FlagPattern] = []
        bear_flags: list[FlagPattern] = []
        bull_pennants: list[FlagPattern] = []
        bear_pennants: list[FlagPattern] = []

        for i in range(len(data)):
            if self._rw_top(data, i, order):
                last_top = i - order
                if last_bottom != -1:
                    pending = FlagPattern(last_bottom, data[last_bottom])
                    pending.tip_x = last_top
                    pending.tip_y = data[last_top]
                    pending_bull = pending

            if self._rw_bottom(data, i, order):
                last_bottom = i - order
                if last_top != -1:
                    pending = FlagPattern(last_top, data[last_top])
                    pending.tip_x = last_bottom
                    pending.tip_y = data[last_bottom]
                    pending_bear = pending

            if pending_bear is not None:
                if self._check_bear_pattern_trendline(pending_bear, data, i):
                    if pending_bear.pennant:
                        bear_pennants.append(pending_bear)
                    else:
                        bear_flags.append(pending_bear)
                    pending_bear = None

            if pending_bull is not None:
                if self._check_bull_pattern_trendline(pending_bull, data, i):
                    if pending_bull.pennant:
                        bull_pennants.append(pending_bull)
                    else:
                        bull_flags.append(pending_bull)
                    pending_bull = None

        return bull_flags, bear_flags, bull_pennants, bear_pennants
