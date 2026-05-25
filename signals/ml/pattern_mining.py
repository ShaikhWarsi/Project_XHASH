from __future__ import annotations

import numpy as np
import pandas as pd

from core.enums import SignalType
from signals.base import SignalEngine

# ──────────────────────────────────────────────
#  PIP DETECTION — ported from perceptually_important.py
# ──────────────────────────────────────────────

def find_pips(data: np.ndarray, n_pips: int, dist_measure: int = 3):
    """Find perceptually important points (PIPs) in a price series.

    dist_measure: 1=Euclidean, 2=Perpendicular, 3=Vertical
    """
    pips_x = [0, len(data) - 1]
    pips_y = [float(data[0]), float(data[-1])]

    for curr_point in range(2, n_pips):
        md = 0.0
        md_i = -1
        insert_index = -1

        for k in range(curr_point - 1):
            left_adj = k
            right_adj = k + 1

            time_diff = pips_x[right_adj] - pips_x[left_adj]
            if time_diff == 0:
                continue
            price_diff = pips_y[right_adj] - pips_y[left_adj]
            slope = price_diff / time_diff
            intercept = pips_y[left_adj] - pips_x[left_adj] * slope

            for i in range(pips_x[left_adj] + 1, pips_x[right_adj]):
                if dist_measure == 1:
                    d = ((pips_x[left_adj] - i) ** 2 + (pips_y[left_adj] - data[i]) ** 2) ** 0.5
                    d += ((pips_x[right_adj] - i) ** 2 + (pips_y[right_adj] - data[i]) ** 2) ** 0.5
                elif dist_measure == 2:
                    d = abs((slope * i + intercept) - data[i]) / (slope ** 2 + 1) ** 0.5
                else:
                    d = abs((slope * i + intercept) - data[i])

                if d > md:
                    md = d
                    md_i = i
                    insert_index = right_adj

        if md_i >= 0 and insert_index is not None:
            pips_x.insert(insert_index, md_i)
            pips_y.insert(insert_index, float(data[md_i]))

    return pips_x, pips_y


# ──────────────────────────────────────────────
#  CLUSTER-BASED MARTIN RATIO — ported from pip_pattern_miner.py
# ──────────────────────────────────────────────

def _get_martin(rets: np.ndarray) -> float:
    rsum = np.sum(rets)
    short = False
    if rsum < 0.0:
        rets = -rets
        rsum = -rsum
        short = True
    csum = np.cumsum(rets)
    eq = pd.Series(np.exp(csum))
    sumsq = np.sum(((eq / eq.cummax()) - 1) ** 2.0)
    ulcer_index = (sumsq / len(rets)) ** 0.5
    if ulcer_index == 0:
        return 0.0
    martin = rsum / ulcer_index
    return -martin if short else martin


# ──────────────────────────────────────────────
#  PIP PATTERN MINER ENGINE
# ──────────────────────────────────────────────

