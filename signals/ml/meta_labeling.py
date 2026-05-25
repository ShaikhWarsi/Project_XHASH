from __future__ import annotations

import numpy as np
import pandas as pd

from core.enums import SignalType
from signals.base import SignalEngine

# ──────────────────────────────────────────────
#  TRENDLINE FITTING — ported from TrendlineBreakoutMetaLabel
# ──────────────────────────────────────────────

def _check_trend_line(support: bool, pivot: int, slope: float, y: np.ndarray) -> float:
    intercept = -slope * pivot + y[pivot]
    line_vals = slope * np.arange(len(y)) + intercept
    diffs = line_vals - y
    if support and diffs.max() > 1e-5:
        return -1.0
    elif not support and diffs.min() < -1e-5:
        return -1.0
    return float((diffs ** 2.0).sum())


def _optimize_slope(support: bool, pivot: int, init_slope: float, y: np.ndarray):
    slope_unit = (y.max() - y.min()) / len(y)
    opt_step = 1.0
    min_step = 0.0001
    curr_step = opt_step
    best_slope = init_slope
    best_err = _check_trend_line(support, pivot, init_slope, y)
    assert best_err >= 0.0

    get_derivative = True
    derivative = None
    while curr_step > min_step:
        if get_derivative:
            slope_change = best_slope + slope_unit * min_step
            test_err = _check_trend_line(support, pivot, slope_change, y)
            derivative = test_err - best_err
            if test_err < 0.0:
                slope_change = best_slope - slope_unit * min_step
                test_err = _check_trend_line(support, pivot, slope_change, y)
                derivative = best_err - test_err
            if test_err < 0.0:
                raise RuntimeError("Derivative failed. Check your data.")
            get_derivative = False
        if derivative > 0.0:
            test_slope = best_slope - slope_unit * curr_step
        else:
            test_slope = best_slope + slope_unit * curr_step
        test_err = _check_trend_line(support, pivot, test_slope, y)
        if test_err < 0 or test_err >= best_err:
            curr_step *= 0.5
        else:
            best_err = test_err
            best_slope = test_slope
            get_derivative = True
    return best_slope, -best_slope * pivot + y[pivot]


def _fit_trendlines_single(data: np.ndarray):
    x = np.arange(len(data))
    coefs = np.polyfit(x, data, 1)
    line_points = coefs[0] * x + coefs[1]
    upper_pivot = (data - line_points).argmax()
    lower_pivot = (data - line_points).argmin()
    support_coefs = _optimize_slope(True, lower_pivot, coefs[0], data)
    resist_coefs = _optimize_slope(False, upper_pivot, coefs[0], data)
    return support_coefs, resist_coefs


# ──────────────────────────────────────────────
#  MANUAL INDICATOR COMPUTATION (pandas_ta fallback)
# ──────────────────────────────────────────────

def _wilder_smooth(values: np.ndarray, period: int) -> np.ndarray:
    out = np.full_like(values, np.nan)
    if len(values) < period:
        return out
    out[period - 1] = np.nanmean(values[:period])
    for i in range(period, len(values)):
        prev = out[i - 1]
        if np.isnan(prev):
            out[i] = np.nan
        else:
            out[i] = (prev * (period - 1) + values[i]) / period
    return out


def _manual_atr(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int) -> np.ndarray:
    prev_close = np.roll(close, 1)
    prev_close[0] = close[0]
    hl = high - low
    hc = np.abs(high - prev_close)
    lc = np.abs(low - prev_close)
    tr = np.maximum(np.maximum(hl, hc), lc)
    return _wilder_smooth(tr, period)


def _manual_adx(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int) -> np.ndarray:
    prev_high = np.roll(high, 1)
    prev_low = np.roll(low, 1)
    prev_close = np.roll(close, 1)
    prev_high[0] = high[0]
    prev_low[0] = low[0]
    prev_close[0] = close[0]

    up_move = high - prev_high
    down_move = prev_low - low

    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    tr = _manual_true_range(high, low, close)
    smoothed_tr = _wilder_smooth(tr, period)
    smoothed_plus = _wilder_smooth(plus_dm, period)
    smoothed_minus = _wilder_smooth(minus_dm, period)

    with np.errstate(divide="ignore", invalid="ignore"):
        plus_di = 100.0 * smoothed_plus / smoothed_tr
        minus_di = 100.0 * smoothed_minus / smoothed_tr
        dx_val = 100.0 * np.abs(plus_di - minus_di) / (plus_di + minus_di)
        adx = _wilder_smooth(dx_val, period)
    return adx


