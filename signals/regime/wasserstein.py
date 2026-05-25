"""Wasserstein distance-based market regime clustering with MMD validation.
Upgraded from CLUSTERING-MARKET-REGIMES-main to include:
- Full WassersteinKMeans with n_init / convergence
- MomentKMeans benchmark
- MMD validation (gaussian kernel, self-similarity, between-cluster MMD)
- Crisis detection with severity scoring
"""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from core.enums import RegimeType, SignalType
from core.types import RegimeState
from signals.base import SignalEngine
from signals.regime.validation import compute_cluster_validation_metrics

# ──────────────────────────────────────────────
#  DISTANCE FUNCTIONS
# ──────────────────────────────────────────────


def wasserstein_dist(mu: np.ndarray, nu: np.ndarray, p: float = 1.0) -> float:
    """Wasserstein-p distance between two 1D empirical distributions.

    Parameters
    ----------
    mu, nu : 1D arrays of empirical samples (may differ in length).
    p : order of the Wasserstein metric (1 = W1, 2 = W2, inf = max).

    Returns
    -------
    scalar distance.
    """
    mu = np.asarray(mu, dtype=float)
    nu = np.asarray(nu, dtype=float)
    n = max(len(mu), len(nu))
    q = np.linspace(0, 1, n + 1)[1:]
    mq = np.quantile(mu, q)
    nq = np.quantile(nu, q)
    diff = np.abs(mq - nq)
    if p == 1:
        return float(np.mean(diff))
    elif p == np.inf:
        return float(np.max(diff))
    else:
        return float(np.mean(diff ** p) ** (1.0 / p))


def wasserstein_barycenter(
    distributions: list[np.ndarray], p: float = 1.0
) -> np.ndarray:
    """Approximate Wasserstein-p barycenter via element-wise median of quantiles.

    Exact for p=1; approximation for p>1.
    """
    dists = [np.sort(d) for d in distributions]
    n = max(len(d) for d in dists)
    q = np.linspace(0, 1, n + 1)[1:]
    qv = np.array([np.quantile(d, q) for d in dists])
    return np.median(qv, axis=0)


# ──────────────────────────────────────────────
#  MMD FUNCTIONS (Maximum Mean Discrepancy)
# ──────────────────────────────────────────────


def gaussian_kernel(x: np.ndarray, y: np.ndarray, sigma: float = 1.0) -> np.ndarray:
    """RBF / Gaussian kernel between rows of x and y.

    Parameters
    ----------
    x : (m, d) or (d,) array.
    y : (n, d) or (d,) array.

    Returns
    -------
    K : (m, n) Gram matrix.
    """
    x = np.atleast_2d(np.asarray(x, dtype=float))
    y = np.atleast_2d(np.asarray(y, dtype=float))
    diff = x[:, np.newaxis, :] - y[np.newaxis, :, :]
    sq_dists = np.sum(diff ** 2, axis=-1)
    return np.exp(-sq_dists / (2.0 * sigma ** 2))


def compute_mmd_biased(
    X: np.ndarray, Y: np.ndarray, sigma: float = 1.0
) -> float:
    """Biased MMD estimator between two sets of samples.

    MMD_b^2 = 1/m^2 sum_ij K(x_i,x_j) + 1/n^2 sum_ij K(y_i,y_j)
              - 2/(mn) sum_ij K(x_i,y_j)

    Returns MMD (sqrt of squared MMD), always >= 0.
    """
    m = len(X)
    n = len(Y)
    if m == 0 or n == 0:
        return 0.0
    K_xx = gaussian_kernel(X, X, sigma)
    K_yy = gaussian_kernel(Y, Y, sigma)
    K_xy = gaussian_kernel(X, Y, sigma)
    mmd2 = (
        K_xx.sum() / (m * m)
        + K_yy.sum() / (n * n)
        - 2.0 * K_xy.sum() / (m * n)
    )
    return float(np.sqrt(max(mmd2, 0.0)))


