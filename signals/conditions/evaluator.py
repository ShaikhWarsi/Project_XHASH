from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

import numpy as np
import pandas as pd


class ConditionOperator(Enum):
    CROSSES_ABOVE = "crosses_above"
    CROSSES_BELOW = "crosses_below"
    CROSSED_ABOVE_WITHIN = "crossed_above_within"
    CROSSED_BELOW_WITHIN = "crossed_below_within"
    RISING = "rising"
    FALLING = "falling"
    GT = ">"
    LT = "<"
    GTE = ">="
    LTE = "<="
    EQ = "=="
    NEQ = "!="
    BETWEEN = "between"


@dataclass
class Condition:
    left: str
    operator: ConditionOperator
    right: str | float
    right_is_indicator: bool = False
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class ConditionGroup:
    conditions: list[Condition]
    logic: str = "AND"

    def evaluate(self, df: pd.DataFrame) -> bool:
        results = [evaluate_single(c, df) for c in self.conditions]
        if self.logic == "AND":
            return all(results)
        elif self.logic == "OR":
            return any(results)
        elif self.logic == "NAND":
            return not all(results)
        elif self.logic == "NOR":
            return not any(results)
        return all(results)


_indicator_cache: dict[str, pd.Series] = {}


def compute_indicator(name: str, df: pd.DataFrame, params: Optional[dict] = None) -> pd.Series:
    cache_key = f"{name}_{str(sorted(params.items())) if params else ''}_{len(df)}"
    if cache_key in _indicator_cache:
        cached = _indicator_cache[cache_key]
        return cached

    params = params or {}

    if name == "sma":
        period = int(params.get("period", 14))
        result = df["close"].rolling(period).mean()
    elif name == "ema":
        period = int(params.get("period", 14))
        result = df["close"].ewm(span=period, adjust=False).mean()
    elif name == "rsi":
        period = int(params.get("period", 14))
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0).fillna(0)
        loss = (-delta.where(delta < 0, 0)).fillna(0)
        avg_gain = gain.rolling(period).mean()
        avg_loss = loss.rolling(period).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        result = 100 - (100 / (1 + rs))
    elif name == "macd":
        fast = int(params.get("fast", 12))
        slow = int(params.get("slow", 26))
        signal = int(params.get("signal", 9))
        ema_fast = df["close"].ewm(span=fast, adjust=False).mean()
        ema_slow = df["close"].ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        line = params.get("line", "macd")
        if line == "signal":
            result = signal_line
        elif line == "histogram":
            result = macd_line - signal_line
        else:
            result = macd_line
    elif name == "bb_upper":
        period = int(params.get("period", 20))
        std = int(params.get("std", 2))
        sma = df["close"].rolling(period).mean()
        result = sma + std * df["close"].rolling(period).std()
    elif name == "bb_lower":
        period = int(params.get("period", 20))
        std = int(params.get("std", 2))
        sma = df["close"].rolling(period).mean()
        result = sma - std * df["close"].rolling(period).std()
    elif name == "atr":
        period = int(params.get("period", 14))
        high, low, close = df["high"], df["low"], df["close"]
        tr = np.maximum(high - low,
                        np.maximum(np.abs(high - close.shift(1)),
                                   np.abs(low - close.shift(1))))
        result = tr.rolling(period).mean()
    elif name == "volume":
        result = df["volume"]
    elif name == "close":
        result = df["close"]
    elif name == "high":
        result = df["high"]
    elif name == "low":
        result = df["low"]
    elif name == "open":
        result = df["open"]
    elif name == "vwap":
        result = (df["volume"] * df["close"]).cumsum() / df["volume"].cumsum()
    elif name == "stoch_k":
        k_period = int(params.get("k_period", 14))
        low_min = df["low"].rolling(k_period).min()
        high_max = df["high"].rolling(k_period).max()
        result = 100 * (df["close"] - low_min) / (high_max - low_min + 1e-10)
    elif name == "stoch_d":
        k_period = int(params.get("k_period", 14))
        d_period = int(params.get("d_period", 3))
        low_min = df["low"].rolling(k_period).min()
        high_max = df["high"].rolling(k_period).max()
        k = 100 * (df["close"] - low_min) / (high_max - low_min + 1e-10)
        result = k.rolling(d_period).mean()
    elif name == "obv":
        obv = (df["volume"] * np.sign(df["close"].diff())).fillna(0).cumsum()
        result = obv
    elif name == "adx":
        period = int(params.get("period", 14))
        high, low, close = df["high"], df["low"], df["close"]
        plus_dm = high.diff()
        minus_dm = (-low.diff()).clip(lower=0)
        tr = np.maximum(high - low,
                        np.maximum(np.abs(high - close.shift(1)),
                                   np.abs(low - close.shift(1)))).rolling(period).mean()
        plus_di = 100 * (plus_dm.where(plus_dm > 0, 0).rolling(period).mean() / tr.replace(0, np.nan))
        minus_di = 100 * (minus_dm.where(minus_dm > 0, 0).rolling(period).mean() / tr.replace(0, np.nan))
        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)
        result = dx.rolling(period).mean()
    elif name == "cci":
        period = int(params.get("period", 20))
        tp = (df["high"] + df["low"] + df["close"]) / 3
        sma_tp = tp.rolling(period).mean()
        mad = tp.rolling(period).apply(lambda x: np.mean(np.abs(x - np.mean(x))), raw=True)
        result = (tp - sma_tp) / (0.015 * mad.replace(0, np.nan))
    elif name == "williams_r":
        period = int(params.get("period", 14))
        high_max = df["high"].rolling(period).max()
        low_min = df["low"].rolling(period).min()
        result = -100 * (high_max - df["close"]) / (high_max - low_min + 1e-10)
    elif name == "roc":
        period = int(params.get("period", 12))
        result = df["close"].pct_change(period) * 100
    else:
        raise ValueError(f"Unknown indicator: {name}")

    _indicator_cache[cache_key] = result
    return result


