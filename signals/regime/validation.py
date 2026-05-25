"""Standalone cluster validation metrics for regime detection.
Can be used by WassersteinRegimeEngine or any other clustering engine.
"""
from __future__ import annotations

import numpy as np


def _wasserstein_dist(mu: np.ndarray, nu: np.ndarray, p: float = 1.0) -> float:
    """Wasserstein-p distance between two 1D empirical distributions."""
    mu_s = np.sort(mu)
    nu_s = np.sort(nu)
    n = max(len(mu_s), len(nu_s))
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


def _pairwise_wasserstein_matrix(
    distributions: list[np.ndarray], p: float = 1.0
) -> np.ndarray:
    """Compute pairwise Wasserstein distance matrix."""
    n = len(distributions)
    D = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            d = _wasserstein_dist(distributions[i], distributions[j], p)
            D[i, j] = d
            D[j, i] = d
    return D


def compute_davies_bouldin(
    distributions: list[np.ndarray],
    labels: np.ndarray,
    centroids: list[np.ndarray],
    p: float = 1.0,
) -> float:
    """Davies-Bouldin Index. Lower is better (tighter, well-separated clusters).

    DBI = (1/K) * sum_k max_{j!=k} (s_k + s_j) / d_ij
    where s_k = mean intra-cluster distance to centroid, d_ij = centroid distance.
    """
    K = len(centroids)
    if K < 2:
        return 0.0

    # Scatter within each cluster
    scatter = np.zeros(K)
    for k in range(K):
        members = [distributions[i] for i in range(len(distributions)) if labels[i] == k]
        if len(members) < 2:
            scatter[k] = 0.0
        else:
            scatter[k] = np.mean([_wasserstein_dist(m, centroids[k], p) for m in members])

    # Centroid distances
    centroid_dists = np.zeros((K, K))
    for i in range(K):
        for j in range(K):
            if i != j:
                centroid_dists[i, j] = _wasserstein_dist(centroids[i], centroids[j], p)

    ratios = np.zeros(K)
    for k in range(K):
        vals = []
        for j in range(K):
            if j != k and centroid_dists[k, j] > 1e-12:
                vals.append((scatter[k] + scatter[j]) / centroid_dists[k, j])
        ratios[k] = max(vals) if vals else 0.0

    return float(np.mean(ratios))


def compute_dunn_index(
    distributions: list[np.ndarray],
    labels: np.ndarray,
    centroids: list[np.ndarray],
    p: float = 1.0,
) -> float:
    """Dunn Index. Higher is better (well-separated, compact clusters).

    Dunn = min_{i<j} d(c_i, c_j) / max_k diam(C_k)
    """
    K = len(centroids)
    if K < 2:
        return 0.0

    cluster_members: list[list[int]] = [[] for _ in range(K)]
    for i, lbl in enumerate(labels):
        cluster_members[lbl].append(i)

    # Intra-cluster diameters (max distance within each cluster)
    diameters = np.zeros(K)
    for k in range(K):
        idx = cluster_members[k]
        if len(idx) < 2:
            diameters[k] = 0.0
            continue
        max_d = 0.0
        for a in range(len(idx)):
            for b in range(a + 1, len(idx)):
                d = _wasserstein_dist(distributions[idx[a]], distributions[idx[b]], p)
                if d > max_d:
                    max_d = d
        diameters[k] = max_d

    max_diameter = max(diameters) if np.any(diameters > 0) else 1.0

    # Inter-cluster distances (centroid-based)
    min_inter = np.inf
    for i in range(K):
        for j in range(i + 1, K):
            d = _wasserstein_dist(centroids[i], centroids[j], p)
            if d < min_inter:
                min_inter = d

    if max_diameter < 1e-12 or min_inter == np.inf:
        return 0.0

    return float(min_inter / max_diameter)


def compute_silhouette(
    distributions: list[np.ndarray],
    labels: np.ndarray,
    p: float = 1.0,
) -> float:
    """Mean Silhouette coefficient. Higher is better ([-1, 1]).

    s(i) = (b(i) - a(i)) / max(a(i), b(i))
    where a(i) = mean distance to same-cluster points,
          b(i) = min mean distance to other-cluster points.
    """
    n = len(distributions)
    K = len(set(labels))
    if K < 2 or n < 2:
        return 0.0

    cluster_members: list[list[int]] = [[] for _ in range(K)]
    for i, lbl in enumerate(labels):
        cluster_members[lbl].append(i)

    # Precompute pairwise distances
    D = _pairwise_wasserstein_matrix(distributions, p)

    scores = []
    for i in range(n):
        k = labels[i]
        a_i = _mean_distance_to_set(i, cluster_members[k], D)
        b_vals = []
        for j in range(K):
            if j == k:
                continue
            if cluster_members[j]:
                b_vals.append(_mean_distance_to_set(i, cluster_members[j], D))
        b_i = min(b_vals) if b_vals else a_i
        denom = max(a_i, b_i)
        s_i = (b_i - a_i) / denom if denom > 1e-12 else 0.0
        scores.append(s_i)

    return float(np.mean(scores))


def _mean_distance_to_set(i: int, members: list[int], D: np.ndarray) -> float:
    """Mean distance from point i to all points in member set (excluding i)."""
    if len(members) <= 1:
        return 0.0
    dists = [D[i, j] for j in members if j != i]
    return float(np.mean(dists)) if dists else 0.0


def compute_cluster_validation_metrics(
    distributions: list[np.ndarray],
    labels: np.ndarray,
    centroids: list[np.ndarray],
    p: float = 1.0,
) -> dict[str, float]:
    """Compute all cluster validation metrics and return as a dict.

    Returns
    -------
    dict with keys: davies_bouldin, dunn_index, silhouette
    """
    return {
        "davies_bouldin": compute_davies_bouldin(distributions, labels, centroids, p),
        "dunn_index": compute_dunn_index(distributions, labels, centroids, p),
        "silhouette": compute_silhouette(distributions, labels, p),
    }