def _manual_true_range(high: np.ndarray, low: np.ndarray, close: np.ndarray) -> np.ndarray:
    prev_close = np.roll(close, 1)
    prev_close[0] = close[0]
    hl = high - low
    hc = np.abs(high - prev_close)
    lc = np.abs(low - prev_close)
    return np.maximum(np.maximum(hl, hc), lc)


def _compute_atr(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int) -> np.ndarray:
    try:
        import pandas_ta as ta
        return ta.atr(high, low, close, period).to_numpy()
    except ImportError:
        return _manual_atr(high, low, close, period)


def _compute_adx(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int) -> np.ndarray:
    try:
        import pandas_ta as ta
        adx_df = ta.adx(high, low, close, period)
        return adx_df[f"ADX_{period}"].to_numpy()
    except ImportError:
        return _manual_adx(high, low, close, period)


# ──────────────────────────────────────────────
#  TRENDLINE DATASET BUILDER
# ──────────────────────────────────────────────

class TrendlineDatasetBuilder:
    """Feature engineering for trendline breakout dataset generation.

    Ported from TrendlineBreakoutMetaLabel/trendline_break_dataset.py.

    For each bar, fits trendlines and checks for breakout.  When a breakout
    occurs, a trade record with engineered features is created.  The trade is
    closed when TP / SL / hold-period is reached.
    """

    def build_dataset(
        self,
        ohlcv_df: pd.DataFrame,
        lookback: int = 72,
        hold_period: int = 12,
        tp_mult: float = 3.0,
        sl_mult: float = 3.0,
        atr_lookback: int = 168,
    ) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series]:
        df = ohlcv_df.copy()
        df.columns = [c.lower() for c in df.columns]

        close = np.log(np.maximum(df["close"].to_numpy(), 1e-10))
        high = np.log(np.maximum(df["high"].to_numpy(), 1e-10))
        low = np.log(np.maximum(df["low"].to_numpy(), 1e-10))

        atr_arr = _compute_atr(df["high"], df["low"], df["close"], atr_lookback)

        vol_arr = (
            df["volume"] / df["volume"].rolling(atr_lookback, min_periods=1).median()
        ).to_numpy()

        adx_arr = _compute_adx(df["high"], df["low"], df["close"], lookback)

        trades = []
        in_trade = False
        tp_price = None
        sl_price = None
        hp_idx = None

        for i in range(atr_lookback, len(df)):
            window = close[i - lookback : i]

            try:
                s_coefs, r_coefs = _fit_trendlines_single(window)
            except (AssertionError, RuntimeError):
                continue

            r_val = r_coefs[1] + lookback * r_coefs[0]

            if not in_trade and not np.isnan(r_val) and close[i] > r_val:
                tp_price = close[i] + atr_arr[i] * tp_mult
                sl_price = close[i] - atr_arr[i] * sl_mult
                hp_idx = i + hold_period
                in_trade = True

                line_vals = r_coefs[1] + np.arange(lookback) * r_coefs[0]
                err = (line_vals - window).sum() / lookback / max(atr_arr[i], 1e-10)
                diff = line_vals - window

                trades.append({
                    "entry_i": i,
                    "entry_p": close[i],
                    "atr": atr_arr[i],
                    "sl": sl_price,
                    "tp": tp_price,
                    "hp_i": hp_idx,
                    "slope": r_coefs[0],
                    "intercept": r_coefs[1],
                    "resist_s": r_coefs[0] / max(atr_arr[i], 1e-10),
                    "tl_err": err,
                    "max_dist": diff.max() / max(atr_arr[i], 1e-10),
                    "vol": vol_arr[i],
                    "adx": adx_arr[i],
                })

            if in_trade:
                if close[i] >= tp_price or close[i] <= sl_price or i >= hp_idx:
                    trades[-1]["exit_i"] = i
                    trades[-1]["exit_p"] = close[i]
                    in_trade = False

        trades_df = pd.DataFrame(trades)
        if len(trades_df) == 0:
            feature_cols = ["resist_s", "tl_err", "vol", "max_dist", "adx"]
            return trades_df, pd.DataFrame(columns=feature_cols), pd.Series(dtype=float)

        trades_df["return"] = trades_df["exit_p"] - trades_df["entry_p"]
        trades_df = trades_df.dropna(subset=["exit_i", "return"]).reset_index(drop=True)

        X = trades_df[["resist_s", "tl_err", "vol", "max_dist", "adx"]].copy()
        y = (trades_df["return"] > 0).astype(int)

        return trades_df, X, y


