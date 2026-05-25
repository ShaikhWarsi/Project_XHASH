from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

from core.enums import SignalType

logger = logging.getLogger(__name__)


class AICalibration:
    """Self-tuning AI thresholds via offline calibration.

    Analyzes historical signal accuracy to adjust:
    - Confidence thresholds for signal generation
    - Analyst weightings in multi-agent debate
    - Risk level mappings based on market regime
    - Position sizing multipliers

    Adapted from QuantDinger's ai_calibration service.

    Usage:
        calibration = AICalibration()
        calibration.add_trade_outcome(signal, actual_pnl, features)
        thresholds = calibration.get_optimal_thresholds()
    """

    def __init__(self, history_path: Optional[str] = None):
        self.history_path = history_path or "data/calibration_history.json"
        self._history: list[dict[str, Any]] = []
        self._load_history()

    def _load_history(self):
        path = Path(self.history_path)
        if path.exists():
            try:
                with open(path) as f:
                    self._history = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load calibration history: {e}")
                self._history = []

    def _save_history(self):
        path = Path(self.history_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(path, "w") as f:
                json.dump(self._history[-1000:], f, indent=2, default=str)
        except Exception as e:
            logger.warning(f"Failed to save calibration history: {e}")

    def add_trade_outcome(
        self,
        signal: SignalType | str,
        predicted_confidence: float,
        actual_pnl_pct: float,
        features: Optional[dict[str, float]] = None,
    ):
        """Record a trade outcome for calibration analysis.

        Args:
            signal: The signal that was generated (BUY/SELL/HOLD)
            predicted_confidence: The confidence score at signal time (0-1)
            actual_pnl_pct: The actual PnL percentage from the trade
            features: Optional feature dict (regime, volatility, etc.)
        """
        if isinstance(signal, SignalType):
            signal = signal.name

        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "signal": signal,
            "confidence": predicted_confidence,
            "pnl_pct": actual_pnl_pct,
            "correct": (actual_pnl_pct > 0 and signal == "BUY") or (actual_pnl_pct < 0 and signal == "SELL"),
            "features": features or {},
        }
        self._history.append(record)
        self._save_history()

    def get_optimal_thresholds(self, min_samples: int = 20) -> dict[str, float]:
        """Calculate optimal confidence thresholds from historical performance.

        Finds the confidence threshold that maximizes the Sharpe-like ratio
        of the signal strategy.
        """
        if len(self._history) < min_samples:
            return self._default_thresholds()

        df = pd.DataFrame(self._history)

        best_threshold = 0.5
        best_score = -float("inf")

        for threshold in np.arange(0.1, 0.95, 0.05):
            filtered = df[df["confidence"] >= threshold]
            if len(filtered) < 5:
                continue
            accuracy = filtered["correct"].mean()
            avg_pnl = filtered["pnl_pct"].mean()
            score = accuracy * avg_pnl if avg_pnl > 0 else accuracy * abs(avg_pnl) * -1

            if score > best_score:
                best_score = score
                best_threshold = threshold

        avg_confidence = df["confidence"].mean()
        overall_accuracy = df["correct"].mean()

        return {
            "optimal_confidence_threshold": round(best_threshold, 3),
            "overall_accuracy": round(overall_accuracy, 3),
            "avg_confidence": round(avg_confidence, 3),
            "total_samples": len(df),
            "correct_trades": int(df["correct"].sum()),
            "score": round(best_score, 4),
        }

    def _default_thresholds(self) -> dict[str, float]:
        return {
            "optimal_confidence_threshold": 0.6,
            "overall_accuracy": 0.0,
            "avg_confidence": 0.0,
            "total_samples": 0,
            "correct_trades": 0,
            "score": 0.0,
        }

    def get_analyst_weights(self) -> dict[str, float]:
        """Calculate performance-based analyst weights from history.

        Returns a dict mapping analyst names to weight multipliers
        based on their historical accuracy.
        """
        if not self._history or not self._history[0].get("features"):
            return {}

        weights = {}
        for record in self._history:
            features = record.get("features", {})
            for key, value in features.items():
                if key.startswith("analyst_"):
                    analyst = key.replace("analyst_", "")
                    if analyst not in weights:
                        weights[analyst] = {"correct": 0, "total": 0}
                    weights[analyst]["total"] += 1
                    if record.get("correct"):
                        weights[analyst]["correct"] += 1

        result = {}
        for analyst, stats in weights.items():
            if stats["total"] > 0:
                accuracy = stats["correct"] / stats["total"]
                result[analyst] = round(accuracy, 3)
        return result

    def calibrate(self, force: bool = False) -> dict[str, Any]:
        """Run full calibration cycle.

        Returns calibration results with updated thresholds and weights.
        """
        thresholds = self.get_optimal_thresholds()
        weights = self.get_analyst_weights()

        result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "thresholds": thresholds,
            "analyst_weights": weights,
            "calibrated": len(self._history) >= 20,
        }

        logger.info(
            f"Calibration complete: threshold={thresholds.get('optimal_confidence_threshold')}, "
            f"accuracy={thresholds.get('overall_accuracy'):.1%}, "
            f"analysts={len(weights)}"
        )
        return result
