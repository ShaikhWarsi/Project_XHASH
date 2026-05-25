from __future__ import annotations

from collections import deque
from dataclasses import dataclass

import numpy as np
import pandas as pd

from core.enums import SignalType
from signals.base import SignalEngine


@dataclass
class HSPattern:
    inverted: bool
    l_shoulder: int = -1
    r_shoulder: int = -1
    l_armpit: int = -1
    r_armpit: int = -1
    head: int = -1
    l_shoulder_p: float = -1.0
    r_shoulder_p: float = -1.0
    l_armpit_p: float = -1.0
    r_armpit_p: float = -1.0
    head_p: float = -1.0
    start_i: int = -1
    break_i: int = -1
    break_p: float = -1.0
    neck_start: float = -1.0
    neck_end: float = -1.0
    neck_slope: float = -1.0
    head_width: float = -1.0
    head_height: float = -1.0
    pattern_r2: float = -1.0


class HeadShouldersEngine(SignalEngine):
    def __init__(self, order: int = 6, early_find: bool = False):
        super().__init__()
        self.order = order
        self.early_find = early_find

    @property
    def signal_type(self) -> SignalType:
        return SignalType.HEAD_SHOULDERS

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = float(df["close"].iloc[-1]) if len(df) > 0 else 0.0

        data = np.log(df["close"].values)
        hs_patterns, ihs_patterns = self._find_hs_patterns(data)

        signals = []
        for pat in hs_patterns:
            strength = min(max(pat.pattern_r2, 0.0), 1.0) if pat.pattern_r2 > 0 else 0.5
            signals.append(self._make_signal(
                direction=-1,
                strength=strength,
                confidence=0.6,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                level=float(pat.neck_end),
                metadata={
                    "type": "head_and_shoulders",
                    "neck_slope": float(pat.neck_slope),
                    "head_height": float(pat.head_height),
                    "head_width": float(pat.head_width),
                    "pattern_r2": float(pat.pattern_r2),
                    "break_index": int(pat.break_i),
                    "start_index": int(pat.start_i),
                },
            ))
        for pat in ihs_patterns:
            strength = min(max(pat.pattern_r2, 0.0), 1.0) if pat.pattern_r2 > 0 else 0.5
            signals.append(self._make_signal(
                direction=1,
                strength=strength,
                confidence=0.6,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                level=float(pat.neck_end),
                metadata={
                    "type": "inverse_head_and_shoulders",
                    "neck_slope": float(pat.neck_slope),
                    "head_height": float(pat.head_height),
                    "head_width": float(pat.head_width),
                    "pattern_r2": float(pat.pattern_r2),
                    "break_index": int(pat.break_i),
                    "start_index": int(pat.start_i),
                },
            ))

        self._store_signals(signals)
        return signals

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

    def _compute_pattern_r2(self, data: np.ndarray, pat: HSPattern) -> float:
        line0_slope = (pat.l_shoulder_p - pat.neck_start) / (pat.l_shoulder - pat.start_i)
        line0 = pat.neck_start + np.arange(pat.l_shoulder - pat.start_i) * line0_slope

        line1_slope = (pat.l_armpit_p - pat.l_shoulder_p) / (pat.l_armpit - pat.l_shoulder)
        line1 = pat.l_shoulder_p + np.arange(pat.l_armpit - pat.l_shoulder) * line1_slope

        line2_slope = (pat.head_p - pat.l_armpit_p) / (pat.head - pat.l_armpit)
        line2 = pat.l_armpit_p + np.arange(pat.head - pat.l_armpit) * line2_slope

        line3_slope = (pat.r_armpit_p - pat.head_p) / (pat.r_armpit - pat.head)
        line3 = pat.head_p + np.arange(pat.r_armpit - pat.head) * line3_slope

        line4_slope = (pat.r_shoulder_p - pat.r_armpit_p) / (pat.r_shoulder - pat.r_armpit)
        line4 = pat.r_armpit_p + np.arange(pat.r_shoulder - pat.r_armpit) * line4_slope

        line5_slope = (pat.break_p - pat.r_shoulder_p) / (pat.break_i - pat.r_shoulder)
        line5 = pat.r_shoulder_p + np.arange(pat.break_i - pat.r_shoulder) * line5_slope

        raw_data = data[pat.start_i:pat.break_i]
        hs_model = np.concatenate([line0, line1, line2, line3, line4, line5])
        mean = np.mean(raw_data)

        ss_res = np.sum((raw_data - hs_model) ** 2.0)
        ss_tot = np.sum((raw_data - mean) ** 2.0)

        return 1.0 - ss_res / ss_tot if ss_tot != 0 else 0.0

    def _check_hs_pattern(self, extrema_indices: list[int], data: np.ndarray, i: int) -> HSPattern | None:
        l_shoulder = extrema_indices[0]
        l_armpit = extrema_indices[1]
        head = extrema_indices[2]
        r_armpit = extrema_indices[3]

        if i - r_armpit < 2:
            return None

        r_shoulder = r_armpit + data[r_armpit + 1:i].argmax() + 1

        if data[head] <= max(data[l_shoulder], data[r_shoulder]):
            return None

        r_midpoint = 0.5 * (data[r_shoulder] + data[r_armpit])
        l_midpoint = 0.5 * (data[l_shoulder] + data[l_armpit])
        if data[l_shoulder] < r_midpoint or data[r_shoulder] < l_midpoint:
            return None

        r_to_h_time = r_shoulder - head
        l_to_h_time = head - l_shoulder
        if r_to_h_time > 2.5 * l_to_h_time or l_to_h_time > 2.5 * r_to_h_time:
            return None

        neck_run = r_armpit - l_armpit
        neck_rise = data[r_armpit] - data[l_armpit]
        neck_slope = neck_rise / neck_run if neck_run != 0 else 0.0
        neck_val = data[l_armpit] + (i - l_armpit) * neck_slope

        if self.early_find:
            if data[i] > r_midpoint:
                return None
        else:
            if data[i] > neck_val:
                return None

        head_width = r_armpit - l_armpit
        pat_start = -1
        neck_start_val = -1.0
        for j in range(1, head_width):
            neck = data[l_armpit] + (l_shoulder - l_armpit - j) * neck_slope
            if l_shoulder - j < 0:
                return None
            if data[l_shoulder - j] < neck:
                pat_start = l_shoulder - j
                neck_start_val = neck
                break

        if pat_start == -1:
            return None

        pat = HSPattern(inverted=False)
        pat.l_shoulder = l_shoulder
        pat.r_shoulder = r_shoulder
        pat.l_armpit = l_armpit
        pat.r_armpit = r_armpit
        pat.head = head
        pat.l_shoulder_p = float(data[l_shoulder])
        pat.r_shoulder_p = float(data[r_shoulder])
        pat.l_armpit_p = float(data[l_armpit])
        pat.r_armpit_p = float(data[r_armpit])
        pat.head_p = float(data[head])
        pat.start_i = pat_start
        pat.break_i = i
        pat.break_p = float(data[i])
        pat.neck_start = neck_start_val
        pat.neck_end = float(neck_val)
        pat.neck_slope = float(neck_slope)
        pat.head_width = float(head_width)
        pat.head_height = float(data[head] - (data[l_armpit] + (head - l_armpit) * neck_slope))
        pat.pattern_r2 = self._compute_pattern_r2(data, pat)

        return pat

    def _check_ihs_pattern(self, extrema_indices: list[int], data: np.ndarray, i: int) -> HSPattern | None:
        l_shoulder = extrema_indices[0]
        l_armpit = extrema_indices[1]
        head = extrema_indices[2]
        r_armpit = extrema_indices[3]

        if i - r_armpit < 2:
            return None

        r_shoulder = r_armpit + data[r_armpit + 1:i].argmin() + 1

        if data[head] >= min(data[l_shoulder], data[r_shoulder]):
            return None

        r_midpoint = 0.5 * (data[r_shoulder] + data[r_armpit])
        l_midpoint = 0.5 * (data[l_shoulder] + data[l_armpit])
        if data[l_shoulder] > r_midpoint or data[r_shoulder] > l_midpoint:
            return None

        r_to_h_time = r_shoulder - head
        l_to_h_time = head - l_shoulder
        if r_to_h_time > 2.5 * l_to_h_time or l_to_h_time > 2.5 * r_to_h_time:
            return None

        neck_run = r_armpit - l_armpit
        neck_rise = data[r_armpit] - data[l_armpit]
        neck_slope = neck_rise / neck_run if neck_run != 0 else 0.0
        neck_val = data[l_armpit] + (i - l_armpit) * neck_slope

        if self.early_find:
            if data[i] < r_midpoint:
                return None
        else:
            if data[i] < neck_val:
                return None

        head_width = r_armpit - l_armpit
        pat_start = -1
        neck_start_val = -1.0
        for j in range(1, head_width):
            neck = data[l_armpit] + (l_shoulder - l_armpit - j) * neck_slope
            if l_shoulder - j < 0:
                return None
            if data[l_shoulder - j] > neck:
                pat_start = l_shoulder - j
                neck_start_val = neck
                break

        if pat_start == -1:
            return None

        pat = HSPattern(inverted=True)
        pat.l_shoulder = l_shoulder
        pat.r_shoulder = r_shoulder
        pat.l_armpit = l_armpit
        pat.r_armpit = r_armpit
        pat.head = head
        pat.l_shoulder_p = float(data[l_shoulder])
        pat.r_shoulder_p = float(data[r_shoulder])
        pat.l_armpit_p = float(data[l_armpit])
        pat.r_armpit_p = float(data[r_armpit])
        pat.head_p = float(data[head])
        pat.start_i = pat_start
        pat.break_i = i
        pat.break_p = float(data[i])
        pat.neck_start = neck_start_val
        pat.neck_end = float(neck_val)
        pat.neck_slope = float(neck_slope)
        pat.head_width = float(head_width)
        pat.head_height = float((data[l_armpit] + (head - l_armpit) * neck_slope) - data[head])
        pat.pattern_r2 = self._compute_pattern_r2(data, pat)

        return pat

    def _find_hs_patterns(self, data: np.ndarray) -> tuple[list[HSPattern], list[HSPattern]]:
        order = self.order
        last_is_top = False
        recent_extrema: deque[int] = deque(maxlen=5)
        recent_types: deque[int] = deque(maxlen=5)

        hs_lock = False
        ihs_lock = False

        ihs_patterns: list[HSPattern] = []
        hs_patterns: list[HSPattern] = []

        for i in range(len(data)):
            if self._rw_top(data, i, order):
                recent_extrema.append(i - order)
                recent_types.append(1)
                ihs_lock = False
                last_is_top = True

            if self._rw_bottom(data, i, order):
                recent_extrema.append(i - order)
                recent_types.append(-1)
                hs_lock = False
                last_is_top = False

            if len(recent_extrema) < 5:
                continue

            hs_alternating = True
            ihs_alternating = True

            if last_is_top:
                for j in range(2, 5):
                    if recent_types[j] == recent_types[j - 1]:
                        ihs_alternating = False
                for j in range(1, 4):
                    if recent_types[j] == recent_types[j - 1]:
                        hs_alternating = False
                ihs_extrema = list(recent_extrema)[1:5]
                hs_extrema = list(recent_extrema)[0:4]
            else:
                for j in range(2, 5):
                    if recent_types[j] == recent_types[j - 1]:
                        hs_alternating = False
                for j in range(1, 4):
                    if recent_types[j] == recent_types[j - 1]:
                        ihs_alternating = False
                ihs_extrema = list(recent_extrema)[0:4]
                hs_extrema = list(recent_extrema)[1:5]

            ihs_pat = None if (ihs_lock or not ihs_alternating) else self._check_ihs_pattern(ihs_extrema, data, i)
            hs_pat = None if (hs_lock or not hs_alternating) else self._check_hs_pattern(hs_extrema, data, i)

            if hs_pat is not None:
                hs_lock = True
                hs_patterns.append(hs_pat)

            if ihs_pat is not None:
                ihs_lock = True
                ihs_patterns.append(ihs_pat)

        return hs_patterns, ihs_patterns
