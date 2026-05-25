from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

import pandas as pd

from core.enums import SignalDir
from llm.client import LLMClient

logger = logging.getLogger(__name__)


class DebateReflector:
    """Post-trade reflection system for the multi-agent debate.

    After a trade completes, Reflector analyzes:
    - What the debate concluded vs. what actually happened
    - Which analysts were right/wrong
    - Whether the debate process needs adjustment
    - Patterns in wins/losses over time

    Adapted from TradingAgents' reflection.py.

    Usage:
        reflector = DebateReflector(llm_client)
        insights = reflector.reflect(trade, debate_result, market_data)
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client
        self.reflection_history: list[dict[str, Any]] = []

    def reflect(
        self,
        trade: dict[str, Any],
        debate_result: dict[str, Any],
        market_data: Optional[pd.DataFrame] = None,
    ) -> dict[str, Any]:
        """Run reflection on a completed trade.

        Args:
            trade: Trade dict with entry_price, exit_price, entry_time, exit_time, pnl, etc.
            debate_result: Debate dict with analyst votes, scores, reasoning
            market_data: Optional price data around the trade period

        Returns:
            Reflection dict with findings, score, and recommendations
        """
        pnl = trade.get("pnl", 0.0)
        entry_price = trade.get("entry_price", 0.0)
        exit_price = trade.get("exit_price", 0.0)

        predicted_direction = debate_result.get("final_signal", "")
        actual_direction = "up" if pnl > 0 else "down"

        correct = False
        if predicted_direction == "buy" and actual_direction == "up":
            correct = True
        elif predicted_direction == "sell" and actual_direction == "down":
            correct = True

        analyst_accuracy = self._evaluate_analysts(debate_result, actual_direction)

        reasoning_quality = self._assess_reasoning_quality(
            debate_result, pnl, entry_price, exit_price
        )

        llm_insights = None
        if self.llm_client is not None:
            try:
                llm_insights = self._generate_llm_insights(
                    trade, debate_result, correct, analyst_accuracy
                )
            except Exception as e:
                logger.warning(f"LLM reflection failed: {e}")

        reflection = {
            "trade_id": trade.get("id", ""),
            "symbol": trade.get("symbol", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "pnl": pnl,
            "pnl_pct": trade.get("pnl_pct", 0.0),
            "predicted_direction": predicted_direction,
            "actual_direction": actual_direction,
            "correct": correct,
            "analyst_accuracy": analyst_accuracy,
            "reasoning_quality": reasoning_quality,
            "debate_rounds": len(debate_result.get("debate_rounds", [])),
            "llm_insights": llm_insights,
            "recommendations": self._generate_recommendations(
                correct, reasoning_quality, analyst_accuracy
            ),
        }

        self.reflection_history.append(reflection)
        return reflection

    def _evaluate_analysts(
        self,
        debate_result: dict[str, Any],
        actual_direction: str,
    ) -> dict[str, Any]:
        analyst_votes = debate_result.get("analyst_votes", [])
        correct_count = 0
        total_count = len(analyst_votes)

        if not analyst_votes:
            return {"correct_count": 0, "total_count": 0, "accuracy": 0.0}

        for vote in analyst_votes:
            if isinstance(vote, dict):
                vote_direction = vote.get("direction", "")
                if isinstance(vote_direction, str):
                    vote_dir = vote_direction.lower()
                    if (vote_dir in ("buy", "bull", "long") and actual_direction == "up") or \
                       (vote_dir in ("sell", "bear", "short") and actual_direction == "down"):
                        correct_count += 1

        return {
            "correct_count": correct_count,
            "total_count": total_count,
            "accuracy": correct_count / total_count if total_count > 0 else 0.0,
            "analyst_breakdown": analyst_votes,
        }

    def _assess_reasoning_quality(
        self,
        debate_result: dict[str, Any],
        pnl: float,
        entry_price: float,
        exit_price: float,
    ) -> dict[str, Any]:
        debate_rounds = debate_result.get("debate_rounds", [])
        round_count = len(debate_rounds)

        has_risk_analysis = "risk_debate" in debate_result
        has_price_targets = False
        has_time_horizon = False

        for round_data in debate_rounds:
            if isinstance(round_data, dict):
                content = json.dumps(round_data).lower()
                if any(term in content for term in ("target", "price target", "tp")):
                    has_price_targets = True
                if any(term in content for term in ("horizon", "day", "week", "month")):
                    has_time_horizon = True

        score = 0.0
        if round_count >= 2:
            score += 0.3
        if has_risk_analysis:
            score += 0.3
        if has_price_targets:
            score += 0.2
        if has_time_horizon:
            score += 0.2

        return {
            "score": min(score, 1.0),
            "debate_rounds": round_count,
            "has_risk_analysis": has_risk_analysis,
            "has_price_targets": has_price_targets,
            "has_time_horizon": has_time_horizon,
        }

    def _generate_llm_insights(
        self,
        trade: dict[str, Any],
        debate_result: dict[str, Any],
        correct: bool,
        analyst_accuracy: dict[str, Any],
    ) -> Optional[str]:
        if self.llm_client is None:
            return None

        prompt = f"""
        Reflect on this trading debate outcome:
        Trade: {trade.get('symbol', '')} | PnL: {trade.get('pnl', 0):.2f} | {'CORRECT' if correct else 'INCORRECT'}
        Analyst accuracy: {analyst_accuracy.get('accuracy', 0):.1%}
        Debate rounds: {len(debate_result.get('debate_rounds', []))}

        Key reasoning from debate:
        {json.dumps(debate_result.get('debate_rounds', [])[:3], indent=2)[:1000]}

        What can we learn from this trade? Suggest 1-2 specific improvements
        for the debate process.
        """
        try:
            import asyncio
            result = asyncio.run(
                self.llm_client.generate(prompt, temperature=0.3, max_tokens=500)
            )
            return result[:1000]
        except Exception as e:
            logger.warning(f"LLM insight generation failed: {e}")
            return None

    def _generate_recommendations(
        self,
        correct: bool,
        reasoning_quality: dict[str, Any],
        analyst_accuracy: dict[str, Any],
    ) -> list[str]:
        recommendations = []

        if not correct and reasoning_quality.get("score", 0) < 0.5:
            recommendations.append(
                "Increase debate depth: require at least 3 rounds with price targets"
            )

        if analyst_accuracy.get("accuracy", 1) < 0.4:
            recommendations.append(
                "Review analyst prompts: accuracy below 40% suggests poor signal quality"
            )

        if not reasoning_quality.get("has_risk_analysis", False):
            recommendations.append(
                "Add risk analysis step before final signal generation"
            )

        if not reasoning_quality.get("has_price_targets", False):
            recommendations.append(
                "Include price targets in debate to improve analytical rigor"
            )

        return recommendations

    def summary_report(self) -> dict[str, Any]:
        """Generate a summary report from all reflections."""
        if not self.reflection_history:
            return {"total_trades": 0, "accuracy": 0.0, "recommendations": []}

        total = len(self.reflection_history)
        correct = sum(1 for r in self.reflection_history if r.get("correct"))
        total_pnl = sum(r.get("pnl", 0.0) for r in self.reflection_history)

        all_recommendations = []
        for r in self.reflection_history:
            all_recommendations.extend(r.get("recommendations", []))

        from collections import Counter
        top_recommendations = [
            rec for rec, _ in Counter(all_recommendations).most_common(5)
        ]

        return {
            "total_trades": total,
            "correct_trades": correct,
            "accuracy": correct / total if total > 0 else 0.0,
            "total_pnl": total_pnl,
            "avg_pnl_per_trade": total_pnl / total if total > 0 else 0.0,
            "top_recommendations": top_recommendations,
        }
