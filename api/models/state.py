from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from core.types import AnalystSignal, PortfolioState


@dataclass
class AgentContext:
    """Shared state for multi-agent deliberation flows.

    Mirrors the structure of ai-hedge-fund's AgentState TypedDict
    without requiring LangGraph as a dependency.
    """
    tickers: List[str]
    start_date: str
    end_date: str
    initial_cash: float = 100000.0
    portfolio: Optional[PortfolioState] = None
    analyst_signals: Dict[str, Dict[str, AnalystSignal]] = field(default_factory=dict)
    current_prices: Dict[str, float] = field(default_factory=dict)
    decisions: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    messages: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def add_analyst_signal(self, agent_id: str, ticker: str, signal: AnalystSignal):
        if agent_id not in self.analyst_signals:
            self.analyst_signals[agent_id] = {}
        self.analyst_signals[agent_id][ticker] = signal

    def get_consensus(self, ticker: str) -> Dict[str, Any]:
        opinions: List[AnalystSignal] = []
        for agent_results in self.analyst_signals.values():
            sig = agent_results.get(ticker)
            if sig is not None:
                opinions.append(sig)
        if not opinions:
            return {"signal": "neutral", "confidence": 0.0, "count": 0}

        bullish = sum(1 for o in opinions if o.signal == "bullish")
        bearish = sum(1 for o in opinions if o.signal == "bearish")
        total = len(opinions)
        net = (bullish - bearish) / total
        avg_conf = sum(o.confidence for o in opinions) / total

        threshold = self.metadata.get("consensus_threshold", 0.15)
        if net > threshold:
            signal = "bullish"
        elif net < -threshold:
            signal = "bearish"
        else:
            signal = "neutral"

        return {
            "signal": signal,
            "confidence": round(abs(net) * avg_conf, 4),
            "bullish": bullish,
            "bearish": bearish,
            "total": total,
            "net_score": round(net, 4),
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tickers": self.tickers,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "analyst_signals": {
                aid: {t: s.to_dict() if hasattr(s, "to_dict") else str(s) for t, s in sigs.items()}
                for aid, sigs in self.analyst_signals.items()
            },
            "current_prices": self.current_prices,
            "decisions": self.decisions,
            "consensus": {t: self.get_consensus(t) for t in self.tickers},
        }
