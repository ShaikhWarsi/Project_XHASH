from __future__ import annotations

import itertools
import random
from typing import Any


class StrategyEvolutionService:
    @staticmethod
    def build_variants(
        parameter_space: dict[str, Any],
        method: str = "grid",
        max_variants: int = 50,
    ) -> list[dict[str, Any]]:
        if method == "grid":
            return StrategyEvolutionService._grid_search(parameter_space, max_variants)
        elif method == "random":
            return StrategyEvolutionService._random_search(parameter_space, max_variants)
        else:
            return []

    @staticmethod
    def _grid_search(space: dict[str, Any], max_variants: int) -> list[dict[str, Any]]:
        param_values = []
        param_names = []
        for key, spec in space.items():
            values = []
            if isinstance(spec, list):
                values = spec
            elif isinstance(spec, dict):
                if "values" in spec:
                    values = spec["values"]
                elif "min" in spec and "max" in spec:
                    step = spec.get("step", 1)
                    min_v = spec["min"]
                    max_v = spec["max"]
                    if isinstance(min_v, int) and isinstance(max_v, int) and isinstance(step, int):
                        values = list(range(min_v, max_v + 1, step))
                    else:
                        n = spec.get("count", 10)
                        values = [min_v + (max_v - min_v) * i / (n - 1) for i in range(n)]
            if not values:
                values = [spec]
            param_names.append(key)
            param_values.append(values)

        all_combos = list(itertools.product(*param_values))
        if len(all_combos) > max_variants:
            all_combos = random.sample(all_combos, max_variants)

        return [dict(zip(param_names, combo)) for combo in all_combos]

    @staticmethod
    def _random_search(space: dict[str, Any], max_variants: int) -> list[dict[str, Any]]:
        variants = []
        param_names = list(space.keys())
        for _ in range(max_variants):
            variant = {}
            for key, spec in space.items():
                if isinstance(spec, list):
                    variant[key] = random.choice(spec)
                elif isinstance(spec, dict):
                    if "values" in spec:
                        variant[key] = random.choice(spec["values"])
                    elif "min" in spec and "max" in spec:
                        variant[key] = random.uniform(spec["min"], spec["max"])
                else:
                    variant[key] = spec
            variants.append(variant)
        return variants