def compute_mmd_fast(
    X: np.ndarray, Y: np.ndarray, sigma: float = 1.0
) -> float:
    """Faster (biased) MMD using the quadratic expansion trick.

    Equivalent to compute_mmd_biased but structured for clarity
    as the primary vectorized implementation.
    """
    return compute_mmd_biased(X, Y, sigma)


def compute_self_similarity(
    cluster_data: np.ndarray, sigma: float = 1.0, n_splits: int = 5
) -> float:
    """Self-similarity of a cluster via MMD between random splits.

    Lower values = more homogeneous / compact cluster.
    Higher values = more diffuse / heterogeneous cluster.

    Parameters
    ----------
    cluster_data : (n_samples, n_features) array.
    sigma : kernel bandwidth.
    n_splits : number of random split trials.

    Returns
    -------
    mean MMD across splits.
    """
    n = len(cluster_data)
    if n < 4:
        return 0.0
    scores = []
    for _ in range(n_splits):
        perm = np.random.permutation(n)
        half = n // 2
        X = cluster_data[perm[:half]]
        Y = cluster_data[perm[half : 2 * half]]
        scores.append(compute_mmd_fast(X, Y, sigma))
    return float(np.mean(scores))


def compute_between_cluster_mmd(
    clusters: list[np.ndarray], sigma: float = 1.0
) -> float:
    """Average pairwise MMD between all cluster pairs.

    Higher values = better cluster separation.

    Parameters
    ----------
    clusters : list of (n_k, d) arrays.
    sigma : kernel bandwidth.

    Returns
    -------
    mean MMD across all cluster pairs.
    """
    K = len(clusters)
    if K < 2:
        return 0.0
    scores = []
    for i in range(K):
        for j in range(i + 1, K):
            if len(clusters[i]) > 0 and len(clusters[j]) > 0:
                scores.append(compute_mmd_fast(clusters[i], clusters[j], sigma))
    return float(np.mean(scores)) if scores else 0.0


# ──────────────────────────────────────────────
#  WASSERSTEIN K-MEANS
# ──────────────────────────────────────────────


