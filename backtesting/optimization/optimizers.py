from __future__ import annotations

import itertools
import random
from typing import Any, Callable, Dict, List, Optional


def make_optimizer(method: str = "grid", **kwargs) -> Callable:
    if method == "grid":
        return GridOptimizer(**kwargs)
    elif method == "random":
        return RandomOptimizer(**kwargs)
    else:
        return GridOptimizer(**kwargs)


class GridOptimizer:
    def __init__(self, **kwargs):
        self._params = kwargs

    def generate(self, search_space: Dict[str, List[Any]], n: int = 10) -> List[Dict[str, Any]]:
        keys = list(search_space.keys())
        values = list(search_space.values())
        combos = list(itertools.product(*values))
        random.shuffle(combos)
        return [dict(zip(keys, combo)) for combo in combos[:n]]


class RandomOptimizer:
    def __init__(self, **kwargs):
        self._params = kwargs

    def generate(self, search_space: Dict[str, tuple], n: int = 10) -> List[Dict[str, Any]]:
        candidates = []
        for _ in range(n):
            candidate = {}
            for name, (low, high, step) in search_space.items():
                if step >= 1:
                    n_steps = int((high - low) / step) + 1
                    idx = random.randrange(n_steps)
                    candidate[name] = low + idx * step
                else:
                    candidate[name] = round(random.uniform(low, high), 2)
            candidates.append(candidate)
        return candidates