# ──────────────────────────────────────────────
#  WALK-FORWARD META LABELER
# ──────────────────────────────────────────────

class WalkForwardMetaLabeler:
    """Random Forest meta-labeling with walk-forward validation.

    Trains a RandomForestClassifier every ``step_size`` bars on all
    trades whose entry fell within the current training window and
    evaluates on the following ``step_size`` bars.
    """

    def __init__(self):
        self._model = None
        self._models: list = []
        self._fold_boundaries: list[tuple[int, int, int, int]] = []

    @property
    def model(self):
        return self._model

    def fit_walkforward(
        self,
        trades: pd.DataFrame,
        X: np.ndarray,
        y: np.ndarray,
        train_size: int = 2000,
        step_size: int = 500,
    ) -> tuple[np.ndarray, np.ndarray]:
        """Walk-forward RF training, returns filtered signals and probabilities.

        Parameters
        ----------
        trades : DataFrame
            Must contain the ``entry_i`` column.
        X : ndarray of shape (n_trades, n_features)
        y : ndarray of shape (n_trades,)
        train_size : int
            Number of bars to use for the initial training window.
        step_size : int
            Number of bars to step forward and evaluate on.

        Returns
        -------
        trade_signals : ndarray of shape (n_trades,)
            1 where RF predicts prob > 0.5, 0 otherwise.
        trade_probs : ndarray of shape (n_trades,)
            Predicted probability of class 1 for each trade.
        """
        from sklearn.ensemble import RandomForestClassifier

        entry_i = trades["entry_i"].to_numpy()
        n = len(trades)
        trade_signals = np.zeros(n, dtype=int)
        trade_probs = np.zeros(n, dtype=float)

        entry_order = np.argsort(entry_i)
        sorted_entry = entry_i[entry_order]
        sorted_X = X[entry_order]
        sorted_y = y[entry_order]

        fold_start = 0
        step_count = 0
        self._models = []
        self._fold_boundaries = []

        while fold_start < n:
            train_end = int(fold_start + train_size)
            test_end = int(min(fold_start + train_size + step_size, n))

            if train_end > n:
                break

            train_idx = range(fold_start, train_end)
            test_idx = range(train_end, test_end)
            if len(train_idx) == 0 or len(test_idx) == 0:
                break

            rf = RandomForestClassifier(
                n_estimators=1000, max_depth=3, random_state=42, n_jobs=-1
            )
            rf.fit(sorted_X[train_idx], sorted_y[train_idx])
            self._models.append(rf)

            probs = rf.predict_proba(sorted_X[test_idx])[:, 1]
            trade_probs[entry_order[test_idx]] = probs
            trade_signals[entry_order[test_idx]] = (probs > 0.5).astype(int)

            self._fold_boundaries.append((
                int(fold_start),
                int(train_end),
                int(train_end),
                int(test_end),
            ))

            fold_start += step_size
            step_count += 1

        self._model = self._models[-1] if self._models else None
        return trade_signals, trade_probs


# ──────────────────────────────────────────────
#  TRENDLINE BREAKOUT ENGINE (upgraded)
# ──────────────────────────────────────────────