class WassersteinKMeans:
    """K-means clustering using Wasserstein distance as the metric.

    Operates on 1D empirical distributions (arrays of samples).
    """

    def __init__(
        self,
        n_clusters: int = 2,
        p: float = 1.0,
        max_iter: int = 100,
        n_init: int = 10,
        tol: float = 1e-4,
        random_state: int = 42,
    ):
        self.n_clusters = n_clusters
        self.p = p
        self.max_iter = max_iter
        self.n_init = n_init
        self.tol = tol
        self.random_state = random_state

        self.cluster_centers_: list[np.ndarray] = []
        self.labels_: np.ndarray = np.array([], dtype=int)
        self.inertia_: float = 0.0
        self.n_iter_: int = 0
        self.n_init_used_: int = 0

    def fit(self, distributions: list[np.ndarray]) -> WassersteinKMeans:
        """Fit WK-means to a list of 1D distributions (sliding windows).

        Runs n_init restarts and keeps the one with lowest inertia.

        Parameters
        ----------
        distributions : list of 1D numpy arrays.

        Returns
        -------
        self
        """
        n = len(distributions)
        if n < self.n_clusters:
            raise ValueError(
                f"Number of distributions ({n}) < n_clusters ({self.n_clusters})"
            )

        rng = np.random.default_rng(self.random_state)
        best_inertia = np.inf
        best_labels: Optional[np.ndarray] = None
        best_centroids: Optional[list[np.ndarray]] = None
        best_n_iter = 0
        n_init_used = 0

        for init_attempt in range(self.n_init):
            # Initialize: pick random distributions as centroids
            indices = rng.choice(n, size=self.n_clusters, replace=False)
            centroids = [np.sort(distributions[i]).copy() for i in indices]

            prev_loss = np.inf
            for iteration in range(self.max_iter):
                # Assignment step
                labels = np.array([
                    int(np.argmin([wasserstein_dist(w, c, self.p) for c in centroids]))
                    for w in distributions
                ])

                # Update step
                new_centroids: list[np.ndarray] = []
                empty_cluster = False
                for k in range(self.n_clusters):
                    cluster = [distributions[i] for i in range(n) if labels[i] == k]
                    if cluster:
                        new_centroids.append(wasserstein_barycenter(cluster, self.p))
                    else:
                        new_centroids.append(centroids[k])
                        empty_cluster = True

                centroids = new_centroids

                # Convergence check
                inertia = sum(
                    wasserstein_dist(distributions[i], centroids[labels[i]], self.p)
                    for i in range(n)
                )
                if empty_cluster:
                    prev_loss = inertia
                    continue

                if np.isfinite(prev_loss):
                    loss_change = abs(prev_loss - inertia) / max(prev_loss, 1e-12)
                    if loss_change < self.tol:
                        break
                prev_loss = inertia

            n_init_used += 1
            if inertia < best_inertia:
                best_inertia = inertia
                best_labels = labels.copy()
                best_centroids = centroids
                best_n_iter = iteration + 1

        assert best_labels is not None
        assert best_centroids is not None

        self.labels_ = best_labels
        self.cluster_centers_ = best_centroids
        self.inertia_ = best_inertia
        self.n_iter_ = best_n_iter
        self.n_init_used_ = n_init_used
        return self

    def predict(self, distributions: list[np.ndarray]) -> np.ndarray:
        """Assign each distribution to the nearest centroid."""
        if not self.cluster_centers_:
            raise RuntimeError("Call fit() before predict().")
        return np.array([
            int(np.argmin([wasserstein_dist(w, c, self.p) for c in self.cluster_centers_]))
            for w in distributions
        ])

    def fit_predict(self, distributions: list[np.ndarray]) -> np.ndarray:
        """Fit and return labels in one call."""
        self.fit(distributions)
        return self.labels_

    def score(self, distributions: list[np.ndarray]) -> float:
        """Negative inertia (higher is better for consistency with sklearn)."""
        if not self.cluster_centers_:
            raise RuntimeError("Call fit() before score().")
        labels = self.predict(distributions)
        inertia = sum(
            wasserstein_dist(distributions[i], self.cluster_centers_[labels[i]], self.p)
            for i in range(len(distributions))
        )
        return -inertia


# ──────────────────────────────────────────────
#  MOMENT K-MEANS (Benchmark)
# ──────────────────────────────────────────────