class PIPPatternMinerEngine(SignalEngine):
    """Unsupervised pattern mining via PIP clustering.

    Ported from TechnicalAnalysisAutomation/pip_pattern_miner.py.

    Uses k-means on normalized PIP patterns to discover recurring
    chart patterns, then assigns long/short labels based on
    historical Martin ratio.

    Requires pyclustering for silhouette-based k selection
    and k-means clustering.
    """

    def __init__(
        self,
        n_pips: int = 5,
        lookback: int = 24,
        hold_period: int = 6,
        min_clusters: int = 5,
        max_clusters: int = 40,
    ):
        super().__init__()
        self.n_pips = n_pips
        self.lookback = lookback
        self.hold_period = hold_period
        self.min_clusters = min_clusters
        self.max_clusters = max_clusters

        self._unique_pip_patterns: list[list[float]] = []
        self._unique_pip_indices: list[int] = []
        self._cluster_centers: list[list[float]] = []
        self._pip_clusters: list[list[int]] = []
        self._cluster_martins: list[float] = []
        self._selected_long: list[int] = []
        self._selected_short: list[int] = []
        self._fit_martin: float = 0.0
        self._trained = False

    @property
    def signal_type(self) -> SignalType:
        return SignalType.ML_PATTERN

    @property
    def trained(self) -> bool:
        return self._trained

    @property
    def fit_martin(self) -> float:
        return self._fit_martin

    def compute(self, bars: pd.DataFrame) -> list:
        """Online compute — returns neutral signal if not trained."""
        if not self._trained:
            return []

        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")
        last_price = float(df["close"].iloc[-1]) if len(df) > 0 else 0.0

        close = df["close"].values
        if len(close) < self.lookback:
            return []

        window = close[-self.lookback:]
        _, pips_y = find_pips(window, self.n_pips, 3)
        signal = self.predict(pips_y)

        if signal == 0:
            return []

        signals = [
            self._make_signal(
                direction=signal,
                strength=0.7,
                confidence=0.5,
                symbol=symbol,
                timeframe=timeframe,
                price=last_price,
                metadata={
                    "pattern_count": len(self._unique_pip_patterns),
                    "cluster_count": len(self._cluster_centers),
                    "fit_martin": self._fit_martin,
                },
            )
        ]
        self._store_signals(signals)
        return signals

    def train(self, arr: np.ndarray):
        """Train the pattern miner on historical price data."""
        from pyclustering.cluster.silhouette import silhouette_ksearch, silhouette_ksearch_type

        self._data = arr
        self._returns = pd.Series(arr).diff().shift(-1)
        self._find_unique_patterns()

        if len(self._unique_pip_patterns) < self.min_clusters:
            self._trained = False
            return

        search_instance = silhouette_ksearch(
            self._unique_pip_patterns,
            self.min_clusters,
            self.max_clusters,
            algorithm=silhouette_ksearch_type.KMEANS,
        ).process()

        amount = search_instance.get_amount()
        self._kmeans_cluster_patterns(amount)
        self._assign_clusters()
        self._fit_martin = self._get_total_performance()
        self._trained = True

    def predict(self, pips_y: list) -> int:
        """Classify a PIP pattern. Returns 1 (long), -1 (short), or 0 (neutral)."""
        if not self._trained or not self._cluster_centers:
            return 0

        norm_y = (np.array(pips_y) - np.mean(pips_y)) / max(np.std(pips_y), 1e-10)
        best_dist = 1e30
        best_clust = -1
        for clust_i, center in enumerate(self._cluster_centers):
            dist = float(np.linalg.norm(norm_y - np.array(center)))
            if dist < best_dist:
                best_dist = dist
                best_clust = clust_i

        if best_clust in self._selected_long:
            return 1
        elif best_clust in self._selected_short:
            return -1
        return 0

    def permutation_test(self, arr: np.ndarray, n_reps: int = 100):
        """Monte Carlo permutation test for statistical significance."""
        perm_martins: list[float] = []
        data_copy = arr.copy()
        returns_copy = self._returns.copy()

        for rep in range(n_reps):
            x = np.diff(data_copy)
            np.random.shuffle(x)
            x = np.concatenate([np.array([data_copy[0]]), x])
            shuffled = np.cumsum(x)
            self._data = shuffled
            self._returns = pd.Series(shuffled).diff().shift(-1)

            self._find_unique_patterns()
            if len(self._unique_pip_patterns) < self.min_clusters:
                continue

            from pyclustering.cluster.silhouette import silhouette_ksearch, silhouette_ksearch_type

            search_instance = silhouette_ksearch(
                self._unique_pip_patterns,
                self.min_clusters,
                self.max_clusters,
                algorithm=silhouette_ksearch_type.KMEANS,
            ).process()

            amount = search_instance.get_amount()
            self._kmeans_cluster_patterns(amount)
            self._assign_clusters()
            perm_martin = self._get_total_performance()
            perm_martins.append(perm_martin)

        self._perm_martins = perm_martins
        return perm_martins

    # ── Internal helpers ──────────────────────

    def _find_unique_patterns(self):
        self._unique_pip_indices.clear()
        self._unique_pip_patterns.clear()

        last_pips_x = [0] * self.n_pips
        for i in range(self.lookback - 1, len(self._data) - self._hold_period):
            start_i = i - self.lookback + 1
            window = self._data[start_i: i + 1]
            pips_x, pips_y = find_pips(window, self.n_pips, 3)
            pips_x = [j + start_i for j in pips_x]

            same = True
            for j in range(1, self.n_pips - 1):
                if pips_x[j] != last_pips_x[j]:
                    same = False
                    break

            if not same:
                pips_y_norm = list((np.array(pips_y) - np.mean(pips_y)) / max(np.std(pips_y), 1e-10))
                self._unique_pip_patterns.append(pips_y_norm)
                self._unique_pip_indices.append(i)

            last_pips_x = pips_x

    def _kmeans_cluster_patterns(self, amount_clusters: int):
        from pyclustering.cluster.center_initializer import kmeans_plusplus_initializer
        from pyclustering.cluster.kmeans import kmeans

        initial_centers = kmeans_plusplus_initializer(self._unique_pip_patterns, amount_clusters).initialize()
        kmeans_instance = kmeans(self._unique_pip_patterns, initial_centers)
        kmeans_instance.process()
        self._pip_clusters = kmeans_instance.get_clusters()
        self._cluster_centers = kmeans_instance.get_centers()

    def _assign_clusters(self):
        self._selected_long.clear()
        self._selected_short.clear()
        self._cluster_martins = []

        for clust_i in range(len(self._pip_clusters)):
            sig = np.zeros(len(self._data))
            for mem in self._pip_clusters[clust_i]:
                arr_i = self._unique_pip_indices[mem]
                sig[arr_i: arr_i + self._hold_period] = 1.0
            sig_ret = self._returns * sig
            sig_ret = sig_ret.dropna().values if hasattr(sig_ret, 'dropna') else sig_ret[~np.isnan(sig_ret)]
            if len(sig_ret) == 0:
                self._cluster_martins.append(0.0)
                continue
            martin = _get_martin(sig_ret)
            self._cluster_martins.append(martin)

        if self._cluster_martins:
            best_long = int(np.argmax(self._cluster_martins))
            best_short = int(np.argmin(self._cluster_martins))
            self._selected_long.append(best_long)
            self._selected_short.append(best_short)

    def _get_total_performance(self) -> float:
        long_signal = np.zeros(len(self._data))
        short_signal = np.zeros(len(self._data))

        for clust_i in range(len(self._pip_clusters)):
            if clust_i in self._selected_long:
                for mem in self._pip_clusters[clust_i]:
                    arr_i = self._unique_pip_indices[mem]
                    long_signal[arr_i: arr_i + self._hold_period] += 1.0
            elif clust_i in self._selected_short:
                for mem in self._pip_clusters[clust_i]:
                    arr_i = self._unique_pip_indices[mem]
                    short_signal[arr_i: arr_i + self._hold_period] += 1.0

        if self._selected_long:
            long_signal /= len(self._selected_long)
        if self._selected_short:
            short_signal /= len(self._selected_short)
        short_signal *= -1

        rets = (long_signal + short_signal) * self._returns
        rets = rets.dropna().values if hasattr(rets, 'dropna') else rets[~np.isnan(rets)]
        if len(rets) == 0:
            return 0.0
        return _get_martin(rets)
