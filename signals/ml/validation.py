from __future__ import annotations

import numpy as np
from typing import Optional


class MonteCarloPermutationTest:
    """Statistical significance test for pattern mining strategies.

    Ported from TechnicalAnalysisAutomation/pip_pattern_miner.py's
    permutation_test method. Answers the question:

    "Is this pattern's performance better than random?"

    Shuffles price changes to destroy temporal structure while preserving
    return distribution, then re-runs the strategy and compares actual
    performance against the permutation distribution.
    """

    def __init__(self, n_reps: int = 200, random_state: int = 42):
        self.n_reps = n_reps
        self.random_state = random_state
        self._permutation_scores: list[float] = []
        self._actual_score: float = 0.0
        self._p_value: float = 1.0
        self._mean_perm: float = 0.0
        self._std_perm: float = 0.0

    @property
    def p_value(self) -> float:
        return self._p_value

    @property
    def actual_score(self) -> float:
        return self._actual_score

    @property
    def is_significant(self) -> bool:
        return self._p_value < 0.05

    @property
    def permutation_scores(self) -> list[float]:
        return list(self._permutation_scores)

    def test(
        self,
        prices: np.ndarray,
        compute_score_fn,
        *args,
        **kwargs,
    ) -> float:
        """Run Monte Carlo permutation test.

        Parameters
        ----------
        prices : 1D array of prices (not returns).
        compute_score_fn : callable(prices, *args, **kwargs) -> float
            Function that computes a performance score on price data.
            Higher = better. Called once on actual data and n_reps times
            on shuffled data.

        Returns
        -------
        p_value : float in [0, 1]. Proportion of permutations with
                  score >= actual score.
        """
        rng = np.random.default_rng(self.random_state)

        returns = np.diff(np.log(np.maximum(prices, 1e-10)))
        actual_score = compute_score_fn(prices, *args, **kwargs)
        self._actual_score = actual_score

        perm_scores: list[float] = []
        for _ in range(self.n_reps):
            shuffled_returns = returns.copy()
            rng.shuffle(shuffled_returns)

            shuffled_prices = np.empty_like(prices)
            shuffled_prices[0] = prices[0]
            for j in range(1, len(prices)):
                shuffled_prices[j] = shuffled_prices[j - 1] * np.exp(shuffled_returns[j - 1])

            perm_score = compute_score_fn(shuffled_prices, *args, **kwargs)
            perm_scores.append(perm_score)

        self._permutation_scores = perm_scores
        self._mean_perm = float(np.mean(perm_scores))
        self._std_perm = float(np.std(perm_scores))

        n_extreme = sum(1 for s in perm_scores if s >= actual_score)
        self._p_value = min((n_extreme + 1) / (self.n_reps + 1), 1.0)

        return self._p_value

    def summary(self) -> dict:
        return {
            "actual_score": round(self._actual_score, 4),
            "mean_permutation": round(self._mean_perm, 4),
            "std_permutation": round(self._std_perm, 4),
            "p_value": round(self._p_value, 4),
            "is_significant": self.is_significant,
            "n_reps": self.n_reps,
        }
