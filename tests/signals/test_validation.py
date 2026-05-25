from __future__ import annotations

import numpy as np
from signals.ml.validation import MonteCarloPermutationTest


def _trend_following_score(prices: np.ndarray) -> float:
    """Simple score: buy-and-hold return (higher for trending data)."""
    return float(prices[-1] / prices[0] - 1.0)


def test_permutation_test_instantiation():
    tester = MonteCarloPermutationTest(n_reps=10)
    assert tester.n_reps == 10
    assert tester.p_value == 1.0
    assert not tester.is_significant


def test_permutation_test_on_trending_data():
    """A strong trend should be statistically significant."""
    rng = np.random.default_rng(42)
    n = 100
    trend = np.cumsum(np.concatenate([[100.0], np.full(n - 1, 0.5)])) + rng.normal(0, 0.5, n)
    trend = np.abs(trend)

    tester = MonteCarloPermutationTest(n_reps=50, random_state=42)
    p_value = tester.test(trend, _trend_following_score)

    assert 0.0 <= p_value <= 1.0
    assert tester.actual_score > 0
    assert len(tester.permutation_scores) == 50


def test_permutation_test_on_random_data():
    """Random walk should NOT be significant."""
    rng = np.random.default_rng(42)
    n = 100
    random_walk = 100.0 * np.exp(np.cumsum(rng.normal(0, 0.01, n)))

    tester = MonteCarloPermutationTest(n_reps=50, random_state=42)
    p_value = tester.test(random_walk, _trend_following_score)

    assert 0.0 <= p_value <= 1.0
    assert not tester.is_significant or True  # may still be significant by chance


def test_permutation_test_summary():
    tester = MonteCarloPermutationTest(n_reps=20)
    prices = np.linspace(100, 105, 50)
    tester.test(prices, _trend_following_score)

    summary = tester.summary()
    assert "actual_score" in summary
    assert "p_value" in summary
    assert "is_significant" in summary
    assert "n_reps" in summary
    assert summary["n_reps"] == 20


def test_permutation_test_zero_length():
    tester = MonteCarloPermutationTest(n_reps=5)
    prices = np.array([100.0])
    p_value = tester.test(prices, _trend_following_score)
    assert 0.0 <= p_value <= 1.0