class MomentKMeans:
    """Benchmark clustering using moment features (mean, std, skew, kurtosis)
    with standard Euclidean K-means. Provides a comparison baseline against
    WassersteinKMeans.
    """

    def __init__(
        self,
        n_clusters: int = 2,
        max_iter: int = 100,
        n_init: int = 10,
        tol: float = 1e-4,
        random_state: int = 42,
    ):
        self.n_clusters = n_clusters
        self.max_iter = max_iter
        self.n_init = n_init
        self.tol = tol
        self.random_state = random_state

        self.cluster_centers_: np.ndarray = np.array([])
        self.labels_: np.ndarray = np.array([], dtype=int)
        self.inertia_: float = 0.0

    @staticmethod
    def extract_features(distributions: list[np.ndarray]) -> np.ndarray:
        """Convert each distribution to a 4-D feature vector: [mean, std, skew, kurt]."""
        features = []
        for d in distributions:
            d = np.asarray(d, dtype=float)
            mu = np.mean(d)
            sigma = np.std(d)
            if sigma < 1e-12:
                skew = 0.0
                kurt = 0.0
            else:
                z = (d - mu) / sigma
                skew = float(np.mean(z ** 3))
                kurt = float(np.mean(z ** 4) - 3.0)
            features.append([mu, sigma, skew, kurt])
        return np.array(features, dtype=float)

    def fit(self, distributions: list[np.ndarray]) -> MomentKMeans:
        """Fit standard K-means on moment features.

        Parameters
        ----------
        distributions : list of 1D numpy arrays.

        Returns
        -------
        self
        """
        X = self.extract_features(distributions)
        n, d = X.shape
        if n < self.n_clusters:
            raise ValueError(
                f"Number of samples ({n}) < n_clusters ({self.n_clusters})"
            )

        rng = np.random.default_rng(self.random_state)
        best_inertia = np.inf
        best_labels: Optional[np.ndarray] = None
        best_centroids: Optional[np.ndarray] = None

        for _ in range(self.n_init):
            indices = rng.choice(n, size=self.n_clusters, replace=False)
            centroids = X[indices].copy()

            prev_inertia = np.inf
            for _ in range(self.max_iter):
                # Assignment
                dists = np.array([
                    [np.sum((x - c) ** 2) for c in centroids]
                    for x in X
                ])
                labels = np.argmin(dists, axis=1)

                # Update
                new_centroids = np.zeros_like(centroids)
                for k in range(self.n_clusters):
                    mask = labels == k
                    if np.any(mask):
                        new_centroids[k] = X[mask].mean(axis=0)
                    else:
                        new_centroids[k] = centroids[k]

                # Convergence
                inertia = sum(
                    np.sum((X[i] - new_centroids[labels[i]]) ** 2) for i in range(n)
                )
                if np.isfinite(prev_inertia):
                    loss_change = abs(prev_inertia - inertia) / max(prev_inertia, 1e-12)
                    if loss_change < self.tol:
                        break
                prev_inertia = inertia
                centroids = new_centroids

            if inertia < best_inertia:
                best_inertia = inertia
                best_labels = labels.copy()
                best_centroids = centroids.copy()

        assert best_labels is not None
        assert best_centroids is not None
        self.labels_ = best_labels
        self.cluster_centers_ = best_centroids
        self.inertia_ = best_inertia
        return self

    def predict(self, distributions: list[np.ndarray]) -> np.ndarray:
        """Assign each distribution to the nearest moment centroid."""
        if self.cluster_centers_.size == 0:
            raise RuntimeError("Call fit() before predict().")
        X = self.extract_features(distributions)
        dists = np.array([
            [np.sum((x - c) ** 2) for c in self.cluster_centers_]
            for x in X
        ])
        return np.argmin(dists, axis=1)

    def fit_predict(self, distributions: list[np.ndarray]) -> np.ndarray:
        self.fit(distributions)
        return self.labels_


# ──────────────────────────────────────────────
#  CRISIS DETECTION UTILITIES
# ──────────────────────────────────────────────


def order_clusters_by_variance(
    windows: list[np.ndarray],
    labels: np.ndarray,
    n_clusters: int,
) -> np.ndarray:
    """Return a permutation array that orders cluster indices by ascending variance.

    Example
    -------
    ordered = order_clusters_by_variance(windows, labels, 3)
    # ordered[0] = low-vol cluster id, ordered[1] = mid, ordered[2] = high-vol cluster id
    """
    cluster_vars = []
    for k in range(n_clusters):
        mask = labels == k
        if np.any(mask):
            cluster_windows = [windows[i] for i in range(len(windows)) if mask[i]]
            cluster_vars.append(np.mean([np.var(w) for w in cluster_windows]))
        else:
            cluster_vars.append(0.0)
    return np.argsort(cluster_vars)


KNOWN_CRISIS_PERIODS: dict[str, str] = {
    "2008": "Global Financial Crisis",
    "2020-02": "COVID-19 Crash",
    "2022": "Post-COVID Rate Hike / Crypto Winter",
    "2024-08": "Yen Carry Trade Unwind",
    "2025-12": "AI Correction / Liquidation Event",
}


# ──────────────────────────────────────────────
#  WASSERSTEIN REGIME ENGINE
# ──────────────────────────────────────────────


