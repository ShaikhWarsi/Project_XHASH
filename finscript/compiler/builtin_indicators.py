from __future__ import annotations

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_BUILTIN_PACK_ANCHOR_NAME = "[Sample] SuperTrend Trend-Following"

_SUPERTREND_CODE = r"""
import pandas as pd
import numpy as np

my_indicator_name = "[Sample] SuperTrend Trend-Following"
my_indicator_description = "Classic SuperTrend: ATR-channel direction flip. Open on trend flip, close on reverse flip."

atr_period = int(params.get('atr_period', 10))
multiplier = float(params.get('multiplier', 3.0))

df = df.copy()
high = df['high']
low = df['low']
close = df['close']
prev_close = close.shift(1)

tr = pd.concat([
    high - low,
    (high - prev_close).abs(),
    (low - prev_close).abs(),
], axis=1).max(axis=1)

atr = tr.ewm(alpha=1.0 / atr_period, adjust=False, min_periods=atr_period).mean()

hl2 = (high + low) / 2.0
upper_basic = hl2 + multiplier * atr
lower_basic = hl2 - multiplier * atr

n = len(df)
ub = upper_basic.to_numpy()
lb = lower_basic.to_numpy()
cl = close.to_numpy()

final_upper = np.full(n, np.nan)
final_lower = np.full(n, np.nan)
direction = np.zeros(n, dtype=np.int8)
supertrend = np.full(n, np.nan)

start_idx = int(atr_period)

for i in range(n):
    if i < start_idx or np.isnan(ub[i]) or np.isnan(lb[i]):
        continue

    if i == start_idx or direction[i - 1] == 0:
        final_upper[i] = ub[i]
        final_lower[i] = lb[i]
        direction[i] = 1 if cl[i] >= (ub[i] + lb[i]) / 2.0 else -1
        supertrend[i] = final_lower[i] if direction[i] == 1 else final_upper[i]
        continue

    if (ub[i] < final_upper[i - 1]) or (cl[i - 1] > final_upper[i - 1]):
        final_upper[i] = ub[i]
    else:
        final_upper[i] = final_upper[i - 1]

    if (lb[i] > final_lower[i - 1]) or (cl[i - 1] < final_lower[i - 1]):
        final_lower[i] = lb[i]
    else:
        final_lower[i] = final_lower[i - 1]

    if cl[i] > final_upper[i - 1]:
        direction[i] = 1
    elif cl[i] < final_lower[i - 1]:
        direction[i] = -1
    else:
        direction[i] = direction[i - 1]

    supertrend[i] = final_lower[i] if direction[i] == 1 else final_upper[i]

prev_direction = np.concatenate([[0], direction[:-1]])
buy_mask = (direction == 1) & (prev_direction == -1)
sell_mask = (direction == -1) & (prev_direction == 1)

df['buy'] = pd.Series(buy_mask, index=df.index).astype(bool)
df['sell'] = pd.Series(sell_mask, index=df.index).astype(bool)

supertrend_up = [float(v) if (d == 1 and not np.isnan(v)) else None for v, d in zip(supertrend, direction)]
supertrend_dn = [float(v) if (d == -1 and not np.isnan(v)) else None for v, d in zip(supertrend, direction)]

buy_marks = [float(df['low'].iloc[i] * 0.995) if bool(df['buy'].iloc[i]) else None for i in range(n)]
sell_marks = [float(df['high'].iloc[i] * 1.005) if bool(df['sell'].iloc[i]) else None for i in range(n)]

output = {
    'name': my_indicator_name,
    'plots': [
        {'name': 'SuperTrend Up', 'data': supertrend_up, 'color': '#00E676', 'overlay': True},
        {'name': 'SuperTrend Down', 'data': supertrend_dn, 'color': '#FF5252', 'overlay': True},
    ],
    'signals': [
        {'type': 'buy', 'text': 'B', 'data': buy_marks, 'color': '#00E676'},
        {'type': 'sell', 'text': 'S', 'data': sell_marks, 'color': '#FF5252'},
    ],
}
"""


def _builtin_specs() -> List[Dict[str, str]]:
    return [
        {
            "name": _BUILTIN_PACK_ANCHOR_NAME,
            "description": "Classic SuperTrend: Wilder-smoothed ATR drives adaptive upper/lower bands; opens on trend flip and closes on the reverse flip. Tunable params are declared via @param so the Smart Tuner can sweep them out-of-the-box.",
            "code": _SUPERTREND_CODE,
        },
    ]


def get_builtin_supertrend_code() -> str:
    return _SUPERTREND_CODE
