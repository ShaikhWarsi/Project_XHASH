from __future__ import annotations

from typing import Optional

from agents.llm.schemas import ResearchPlan, parse_rating
from llm.client import LLMClient


class ResearchManager:
    def __init__(self, llm: Optional[LLMClient] = None):
        self.llm = llm or LLMClient.deep()
        self.agent_id = "research_manager"

    def evaluate(self, ticker: str, analyst_reports: dict, bull_case: str, bear_case: str) -> ResearchPlan:
        prompt = f"""You are a Research Manager evaluating the bull vs bear debate for {ticker}.

Analyst Reports:
{_format_reports(analyst_reports)}

Bull Case:
{bull_case}

Bear Case:
{bear_case}

Based on the evidence presented, produce a research plan with:
1. A clear recommendation (buy/overweight/hold/underweight/sell)
2. Rationale explaining your decision
3. 2-4 strategic actions
4. Confidence level (0-1)"""
        result = self.llm.generate_structured(prompt, temperature=0.3)
        return ResearchPlan(
            recommendation=parse_rating(result.get("recommendation", "hold")),
            rationale=result.get("rationale", ""),
            strategic_actions=result.get("strategic_actions", []),
            confidence=float(result.get("confidence", 0.5)),
        )


def _format_reports(reports: dict) -> str:
    lines = []
    for agent_id, report in reports.items():
        if isinstance(report, dict):
            text = report.get("reasoning", str(report))[:2000]
        else:
            text = str(report)[:2000]
        lines.append(f"[{agent_id}]:\n{text}\n")
    return "\n".join(lines)
