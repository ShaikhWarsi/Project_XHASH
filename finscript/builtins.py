from __future__ import annotations

import math
from typing import Any, Optional

import numpy as np
import pandas as pd


class FinScriptRuntime:
    def __init__(self):
        self._data: dict[str, pd.DataFrame] = {}
        self._current_symbol: str = ""
        self._series_cache: dict[str, pd.Series] = {}

    def set_data(self, symbol: str, df: pd.DataFrame):
        self._data[symbol] = df
        self._current_symbol = symbol

    def _df(self) -> pd.DataFrame:
        return self._data.get(self._current_symbol, pd.DataFrame())

    def _series(self, name: str) -> pd.Series:
        if name in self._series_cache:
            cached = self._series_cache[name]
            if len(cached) == len(self._df()):
                return cached
        df = self._df()
        if df.empty:
            return pd.Series(dtype=float)
        s = df[name] if name in df.columns else pd.Series(dtype=float)
        self._series_cache[name] = s
        return s

    def close(self) -> pd.Series:
        return self._series("close")

    def open(self) -> pd.Series:
        return self._series("open")

    def high(self) -> pd.Series:
        return self._series("high")

    def low(self) -> pd.Series:
        return self._series("low")

    def volume(self) -> pd.Series:
        return self._series("volume")

    def hl2(self) -> pd.Series:
        return (self.high() + self.low()) / 2

    def hlc3(self) -> pd.Series:
        return (self.high() + self.low() + self.close()) / 3

    def ohlc4(self) -> pd.Series:
        return (self.open() + self.high() + self.low() + self.close()) / 4

    def bar_index(self) -> int:
        return len(self._df()) - 1

    def sma(self, source: Optional[pd.Series], period: int = 14) -> pd.Series:
        s = source if source is not None else self.close()
        return s.rolling(period).mean()

    def ema(self, source: Optional[pd.Series], period: int = 14) -> pd.Series:
        s = source if source is not None else self.close()
        return s.ewm(span=period, adjust=False).mean()

    def rma(self, source: Optional[pd.Series], period: int = 14) -> pd.Series:
        s = source if source is not None else self.close()
        alpha = 1.0 / period
        return s.ewm(alpha=alpha, adjust=False).mean()

    def wma(self, source: Optional[pd.Series], period: int = 14) -> pd.Series:
        s = source if source is not None else self.close()
        weights = pd.Series(range(1, period + 1))
        denom = weights.sum()
        return s.rolling(period).apply(lambda x: (x * weights[:len(x)]).sum() / denom if len(x) == period else None, raw=False)

    def hma(self, source: Optional[pd.Series], period: int = 14) -> pd.Series:
        s = source if source is not None else self.close()
        half = int(period / 2)
        sqrt_n = int(math.sqrt(period))
        wma_half = self.wma(s, half)
        wma_full = self.wma(s, period)
        return self.wma(2 * wma_half - wma_full, sqrt_n)

    def rsi(self, source: Optional[pd.Series], period: int = 14) -> pd.Series:
        s = source if source is not None else self.close()
        delta = s.diff()
        gain = delta.where(delta > 0, 0).fillna(0)
        loss = (-delta.where(delta < 0, 0)).fillna(0)
        avg_gain = gain.rolling(period).mean()
        avg_loss = loss.rolling(period).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        return 100 - (100 / (1 + rs))

    def macd(self, fast: int = 12, slow: int = 26, signal: int = 9) -> tuple[pd.Series, pd.Series, pd.Series]:
        ema_fast = self.ema(self.close(), fast)
        ema_slow = self.ema(self.close(), slow)
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    def bb(self, source: Optional[pd.Series], period: int = 20, std: int = 2) -> tuple[pd.Series, pd.Series, pd.Series]:
        s = source if source is not None else self.close()
        mid = s.rolling(period).mean()
        stddev = s.rolling(period).std()
        return mid + std * stddev, mid, mid - std * stddev

    def stochastic(self, k_period: int = 14, d_period: int = 3) -> tuple[pd.Series, pd.Series]:
        low_min = self.low().rolling(k_period).min()
        high_max = self.high().rolling(k_period).max()
        k = 100 * (self.close() - low_min) / (high_max - low_min + 1e-10)
        d = k.rolling(d_period).mean()
        return k, d

    def atr(self, period: int = 14) -> pd.Series:
        h, l, c = self.high(), self.low(), self.close()
        tr = pd.concat([
            (h - l).abs(),
            (h - c.shift(1)).abs(),
            (l - c.shift(1)).abs(),
        ], axis=1).max(axis=1)
        return tr.rolling(period).mean()

    def adx(self, period: int = 14) -> pd.Series:
        h, l, c = self.high(), self.low(), self.close()
        plus_dm = h.diff().clip(lower=0)
        minus_dm = (-l.diff()).clip(lower=0)
        tr = pd.concat([
            (h - l).abs(),
            (h - c.shift(1)).abs(),
            (l - c.shift(1)).abs(),
        ], axis=1).max(axis=1).rolling(period).mean()
        plus_di = 100 * (plus_dm.rolling(period).mean() / tr.replace(0, np.nan))
        minus_di = 100 * (minus_dm.rolling(period).mean() / tr.replace(0, np.nan))
        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)
        return dx.rolling(period).mean()

    def vwap(self) -> pd.Series:
        return (self.volume() * self.close()).cumsum() / self.volume().cumsum()

    def sar(self, acceleration: float = 0.02, maximum: float = 0.2) -> pd.Series:
        h, l = self.high().values, self.low().values
        n = len(h)
        sar = [0.0] * n
        if n < 2:
            return pd.Series(sar)
        uptrend = True
        ep = h[0]
        af = acceleration
        sar[0] = l[0]
        for i in range(1, n):
            prev = sar[i - 1]
            if uptrend:
                sar[i] = prev + af * (ep - prev)
                if sar[i] > l[i]:
                    uptrend = False
                    sar[i] = ep
                    af = acceleration
                    ep = l[i]
                else:
                    if h[i] > ep:
                        ep = h[i]
                        af = min(af + acceleration, maximum)
                    sar[i] = min(sar[i], l[i - 1] if i > 1 else l[i])
            else:
                sar[i] = prev + af * (ep - prev)
                if sar[i] < h[i]:
                    uptrend = True
                    sar[i] = ep
                    af = acceleration
                    ep = h[i]
                else:
                    if l[i] < ep:
                        ep = l[i]
                        af = min(af + acceleration, maximum)
                    sar[i] = max(sar[i], h[i - 1] if i > 1 else h[i])
        return pd.Series(sar)

    def crossover(self, a: pd.Series, b: pd.Series | float) -> pd.Series:
        b_series = pd.Series(b, index=a.index) if isinstance(b, (int, float)) else b
        return ((a.shift(1) < b_series.shift(1)) & (a >= b_series)).astype(float)

    def crossunder(self, a: pd.Series, b: pd.Series | float) -> pd.Series:
        b_series = pd.Series(b, index=a.index) if isinstance(b, (int, float)) else b
        return ((a.shift(1) > b_series.shift(1)) & (a <= b_series)).astype(float)

    def highest(self, source: Optional[pd.Series], period: int = 10) -> pd.Series:
        s = source if source is not None else self.high()
        return s.rolling(period).max()

    def lowest(self, source: Optional[pd.Series], period: int = 10) -> pd.Series:
        s = source if source is not None else self.low()
        return s.rolling(period).min()

    def stdev(self, source: Optional[pd.Series], period: int = 14) -> pd.Series:
        s = source if source is not None else self.close()
        return s.rolling(period).std()

    def linreg(self, source: Optional[pd.Series], period: int = 14) -> pd.Series:
        s = source if source is not None else self.close()
        return s.rolling(period).apply(
            lambda x: np.polyfit(range(len(x)), x, 1)[0] * (len(x) - 1) + np.polyfit(range(len(x)), x, 1)[1]
            if len(x) == period else None, raw=True)

    def change(self, source: Optional[pd.Series], period: int = 1) -> pd.Series:
        s = source if source is not None else self.close()
        return s.diff(period)

    def roc(self, source: Optional[pd.Series], period: int = 12) -> pd.Series:
        s = source if source is not None else self.close()
        return s.pct_change(period) * 100

    def cum(self, source: pd.Series) -> pd.Series:
        return source.cumsum()

    def tr(self) -> pd.Series:
        h, l, c = self.high(), self.low(), self.close()
        return pd.concat([
            (h - l).abs(),
            (h - c.shift(1)).abs(),
            (l - c.shift(1)).abs(),
        ], axis=1).max(axis=1)

    def mfi(self, period: int = 14) -> pd.Series:
        tp = (self.high() + self.low() + self.close()) / 3
        raw_flow = tp * self.volume()
        pos_flow = raw_flow.where(tp > tp.shift(1), 0).rolling(period).sum()
        neg_flow = raw_flow.where(tp < tp.shift(1), 0).rolling(period).sum()
        mfr = pos_flow / neg_flow.replace(0, np.nan)
        return 100 - (100 / (1 + mfr))

    def cci(self, period: int = 20) -> pd.Series:
        tp = (self.high() + self.low() + self.close()) / 3
        sma_tp = tp.rolling(period).mean()
        mad = tp.rolling(period).apply(lambda x: np.mean(np.abs(x - np.mean(x))), raw=True)
        return (tp - sma_tp) / (0.015 * mad.replace(0, np.nan))

    def williams_r(self, period: int = 14) -> pd.Series:
        hh = self.high().rolling(period).max()
        ll = self.low().rolling(period).min()
        return -100 * (hh - self.close()) / (hh - ll + 1e-10)

    def obv(self) -> pd.Series:
        return (self.volume() * np.sign(self.close().diff())).fillna(0).cumsum()

    def pivot_high(self, source: Optional[pd.Series], left: int = 2, right: int = 2) -> pd.Series:
        s = source if source is not None else self.high()
        pivots = pd.Series(0.0, index=s.index)
        for i in range(left, len(s) - right):
            if all(s.iloc[i] > s.iloc[i - j] for j in range(1, left + 1)) and \
               all(s.iloc[i] > s.iloc[i + j] for j in range(1, right + 1)):
                pivots.iloc[i] = s.iloc[i]
        return pivots

    def pivot_low(self, source: Optional[pd.Series], left: int = 2, right: int = 2) -> pd.Series:
        s = source if source is not None else self.low()
        pivots = pd.Series(0.0, index=s.index)
        for i in range(left, len(s) - right):
            if all(s.iloc[i] < s.iloc[i - j] for j in range(1, left + 1)) and \
               all(s.iloc[i] < s.iloc[i + j] for j in range(1, right + 1)):
                pivots.iloc[i] = s.iloc[i]
        return pivots

    def percentrank(self, source: pd.Series, period: int = 50) -> pd.Series:
        return source.rolling(period).apply(lambda x: (x[-1] > x).sum() / len(x) * 100 if len(x) == period else None, raw=True)

    def correlation(self, source1: pd.Series, source2: pd.Series, period: int = 14) -> pd.Series:
        return source1.rolling(period).corr(source2)

    def beta(self, source1: pd.Series, source2: pd.Series, period: int = 14) -> pd.Series:
        cov = source1.rolling(period).cov(source2)
        var = source2.rolling(period).var()
        return cov / var.replace(0, np.nan)

    def sharpe(self, source: pd.Series, rf: float = 0.0) -> float:
        returns = source.pct_change().dropna()
        if len(returns) < 2:
            return 0.0
        excess = returns - rf / 252
        return float(np.sqrt(252) * excess.mean() / max(excess.std(), 1e-10))

    def sortino(self, source: pd.Series, rf: float = 0.0) -> float:
        returns = source.pct_change().dropna()
        if len(returns) < 2:
            return 0.0
        excess = returns - rf / 252
        downside = excess[excess < 0]
        downside_std = np.std(downside) if len(downside) > 1 else 1e-10
        return float(np.sqrt(252) * excess.mean() / max(downside_std, 1e-10))

    def max_drawdown(self, source: pd.Series) -> float:
        peak = source.cummax()
        dd = (source - peak) / peak
        return float(dd.min())

    def values_at(self, series: pd.Series, offset: int) -> float:
        if len(series) <= abs(offset):
            return float("nan")
        return float(series.iloc[-1 - offset])

    def get_last(self, series: pd.Series) -> float:
        return float(series.iloc[-1]) if not series.empty else float("nan")

    def cross(self, a: pd.Series, b: pd.Series | float) -> bool:
        b_series = pd.Series(b, index=a.index) if isinstance(b, (int, float)) else b
        if len(a) < 2 or len(b_series) < 2:
            return False
        return bool(
            (a.iloc[-2] < b_series.iloc[-2] and a.iloc[-1] >= b_series.iloc[-1]) or
            (a.iloc[-2] > b_series.iloc[-2] and a.iloc[-1] <= b_series.iloc[-1])
        )
