from __future__ import annotations

import json
import logging
from typing import Any, Optional

import pandas as pd

from core.enums import SignalDir

logger = logging.getLogger(__name__)


class DebateSignalProcessor:
    """Extracts trading signals from multi-agent debate output.

    Processes structured debate results into unified SignalType values
    compatible with the trading-engine risk and execution pipeline.

    Adapted from TradingAgents' signal_processing.py.
    """

    @staticmethod
    def process(
        debate_result: dict[str, Any],
        confidence_threshold: float = 0.6,
    ) -> tuple[SignalDir, float, str]:
        """Process debate result into a trading signal.

        Args:
            debate_result: Structured dict from DebateOrchestrator containing
                analyst votes, reasoning, and confidence levels
            confidence_threshold: Minimum consensus confidence required

        Returns:
            (signal_dir, confidence, reasoning) tuple
        """
        signal_dir = SignalDir.NEUTRAL
        avg_confidence = 0.0
        reasoning = ""

        bull_score = debate_result.get("bull_score", 0.0)
        bear_score = debate_result.get("bear_score", 0.0)
        neutral_score = debate_result.get("neutral_score", 1.0)

        total = bull_score + bear_score + neutral_score
        if total > 0:
            bull_weight = bull_score / total
            bear_weight = bear_score / total

            if bull_weight > bear_weight and bull_weight >= confidence_threshold:
                signal_dir = SignalDir.BULLISH
                avg_confidence = bull_weight
                reasoning = f"Bull case outweighs bear ({bull_weight:.1%} vs {bear_weight:.1%})"
            elif bear_weight > bull_weight and bear_weight >= confidence_threshold:
                signal_dir = SignalDir.BEARISH
                avg_confidence = bear_weight
                reasoning = f"Bear case outweighs bull ({bear_weight:.1%} vs {bull_weight:.1%})"
            else:
                signal_dir = SignalDir.NEUTRAL
                avg_confidence = max(bull_weight, bear_weight)
                reasoning = f"Insufficient conviction (bull: {bull_weight:.1%}, bear: {bear_weight:.1%})"

        analyst_votes = debate_result.get("analyst_votes", [])
        if analyst_votes:
            reasoning += f" | Analysts: {len(analyst_votes)} participants"

        debate_rounds = debate_result.get("debate_rounds", [])
        if debate_rounds:
            final_round = debate_rounds[-1]
            if isinstance(final_round, dict):
                reasoning += f" | Final round: {final_round.get('summary', '')[:200]}"

        risk_debate = debate_result.get("risk_debate", {})
        if risk_debate:
            risk_level = risk_debate.get("risk_level", "moderate")
            position_size_mult = risk_debate.get("position_size_multiplier", 1.0)
            reasoning += f" | Risk: {risk_level} (mult: {position_size_mult:.2f})"

        return signal_dir, avg_confidence, reasoning

    @staticmethod
    def to_signal_dict(
        debate_result: dict[str, Any],
        symbol: str = "",
        confidence_threshold: float = 0.6,
    ) -> dict[str, Any]:
        """Convert debate result to a serializable signal dict."""
        signal_dir, confidence, reasoning = DebateSignalProcessor.process(
            debate_result, confidence_threshold
        )

        return {
            "symbol": symbol,
            "direction": signal_dir.name,
            "signal_value": signal_dir.value,
            "confidence": round(confidence, 4),
            "reasoning": reasoning,
            "bull_score": debate_result.get("bull_score", 0.0),
            "bear_score": debate_result.get("bear_score", 0.0),
            "neutral_score": debate_result.get("neutral_score", 0.0),
            "risk_level": debate_result.get("risk_debate", {}).get("risk_level", "moderate"),
            "position_size_multiplier": debate_result.get("risk_debate", {}).get("position_size_multiplier", 1.0),
            "analyst_count": len(debate_result.get("analyst_votes", [])),
            "debate_rounds": len(debate_result.get("debate_rounds", [])),
        }

    @staticmethod
    def weighted_consensus(
        debate_result: dict[str, Any],
        weight_key: str = "confidence",
    ) -> float:
        """Calculate weighted consensus score from analyst votes.

        Returns a score in [-1, 1] where:
            +1 = all analysts strongly bullish
            -1 = all analysts strongly bearish
             0 = split/no consensus
        """
        analyst_votes = debate_result.get("analyst_votes", [])
        if not analyst_votes:
            return 0.0

        total_weight = 0.0
        weighted_signal = 0.0

        for vote in analyst_votes:
            weight = vote.get(weight_key, 1.0) if isinstance(vote, dict) else 1.0
            direction = vote.get("direction", 0) if isinstance(vote, dict) else 0

            if isinstance(direction, str):
                direction = 1.0 if direction.lower() in ("buy", "bull", "long") else -1.0
            elif isinstance(direction, (int, float)):
                direction = float(direction)

            weighted_signal += weight * direction
            total_weight += weight

        if total_weight == 0:
            return 0.0
        return weighted_signal / total_weight
