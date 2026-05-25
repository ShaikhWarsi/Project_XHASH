from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ResearchPlan:
    recommendation: str
    rationale: str
    strategic_actions: list[str] = field(default_factory=list)
    confidence: float = 0.5


@dataclass
class TraderProposal:
    action: str
    reasoning: str
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    position_sizing: Optional[float] = None


@dataclass
class PortfolioDecision:
    rating: str
    executive_summary: str
    investment_thesis: str = ""
    price_target: Optional[float] = None
    time_horizon: Optional[str] = None


RATING_ORDER = {"sell": 0, "underweight": 1, "hold": 2, "overweight": 3, "buy": 4}


def parse_rating(text: str) -> str:
    text = text.strip().lower()
    for keyword in ["sell", "underweight", "hold", "overweight", "buy"]:
        if keyword in text:
            return keyword
    return "hold"
