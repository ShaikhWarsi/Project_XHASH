from __future__ import annotations

import math
import random
from typing import Any

import numpy as np


class DifferentialEvolutionOptimizer:
    def __init__(self, parameter_space: dict[str, Any], max_evals: int = 100):
        self.param_names = list(parameter_space.keys())
        self.param_bounds: list[tuple[float, float]] = []
        self.param_values: list[list] = []
        self.is_discrete = []
        for key, spec in parameter_space.items():
            if isinstance(spec, list):
                self.param_values.append(spec)
                self.is_discrete.append(True)
                self.param_bounds.append((0.0, float(len(spec) - 1)))
            elif isinstance(spec, dict) and "min" in spec and "max" in spec:
                self.param_bounds.append((float(spec["min"]), float(spec["max"])))
                self.is_discrete.append(False)
                self.param_values.append([])
            else:
                self.param_bounds.append((0.0, 1.0))
                self.is_discrete.append(False)
                self.param_values.append([])

        self.n_dim = len(self.param_names)
        self.pop_size = max(4, min(12, max_evals // 3))
        self.F = 0.6
        self.CR = 0.7
        self.max_evals = max_evals
        self.population: list[np.ndarray] = []
        self.fitness: list[float] = []
        self.n_eval = 0

    def initialize(self) -> list[dict[str, Any]]:
        self.population = []
        for _ in range(self.pop_size):
            vec = np.array([random.uniform(l, u) for l, u in self.param_bounds])
            self.population.append(vec)
        return [self._decode(v) for v in self.population]

    def ask(self) -> dict[str, Any] | None:
        if self.n_eval >= self.max_evals:
            return None
        if len(self.population) < self.pop_size:
            vec = np.array([random.uniform(l, u) for l, u in self.param_bounds])
            self.population.append(vec)
            return self._decode(vec)

        a, b, c = random.sample(range(self.pop_size), 3)
        mutant = self.population[a] + self.F * (self.population[b] - self.population[c])
        mutant = np.clip(mutant, [l for l, u in self.param_bounds], [u for l, u in self.param_bounds])

        trial = np.where(np.random.random(self.n_dim) < self.CR, mutant, self.population[np.argmin(self.fitness) if self.fitness else 0])

        self._current_trial = trial
        return self._decode(trial)

    def tell(self, fitness: float) -> None:
        self.n_eval += 1
        if hasattr(self, "_current_trial"):
            self.population.append(self._current_trial)
            self.fitness.append(fitness)
            if len(self.population) > self.pop_size:
                idx = np.argmax(self.fitness)
                self.population.pop(idx)
                self.fitness.pop(idx)

    def best(self) -> dict[str, Any]:
        if not self.fitness:
            return self._decode(self.population[0]) if self.population else {}
        best_idx = np.argmin(self.fitness)
        return self._decode(self.population[best_idx])

    def _decode(self, vec: np.ndarray) -> dict[str, Any]:
        result = {}
        for i, name in enumerate(self.param_names):
            if self.is_discrete[i]:
                idx = int(round(vec[i]))
                idx = max(0, min(len(self.param_values[i]) - 1, idx))
                result[name] = self.param_values[i][idx]
            else:
                result[name] = round(float(vec[i]), 4)
        return result


class TPEOptimizer:
    def __init__(self, parameter_space: dict[str, Any], max_evals: int = 100):
        self.param_names = list(parameter_space.keys())
        self.param_specs = parameter_space
        self.max_evals = max_evals
        self.history: list[tuple[dict[str, Any], float]] = []
        self.n_eval = 0

    def initialize(self) -> list[dict[str, Any]]:
        trials = []
        for _ in range(min(8, self.max_evals)):
            trial = self._sample_random()
            trials.append(trial)
        return trials

    def ask(self) -> dict[str, Any] | None:
        if self.n_eval >= self.max_evals:
            return None
        if self.n_eval < 8:
            return self._sample_random()

        sorted_hist = sorted(self.history, key=lambda x: x[1])
        n_good = max(2, len(sorted_hist) // 4)
        good = [h[0] for h in sorted_hist[:n_good]]
        bad = [h[0] for h in sorted_hist[n_good:]]

        trial = {}
        for name in self.param_names:
            good_vals = [g.get(name, 0) for g in good]
            if good_vals:
                sigma = 0.25 * (1 - self.n_eval / self.max_evals)
                val = random.choice(good_vals) + random.gauss(0, sigma) * abs(random.choice(good_vals) if good_vals else 1)
                trial[name] = self._clamp(name, val)
            else:
                trial[name] = self._sample_param(name)
        return trial

    def tell(self, params: dict[str, Any], fitness: float) -> None:
        self.n_eval += 1
        self.history.append((dict(params), fitness))

    def best(self) -> dict[str, Any]:
        if not self.history:
            return {name: self._sample_param(name) for name in self.param_names}
        return min(self.history, key=lambda x: x[1])[0]

    def _sample_random(self) -> dict[str, Any]:
        return {name: self._sample_param(name) for name in self.param_names}

    def _sample_param(self, name: str) -> Any:
        spec = self.param_specs[name]
        if isinstance(spec, list):
            return random.choice(spec)
        if isinstance(spec, dict):
            if "values" in spec:
                return random.choice(spec["values"])
            if "min" in spec and "max" in spec:
                return round(random.uniform(spec["min"], spec["max"]), 4)
        return spec

    def _clamp(self, name: str, val: float) -> Any:
        spec = self.param_specs[name]
        if isinstance(spec, list):
            idx = int(round(val))
            return spec[max(0, min(len(spec) - 1, idx))]
        if isinstance(spec, dict):
            if "values" in spec:
                idx = int(round(val))
                return spec["values"][max(0, min(len(spec["values"]) - 1, idx))]
            if "min" in spec and "max" in spec:
                return max(spec["min"], min(spec["max"], round(val, 4)))
        return val


def make_optimizer(method: str, parameter_space: dict[str, Any], max_evals: int = 100):
    if method == "de":
        return DifferentialEvolutionOptimizer(parameter_space, max_evals)
    if method == "tpe":
        return TPEOptimizer(parameter_space, max_evals)
    return None
