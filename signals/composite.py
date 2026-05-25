from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import numpy as np

from core.enums import SignalDir
from core.types import QuantSignal, SignalMatrix


@dataclass
class SignalWeight:
    engine: str
    weight: float = 1.0
    min_confidence: float = 0.0


class SignalAggregator:
    """Merges signals from multiple engines into a unified SignalMatrix."""

    def __init__(self):
        self._weights: dict[str, SignalWeight] = {}

    def register(self, engine_name: str, weight: float = 1.0, min_confidence: float = 0.0):
        self._weights[engine_name] = SignalWeight(engine=engine_name, weight=weight, min_confidence=min_confidence)

    def aggregate(
        self,
        results: dict[str, list[QuantSignal]],
        symbols: list[str],
        regime: Optional = None,
    ) -> SignalMatrix:
        timestamp = datetime.utcnow()
        matrix = SignalMatrix(timestamp=timestamp, signals={s: [] for s in symbols}, regime=regime)

        for engine_name, signals in results.items():
            w = self._weights.get(engine_name, SignalWeight(engine=engine_name))
            for sig in signals:
                if sig.confidence < w.min_confidence:
                    continue
                sig.metadata["_engine"] = engine_name
                matrix.signals.setdefault(sig.symbol, []).append(sig)

        matrix.composite_scores = self._compute_scores(matrix.signals)
        return matrix

    def _compute_scores(self, grouped: dict[str, list[QuantSignal]]) -> dict[str, float]:
        scores = {}
        for symbol, signals in grouped.items():
            if not signals:
                scores[symbol] = 0.0
                continue
            weighted_sum = 0.0
            total_weight = 0.0
            for sig in signals:
                engine_name = sig.metadata.get("_engine", "")
                sw = self._weights.get(engine_name, SignalWeight(engine=engine_name))
                w = sw.weight
                direction = sig.direction.value if sig.direction in (SignalDir.BULLISH, SignalDir.BEARISH) else 0
                weighted_sum += direction * sig.strength * sig.confidence * w
                total_weight += w
            scores[symbol] = float(np.tanh(weighted_sum / max(total_weight, 0.01)))
        return scores