class WassersteinRegimeEngine(SignalEngine):
    """Wasserstein distance-based market regime clustering with MMD validation
    and crisis detection.

    Uses distribution-based clustering on sliding windows of log-returns
    to detect volatility/trend regimes. Validates clusters via MMD and
    provides crisis probability scoring.

    Parameters
    ----------
    n_clusters : int
        Number of regime clusters (default 2: low-vol / high-vol).
    h1 : int
        Window size for each distribution (bars).
    h2 : int
        Step size between windows. If h2 <= 0, uses h1 (non-overlapping).
    p : float
        Wasserstein order (1 = W1, 2 = W2, inf = max).
    random_state : int
        Seed for reproducibility.
    """

    def __init__(
        self,
        n_clusters: int = 2,
        h1: int = 35,
        h2: int = 28,
        p: float = 1.0,
        random_state: int = 42,
    ):
        super().__init__()
        self.n_clusters = n_clusters
        self.h1 = h1
        self.h2 = h2
        self.p = p
        self.random_state = random_state

        self._model: Optional[WassersteinKMeans] = None
        self._moment_model: Optional[MomentKMeans] = None
        self._windows: list[np.ndarray] = []
        self._labels: np.ndarray = np.array([], dtype=int)
        self._cluster_centers: list[np.ndarray] = []
        self._current_cluster: int = 0
        self._ordered_cluster: int = 0
        self._crisis_probability: float = 0.0
        self._validation_metrics: dict[str, float] = {}
        self._mmd_self_sim: float = 0.0
        self._mmd_separation: float = 0.0
        self._outlier_score: float = 0.0
        self._regime_state: RegimeState = RegimeState(
            primary=RegimeType.RANGE_BOUND, confidence=0.0
        )

    @property
    def signal_type(self) -> SignalType:
        return SignalType.REGIME

    def compute(self, bars: pd.DataFrame) -> list:
        """Full computation from OHLCV DataFrame.

        Parameters
        ----------
        bars : pd.DataFrame with columns (open, high, low, close, volume).

        Returns
        -------
        list of QuantSignal with regime classification.
        """
        df = bars.copy()
        df.columns = [c.lower() for c in df.columns]
        symbol = df.attrs.get("symbol", "")
        timeframe = df.attrs.get("timeframe", "")

        returns = np.diff(np.log(df["close"].values))
        if len(returns) < self.h1:
            return []

        windows = self._create_sliding_windows(returns, self.h1, self.h2)
        if len(windows) < self.n_clusters:
            return []

        self._windows = windows

        # ── Fit WassersteinKMeans ──────────────────────────
        model = WassersteinKMeans(
            n_clusters=self.n_clusters,
            p=self.p,
            max_iter=100,
            n_init=10,
            tol=1e-4,
            random_state=self.random_state,
        )
        model.fit(windows)
        self._model = model
        self._labels = model.labels_
        self._cluster_centers = model.cluster_centers_

        # ── Fit MomentKMeans benchmark ──────────────────────
        moment_model = MomentKMeans(
            n_clusters=self.n_clusters,
            random_state=self.random_state,
        )
        moment_model.fit(windows)
        self._moment_model = moment_model

        # ── Classify current regime ─────────────────────────
        latest_window = windows[-1]
        distances = [
            wasserstein_dist(latest_window, c, self.p) for c in self._cluster_centers
        ]
        self._current_cluster = int(np.argmin(distances))

        # Variance ordering: consistent 0=low, N-1=high
        ordered = order_clusters_by_variance(
            windows, self._labels, self.n_clusters
        )
        self._ordered_cluster = int(np.where(ordered == self._current_cluster)[0][0])

        # ── MMD validation ──────────────────────────────────
        windows_arr = np.array(windows)
        cluster_data = [
            windows_arr[self._labels == k]
            for k in range(self.n_clusters)
        ]

        sigma = self._estimate_sigma(windows_arr)

        # Self-similarity for each cluster (lower = more homogeneous)
        self_sims = []
        for k in range(self.n_clusters):
            if len(cluster_data[k]) >= 4:
                self_sims.append(
                    compute_self_similarity(cluster_data[k], sigma=sigma)
                )
            else:
                self_sims.append(0.0)
        self._mmd_self_sim = float(np.mean(self_sims))

        # Between-cluster separation (higher = better)
        self._mmd_separation = compute_between_cluster_mmd(cluster_data, sigma=sigma)

        # Outlier score: Wasserstein distance of current window
        # relative to within-cluster distances
        current_centroid = self._cluster_centers[self._current_cluster]
        current_dist_to_centroid = wasserstein_dist(
            latest_window, current_centroid, self.p
        )

        # Within-cluster distances for the current cluster
        cluster_indices = np.where(self._labels == self._current_cluster)[0]
        if len(cluster_indices) > 1:
            within_dists = [
                wasserstein_dist(windows[i], current_centroid, self.p)
                for i in cluster_indices
            ]
            mean_within = float(np.mean(within_dists))
            std_within = float(np.std(within_dists)) + 1e-12
            # Z-score-like outlier measure, clamped to [0, 1]
            z = (current_dist_to_centroid - mean_within) / std_within
            self._outlier_score = float(min(max((z - 0.5) / 2.5, 0.0), 1.0))
        else:
            self._outlier_score = 0.0

        # ── Cluster validation metrics ─────────────────────
        self._validation_metrics = compute_cluster_validation_metrics(
            windows, self._labels, self._cluster_centers, self.p
        )

        # ── Crisis probability ──────────────────────────────
        self._crisis_probability = self._compute_crisis_probability()

        # ── Regime classification ───────────────────────────
        regime_type, confidence = self._classify_regime()

        # If crisis probability is very high, override
        if self._crisis_probability > 0.6:
            regime_type = RegimeType.CRISIS
            confidence = max(confidence, self._crisis_probability)

        self._regime_state = RegimeState(
            primary=regime_type,
            confidence=float(confidence),
            wasserstein_cluster=self._current_cluster,
            vol_regime=(
                "high" if self._ordered_cluster >= self.n_clusters - 1 else "low"
            ),
            metadata={
                "ordered_cluster": int(self._ordered_cluster),
                "crisis_probability": float(self._crisis_probability),
                "outlier_score": float(self._outlier_score),
                "mmd_self_similarity": float(self._mmd_self_sim),
                "mmd_separation": float(self._mmd_separation),
                "davies_bouldin": self._validation_metrics.get("davies_bouldin", 0.0),
                "dunn_index": self._validation_metrics.get("dunn_index", 0.0),
                "silhouette": self._validation_metrics.get("silhouette", 0.0),
                "inertia": float(model.inertia_),
                "n_iter": int(model.n_iter_),
            },
        )

        signals = [
            self._make_signal(
                direction=0,
                strength=float(confidence),
                confidence=float(confidence),
                symbol=symbol,
                timeframe=timeframe,
                price=float(df["close"].iloc[-1]),
                metadata={
                    "regime": regime_type.value,
                    "cluster": self._current_cluster,
                    "ordered_cluster": int(self._ordered_cluster),
                    "crisis_probability": float(self._crisis_probability),
                },
            )
        ]
        self._store_signals(signals)
        return signals

    def get_regime_state(self) -> RegimeState:
        return self._regime_state

    def get_crisis_probability(self) -> float:
        """Return the current crisis probability in [0.0, 1.0].

        Combines:
        - Whether current cluster is high-volatility
        - MMD self-similarity of the current cluster (low homogeneity = crisis)
        - Outlier score of the current window vs. its centroid
        """
        return self._crisis_probability

    def get_validation_metrics(self) -> dict[str, float]:
        """Return the latest cluster validation metrics dict."""
        return dict(self._validation_metrics)

    def get_mmd_metrics(self) -> dict[str, float]:
        """Return MMD-based validation metrics."""
        return {
            "self_similarity": float(self._mmd_self_sim),
            "separation": float(self._mmd_separation),
            "outlier_score": float(self._outlier_score),
        }

    # ── Private helpers ────────────────────────────────────

    def _create_sliding_windows(
        self, returns: np.ndarray, h1: int, h2: int
    ) -> list[np.ndarray]:
        windows = []
        i = 0
        while i + h1 <= len(returns):
            windows.append(returns[i : i + h1])
            i += h2 if h2 > 0 else h1
        return windows

    @staticmethod
    def _estimate_sigma(windows: np.ndarray) -> float:
        """Heuristic bandwidth: median pairwise Euclidean distance / sqrt(2)."""
        if windows.ndim == 1:
            return 1.0
        n = min(len(windows), 200)  # cap for speed
        sample = windows[:n]
        # Median of pairwise distances (sampled)
        dists = []
        rng = np.random.default_rng(42)
        for _ in range(min(500, n * n)):
            i, j = rng.integers(0, n, size=2)
            if i != j:
                dists.append(float(np.linalg.norm(sample[i] - sample[j])))
        if not dists:
            return 1.0
        median_dist = float(np.median(dists))
        return max(median_dist / np.sqrt(2.0) if median_dist > 1e-12 else 1.0, 0.01)

    def _compute_crisis_probability(self) -> float:
        """Compute crisis probability from cluster and MMD metrics.

        Factors:
        - vol_factor: whether current cluster is the highest-vol cluster (0 or 0.5)
        - mmd_factor: self-similarity of current cluster (low = chaotic = crisis)
          mapped as 1/(1 + self_sim) → crisis when self_sim is low
        - outlier_factor: how far current window is from its centroid

        Returns
        -------
        score in [0.0, 1.0].
        """
        # Volatility factor: highest-vol cluster is crisis-prone
        n = self.n_clusters
        vol_factor = float(self._ordered_cluster) / float(n - 1) if n > 1 else 0.5

        # MMD self-similarity: lower values → more chaotic → crisis
        # Map: crisis ~ 1 / (1 + self_sim) normalized
        mmd_factor = 1.0 / (1.0 + self._mmd_self_sim + 1e-12)

        # Outlier score: already in [0, 1]
        outlier_factor = self._outlier_score

        # Weighted combination
        prob = 0.35 * vol_factor + 0.30 * mmd_factor + 0.35 * outlier_factor
        return float(min(max(prob, 0.0), 1.0))

    def _classify_regime(self) -> tuple[RegimeType, float]:
        """Classify the current regime based on ordered cluster and confidence."""
        # Compute a confidence score from cluster tightness
        w = self._windows
        n_clusters = self.n_clusters

        # Within-cluster mean Wasserstein distance to centroid
        within_dists = []
        for k in range(n_clusters):
            members = [
                w[i] for i in range(len(w)) if self._labels[i] == k
            ]
            if members:
                within_dists.append(
                    float(np.mean([
                        wasserstein_dist(m, self._cluster_centers[k], self.p)
                        for m in members
                    ]))
                )
            else:
                within_dists.append(0.0)

        between_dists = []
        for i in range(n_clusters):
            for j in range(i + 1, n_clusters):
                between_dists.append(
                    wasserstein_dist(
                        self._cluster_centers[i],
                        self._cluster_centers[j],
                        self.p,
                    )
                )

        avg_within = float(np.mean(within_dists)) if within_dists else 0.0
        avg_between = float(np.mean(between_dists)) if between_dists else 1.0

        # Separation ratio: higher = better clusters
        sep_ratio = avg_between / max(avg_within, 1e-12)
        confidence = float(min(max((sep_ratio - 1.0) / 5.0, 0.0), 1.0))

        # Assign regime type by ordered cluster
        if self._ordered_cluster >= n_clusters - 1:
            regime = RegimeType.HIGH_VOLATILITY
        elif self._ordered_cluster <= 0:
            regime = RegimeType.LOW_VOLATILITY
        else:
            regime = RegimeType.TRANSITION

        return regime, confidence
