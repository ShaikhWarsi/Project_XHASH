from __future__ import annotations

from typing import Optional

from llm.client import LLMClient


class AggressiveDebator:
    def __init__(self, llm: Optional[LLMClient] = None):
        self.llm = llm or LLMClient.quick()
        self.agent_id = "aggressive_debator"

    def argue(self, ticker: str, research_plan: dict, trader_proposal: dict, conservative_args: str = "", neutral_args: str = "") -> str:
        prompt = f"""You are an AGGRESSIVE risk debator for {ticker}. You champion high-reward strategies.

Research Plan: {research_plan.get('rationale', '')[:1000]}
Trader Proposal: {trader_proposal.get('reasoning', '')[:1000]}

Conservative counter-arguments: {conservative_args or 'None yet'}
Neutral counter-arguments: {neutral_args or 'None yet'}

Argue for a more aggressive position sizing and risk tolerance.
Use data and reasoning to support your case. Address and refute conservative concerns."""
        return self.llm.generate(prompt, temperature=0.7)