class TrendlineBreakoutEngine(SignalEngine):
    """Sliding-window trendline breakout detector with optional meta-labeling.

    Ported from TrendlineBreakoutMetaLabel/trendline_breakout.py.

    At each bar computes support/resistance trendlines over a lookback
    window and emits signals when price closes outside the channel.

    When ``use_meta_labeling`` is True, builds a full breakout dataset,
    trains a walk-forward Random Forest filter, and only emits signals
    for trades that pass the meta-label filter.
    """

    def __init__(
        self,
        lookback: int = 72,
        log_price: bool = True,
        use_meta_labeling: bool = False,
        hold_period: int = 12,
        tp_mult: float = 3.0,
        sl_mult: float = 3.0,
        atr_lookback: int = 168,
        train_size: int = 2000,
        step_size: int = 500,
    ):
        super().__init__()
        self.lookback = lookback
        self.log_price = log_price
        self.use_meta_labeling = use_meta_labeling
        self.hold_period = hold_period
        self.tp_mult = tp_mult
        self.sl_mult = sl_mult
        self.atr_lookback = atr_lookback
        self.train_size = train_size
        self.step_size = step_size
        self._model = None

    @property
    def signal_type(self) -> SignalType:
        return SignalType.ML_TRENDLINE

    def compute(self, bars: pd.DataFrame) -> list:
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = float(df["close"].iloc[-1]) if len(df) > 0 else 0.0

        close = df["close"].values
        if self.log_price:
            close = np.log(np.maximum(close, 1e-10))

        support_arr = np.full(len(close), np.nan)
        resist_arr = np.full(len(close), np.nan)
        sig_arr = np.zeros(len(close))

        for i in range(self.lookback, len(close)):
            window = close[i - self.lookback : i]
            try:
                s_coefs, r_coefs = _fit_trendlines_single(window)
            except (AssertionError, RuntimeError):
                sig_arr[i] = sig_arr[i - 1] if i > 0 else 0.0
                continue

            s_val = s_coefs[1] + self.lookback * s_coefs[0]
            r_val = r_coefs[1] + self.lookback * r_coefs[0]

            support_arr[i] = s_val
            resist_arr[i] = r_val

            if not np.isnan(r_val) and close[i] > r_val:
                sig_arr[i] = 1.0
            elif not np.isnan(s_val) and close[i] < s_val:
                sig_arr[i] = -1.0
            else:
                sig_arr[i] = sig_arr[i - 1] if i > 0 else 0.0

        # ── meta-labeling filter ──
        if self.use_meta_labeling:
            builder = TrendlineDatasetBuilder()
            trades, X_df, y_series = builder.build_dataset(
                df, self.lookback, self.hold_period,
                self.tp_mult, self.sl_mult, self.atr_lookback,
            )

            if len(trades) > 0 and len(X_df) > 0:
                labeler = WalkForwardMetaLabeler()
                trade_signals, _ = labeler.fit_walkforward(
                    trades, X_df.values, y_series.values,
                    self.train_size, self.step_size,
                )
                self._model = labeler

                for idx in range(len(trade_signals)):
                    if trade_signals[idx] == 0:
                        row = trades.iloc[idx]
                        ei = int(row["entry_i"])
                        if pd.isna(row.get("exit_i")):
                            continue
                        xi = int(row["exit_i"])
                        sig_arr[ei : xi + 1] = 0.0

        # ── build output signal list ──
        signals = []
        if len(sig_arr) > 0 and sig_arr[-1] != 0:
            direction = 1 if sig_arr[-1] > 0 else -1
            if direction > 0 and not np.isnan(resist_arr[-1]):
                dist = abs(close[-1] - resist_arr[-1])
            elif direction < 0 and not np.isnan(support_arr[-1]):
                dist = abs(close[-1] - support_arr[-1])
            else:
                dist = 0.0
            price_range = np.ptp(close[-self.lookback :]) if len(close) >= self.lookback else 1.0
            strength = min(dist / max(price_range, 1e-10), 1.0)

            signals.append(self._make_signal(
                direction=direction,
                strength=float(strength),
                confidence=0.6,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                level=float(
                    resist_arr[-1] if direction > 0 else support_arr[-1]
                ) if not np.isnan(
                    resist_arr[-1] if direction > 0 else support_arr[-1]
                ) else None,
                metadata={
                    "lookback": self.lookback,
                    "use_meta_labeling": self.use_meta_labeling,
                    "support_tl": float(support_arr[-1]) if not np.isnan(support_arr[-1]) else None,
                    "resist_tl": float(resist_arr[-1]) if not np.isnan(resist_arr[-1]) else None,
                },
            ))

        self._store_signals(signals)
        return signals
