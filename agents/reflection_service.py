from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

from core.enums import SignalType
from llm.client import LLMClient

logger = logging.getLogger(__name__)


class ReflectionService:
    """Strategy decision reflection system.

    Validates past trading decisions by comparing predicted vs actual outcomes.
    Supports both quantitative analysis and LLM-based qualitative review.

    Adapted from QuantDinger's reflection service.

    Usage:
        reflection = ReflectionService()
        reflection.record_decision(decision, outcome)
        report = reflection.generate_report()
        insights = reflection.reflect_on_period(start, end)
    """

    def __init__(self, history_path: Optional[str] = None, llm_client: Optional[LLMClient] = None):
        self.history_path = history_path or "data/reflection_history.json"
        self.llm_client = llm_client
        self._decisions: list[dict[str, Any]] = []
        self._load_history()

    def _load_history(self):
        path = Path(self.history_path)
        if path.exists():
            try:
                with open(path) as f:
                    self._decisions = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load reflection history: {e}")
                self._decisions = []

    def _save_history(self):
        path = Path(self.history_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(path, "w") as f:
                json.dump(self._decisions[-2000:], f, indent=2, default=str)
        except Exception as e:
            logger.warning(f"Failed to save reflection history: {e}")

    def record_decision(
        self,
        decision: dict[str, Any],
        outcome: Optional[dict[str, Any]] = None,
    ):
        """Record a trading decision with optional outcome.

        Args:
            decision: Dict with signal, confidence, reasoning, timestamp
            outcome: Optional dict with pnl, exit_price, exit_reason, etc.
        """
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "decision": decision,
            "outcome": outcome,
        }
        self._decisions.append(record)
        self._save_history()

    def reflect_on_period(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> dict[str, Any]:
        """Run quantitative reflection on decisions in a time period."""
        if not self._decisions:
            return {"total_decisions": 0, "message": "No decisions to reflect on"}

        df = pd.DataFrame(self._decisions)

        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            if start:
                df = df[df["timestamp"] >= pd.Timestamp(start)]
            if end:
                df = df[df["timestamp"] <= pd.Timestamp(end)]

        if df.empty:
            return {"total_decisions": 0, "message": "No decisions in period"}

        total = len(df)
        decisions_with_outcomes = df[df["outcome"].notna()]

        if decisions_with_outcomes.empty:
            return {
                "total_decisions": total,
                "decisions_with_outcomes": 0,
                "message": "No decisions have outcomes yet",
            }

        outcomes_df = pd.json_normalize(decisions_with_outcomes["outcome"])
        pnls = pd.to_numeric(outcomes_df.get("pnl_pct", pd.Series([0.0] * len(outcomes_df))), errors="coerce")

        positive_trades = (pnls > 0).sum()
        negative_trades = (pnls < 0).sum()
        total_pnl = pnls.sum()
        avg_pnl = pnls.mean()
        win_rate = positive_trades / len(pnls) if len(pnls) > 0 else 0.0

        return {
            "total_decisions": total,
            "decisions_with_outcomes": len(decisions_with_outcomes),
            "positive_trades": int(positive_trades),
            "negative_trades": int(negative_trades),
            "win_rate": round(win_rate, 3),
            "total_pnl_pct": round(total_pnl, 4),
            "avg_pnl_pct": round(avg_pnl, 4),
            "max_win_pct": round(pnls.max(), 4) if len(pnls) > 0 else 0.0,
            "max_loss_pct": round(pnls.min(), 4) if len(pnls) > 0 else 0.0,
            "std_pnl": round(pnls.std(), 4) if len(pnls) > 1 else 0.0,
            "sharpe_approx": round(pnls.mean() / pnls.std() * np.sqrt(252), 2) if len(pnls) > 1 and pnls.std() > 0 else 0.0,
        }

    def generate_report(self) -> dict[str, Any]:
        """Generate a comprehensive reflection report."""
        stats = self.reflect_on_period()

        if stats.get("total_decisions", 0) == 0:
            return {"status": "no_data", "message": "No decisions recorded yet"}

        if stats.get("decisions_with_outcomes", 0) < 5:
            return {**stats, "status": "insufficient_data", "message": "Fewer than 5 completed trades"}

        win_rate = stats.get("win_rate", 0)
        sharpe = stats.get("sharpe_approx", 0)

        if win_rate >= 0.6 and sharpe >= 1.0:
            assessment = "strong"
            recommendation = "Current strategy is performing well. Consider increasing position sizes."
        elif win_rate >= 0.5 and sharpe >= 0.5:
            assessment = "acceptable"
            recommendation = "Strategy is marginally profitable. Review stop-loss placement."
        elif win_rate >= 0.4:
            assessment = "needs_improvement"
            recommendation = "Strategy needs refinement. Consider adjusting entry conditions."
        else:
            assessment = "poor"
            recommendation = "Strategy underperforming. Pause trading and re-evaluate signal logic."

        report = {
            **stats,
            "status": "ready",
            "assessment": assessment,
            "recommendation": recommendation,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        if self.llm_client is not None and stats.get("decisions_with_outcomes", 0) >= 10:
            try:
                llm_insights = self._llm_reflection(stats)
                if llm_insights:
                    report["llm_insights"] = llm_insights
            except Exception as e:
                logger.warning(f"LLM reflection failed: {e}")

        return report

    def _llm_reflection(self, stats: dict[str, Any]) -> Optional[str]:
        if self.llm_client is None:
            return None

        prompt = f"""
        Analyze this trading performance summary and provide 2-3 actionable improvement suggestions:

        Win Rate: {stats.get('win_rate', 0):.1%}
        Total PnL: {stats.get('total_pnl_pct', 0):.2%}
        Avg PnL per trade: {stats.get('avg_pnl_pct', 0):.4%}
        Sharpe (approx): {stats.get('sharpe_approx', 0):.2f}
        Max Win: {stats.get('max_win_pct', 0):.2%}
        Max Loss: {stats.get('max_loss_pct', 0):.2%}

        What patterns do you see? What should the strategy do differently?
        Be specific and actionable.
        """
        try:
            import asyncio
            result = asyncio.run(
                self.llm_client.generate(prompt, temperature=0.3, max_tokens=600)
            )
            return result[:1000]
        except Exception as e:
            logger.warning(f"LLM reflection call failed: {e}")
            return None

    def get_worst_trades(self, n: int = 5) -> list[dict]:
        """Return the worst performing trades for analysis."""
        if not self._decisions:
            return []

        results = []
        for d in self._decisions:
            outcome = d.get("outcome")
            if outcome and "pnl_pct" in outcome:
                results.append({
                    "timestamp": d.get("timestamp"),
                    "decision": d.get("decision"),
                    "pnl_pct": outcome["pnl_pct"],
                })

        sorted_results = sorted(results, key=lambda x: x.get("pnl_pct", 0))
        return sorted_results[:n]

    def get_best_trades(self, n: int = 5) -> list[dict]:
        """Return the best performing trades for analysis."""
        if not self._decisions:
            return []

        results = []
        for d in self._decisions:
            outcome = d.get("outcome")
            if outcome and "pnl_pct" in outcome:
                results.append({
                    "timestamp": d.get("timestamp"),
                    "decision": d.get("decision"),
                    "pnl_pct": outcome["pnl_pct"],
                })

        sorted_results = sorted(results, key=lambda x: x.get("pnl_pct", 0), reverse=True)
        return sorted_results[:n]