def _get_value(name: str, df: pd.DataFrame, is_indicator: bool, params: Optional[dict] = None) -> float:
    if is_indicator:
        series = compute_indicator(name, df, params)
        return float(series.iloc[-1]) if not pd.isna(series.iloc[-1]) else float("nan")
    if name == "close":
        return float(df["close"].iloc[-1])
    if name == "open":
        return float(df["open"].iloc[-1])
    if name == "high":
        return float(df["high"].iloc[-1])
    if name == "low":
        return float(df["low"].iloc[-1])
    if name == "volume":
        return float(df["volume"].iloc[-1])
    try:
        return float(name)
    except (ValueError, TypeError):
        pass
    try:
        series = compute_indicator(name, df, params)
        return float(series.iloc[-1]) if not pd.isna(series.iloc[-1]) else float("nan")
    except ValueError:
        return float("nan")


def _get_series(name: str, df: pd.DataFrame, is_indicator: bool, params: Optional[dict] = None) -> pd.Series:
    if is_indicator:
        return compute_indicator(name, df, params)
    try:
        return pd.Series(float(name), index=df.index)
    except (ValueError, TypeError):
        pass
    if name in ("close", "open", "high", "low", "volume"):
        return df[name]
    return compute_indicator(name, df, params)


def evaluate_single(condition: Condition, df: pd.DataFrame) -> bool:
    left_params = {k: v for k, v in condition.params.items() if k.startswith("left_")}
    left_params = {k.replace("left_", ""): v for k, v in left_params.items()}
    right_params = {k: v for k, v in condition.params.items() if k.startswith("right_")}
    right_params = {k.replace("right_", ""): v for k, v in right_params.items()}

    op = condition.operator

    if op in (ConditionOperator.CROSSES_ABOVE, ConditionOperator.CROSSES_BELOW,
              ConditionOperator.CROSSED_ABOVE_WITHIN, ConditionOperator.CROSSED_BELOW_WITHIN):
        left_series = _get_series(condition.left, df, condition.right_is_indicator is False, left_params)
        right_series = _get_series(condition.right, df, condition.right_is_indicator, right_params) \
            if isinstance(condition.right, str) else pd.Series(float(condition.right), index=df.index)

        prev_crossed = (left_series.shift(1) < right_series.shift(1)) & (left_series >= right_series) if op in (
            ConditionOperator.CROSSES_ABOVE, ConditionOperator.CROSSED_ABOVE_WITHIN) else \
            (left_series.shift(1) > right_series.shift(1)) & (left_series <= right_series)

        if op == ConditionOperator.CROSSES_ABOVE:
            return bool(prev_crossed.iloc[-1]) if not prev_crossed.empty else False
        if op == ConditionOperator.CROSSES_BELOW:
            return bool(prev_crossed.iloc[-1]) if not prev_crossed.empty else False

        within = int(condition.params.get("within", 5))
        return bool(prev_crossed.iloc[-within:].any()) if len(prev_crossed) >= within else False

    if op in (ConditionOperator.RISING, ConditionOperator.FALLING):
        series = _get_series(condition.left, df, condition.right_is_indicator is False, left_params)
        periods = int(condition.params.get("periods", 3))
        if op == ConditionOperator.RISING:
            return bool(all(series.iloc[-periods:].diff().dropna() > 0)) if len(series) >= periods + 1 else False
        return bool(all(series.iloc[-periods:].diff().dropna() < 0)) if len(series) >= periods + 1 else False

    left_val = _get_value(condition.left, df, condition.right_is_indicator is False, left_params)
    right_val = _get_value(condition.right, df, condition.right_is_indicator, right_params) \
        if isinstance(condition.right, str) else float(condition.right)

    if pd.isna(left_val) or pd.isna(right_val):
        return False

    if op == ConditionOperator.GT:
        return left_val > right_val
    if op == ConditionOperator.LT:
        return left_val < right_val
    if op == ConditionOperator.GTE:
        return left_val >= right_val
    if op == ConditionOperator.LTE:
        return left_val <= right_val
    if op == ConditionOperator.EQ:
        return abs(left_val - right_val) < 1e-10
    if op == ConditionOperator.NEQ:
        return abs(left_val - right_val) >= 1e-10
    if op == ConditionOperator.BETWEEN:
        low = float(condition.params.get("low", 0))
        high = float(condition.params.get("high", 100))
        return low <= left_val <= high

    return False


class ConditionEvaluator:
    def evaluate(self, group: ConditionGroup, df: pd.DataFrame) -> bool:
        return group.evaluate(df)
