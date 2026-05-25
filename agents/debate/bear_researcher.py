from __future__ import annotations

from typing import Optional

from llm.client import LLMClient


class BearResearcher:
    def __init__(self, llm: Optional[LLMClient] = None):
        self.llm = llm or LLMClient.quick()
        self.agent_id = "bear_researcher"

    def argue(self, ticker: str, analyst_reports: dict, bull_args: str = "", rounds: int = 1) -> str:
        prompt = f"""You are a BEAR researcher arguing AGAINST taking a position in {ticker}.

Analyst Reports:
{_format_reports(analyst_reports)}

Previous bull arguments to refute:
{bull_args or "None yet"}

Build a compelling bear case using data from the analyst reports. Emphasize:
- Risk factors, valuation concerns, and negative signals
- Competitive threats and market headwinds
- Why bull optimism is misplaced

Be specific with data points from the reports.
The bear case must be convincing but intellectually honest."""
        return self.llm.generate(prompt, temperature=0.7)


def _format_reports(reports: dict) -> str:
    lines = []
    for agent_id, report in reports.items():
        if isinstance(report, dict):
            text = report.get("reasoning", str(report))[:2000]
        else:
            text = str(report)[:2000]
        lines.append(f"[{agent_id}]:\n{text}\n")
    return "\n".join(lines)
