from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_WEIGHTS = {
    "return": 0.22,
    "annual_return": 0.12,
    "sharpe": 0.18,
    "profit_factor": 0.14,
    "win_rate": 0.09,
    "drawdown": 0.15,
    "stability": 0.10,
}

_REGIME_PROFILES = {
    "bull_trend": {"return": 0.30, "sharpe": 0.16, "drawdown": 0.12},
    "bear_trend": {"sharpe": 0.20, "drawdown": 0.22, "return": 0.16},
    "range_compression": {"win_rate": 0.20, "stability": 0.20, "profit_factor": 0.18},
    "high_volatility": {"drawdown": 0.26, "profit_factor": 0.18, "sharpe": 0.16},
    "transition": {},
}


class StrategyScoringService:
    def __init__(self, custom_weights: dict[str, float] | None = None, regime: str = "transition"):
        self.weights = self._build_weights(regime, custom_weights)

    @staticmethod
    def _build_weights(regime: str, custom: dict[str, float] | None) -> dict[str, float]:
        weights = dict(_DEFAULT_WEIGHTS)
        profile = _REGIME_PROFILES.get(regime, {})
        for k, v in profile.items():
            if k in weights:
                remaining = weights[k] - v
                weights[k] = v
                if remaining > 0:
                    for other in weights:
                        if other != k:
                            weights[other] += remaining / (len(weights) - 1)
        if custom:
            for k, v in custom.items():
                if k in weights:
                    weights[k] = v
        total = sum(weights.values())
        if total > 0:
            for k in weights:
                weights[k] /= total
        return weights

    @staticmethod
    def _bounded_score(value: float, target: float, max_ratio: float = 3.0) -> float:
        ratio = value / target if target != 0 else (1.0 if value == 0 else 0)
        if value < 0:
            return 0.0
        if value == 0:
            return 10.0
        if ratio >= 2.0:
            return 100.0
        if ratio >= 1.0:
            return 80.0 + (ratio - 1.0) * 20.0
        if ratio >= 0.5:
            return 50.0 + (ratio - 0.5) * 60.0
        return ratio * 100.0

    @staticmethod
    def _inverse_score(value: float, threshold: float) -> float:
        if value <= 0:
            return 100.0
        if value >= threshold * 2:
            return 0.0
        ratio = value / threshold
        if ratio >= 1.5:
            return 10.0
        if ratio >= 1.0:
            return 30.0 + (1.5 - ratio) * 40.0
        if ratio >= 0.5:
            return 70.0 + (1.0 - ratio) * 40.0
        return 90.0 + (0.5 - ratio) * 20.0

    def score(self, metrics: dict[str, Any]) -> dict[str, Any]:
        components = {}
        components["returnScore"] = self._bounded_score(metrics.get("total_return", 0), 10.0)
        components["annualReturnScore"] = self._bounded_score(metrics.get("annual_return", 0), 15.0)
        components["sharpeScore"] = self._bounded_score(metrics.get("sharpe_ratio", 0), 1.5)
        components["profitFactorScore"] = self._bounded_score(metrics.get("profit_factor", 0), 2.0)
        components["winRateScore"] = self._bounded_score(metrics.get("win_rate", 0), 50.0)
        components["drawdownScore"] = self._inverse_score(metrics.get("max_drawdown", 100), 20.0)
        components["stabilityScore"] = self._bounded_score(metrics.get("stability", 0), 0.5)

        n_trades = metrics.get("total_trades", 0)
        penalty = 0
        if n_trades < 5:
            penalty = -12
        elif n_trades < 12:
            penalty = -5

        weighted = sum(components[f"{k}Score"] * v for k, v in self.weights.items())
        overall = max(0, min(100, weighted + penalty))

        letter_grade = (
            "A" if overall >= 80 else
            "B" if overall >= 65 else
            "C" if overall >= 50 else
            "D" if overall >= 35 else
            "E"
        )

        return {
            "overall": round(overall, 1),
            "letter": letter_grade,
            "components": {k: round(v, 1) for k, v in components.items()},
            "weights": self.weights,
            "penalty": penalty,
            "n_trades": n_trades,
        }
